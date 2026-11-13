import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiWEApp, type LiWECtx } from '@backend/liwe3';
import { wallet_debit } from '../src/methods/wallet-debit';

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockReturning = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();

const resetDbMocks = () => {
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { where: mockWhere } );
	mockWhere.mockReturnValue( { get: mockGet, returning: mockReturning } );
	mockUpdate.mockReturnValue( { set: mockSet } );
	mockSet.mockReturnValue( { where: mockWhere } );
	mockInsert.mockReturnValue( { values: mockValues } );
};

const WALLET : { id : string; balance : number; is_active : boolean; currency_code : string; id_user : string } = {
	id: 'wallet_1',
	balance: 1000,
	is_active: true,
	currency_code: 'POINTS',
	id_user: 'user_1',
};

const createMockApp = () : LiWEApp => {
	const mockApp = new LiWEApp( 'test' );
	Object.defineProperty( mockApp, 'db', {
		get: () => ( { select: mockSelect, update: mockUpdate, insert: mockInsert } ),
	} );
	return mockApp;
};

const createMockCtx = (
	currentUser : any = { id: 'user_1', domain: 'acme', perms: [ 'wallet.transact' ] },
	app : LiWEApp = createMockApp(),
) : LiWECtx => ( {
	app,
	c: null,
	sessionId: currentUser ? 'sess_1' : null,
	session: async () => null,
	user: async () => currentUser,
} );

describe('wallet_debit', () => {
	let ctx : LiWECtx;

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		ctx = createMockCtx();
	} );

	it('debits the wallet on the first attempt when there is no concurrent modification', async () => {
		mockGet.mockResolvedValue( { ...WALLET } );
		mockReturning.mockResolvedValue( [ { id: WALLET.id } ] );
		mockValues.mockResolvedValue( undefined );

		const result = await wallet_debit( ctx, { id_wallet: WALLET.id, amount: 300, description: 'test debit' } );

		expect( result.ok ).toBe( true );
		expect( result.data?.balance ).toBe( 700 );
		expect( mockGet ).toHaveBeenCalledTimes( 1 );
		expect( mockReturning ).toHaveBeenCalledTimes( 1 );
		expect( mockValues ).toHaveBeenCalledTimes( 1 );
	});

	it('retries after a concurrent balance change and succeeds on the second attempt', async () => {
		mockGet.mockResolvedValue( { ...WALLET } );
		// First CAS attempt loses the race (another writer updated the balance first), second succeeds
		mockReturning
			.mockResolvedValueOnce( [] )
			.mockResolvedValueOnce( [ { id: WALLET.id } ] );
		mockValues.mockResolvedValue( undefined );

		const result = await wallet_debit( ctx, { id_wallet: WALLET.id, amount: 300, description: 'test debit' } );

		expect( result.ok ).toBe( true );
		expect( result.data?.balance ).toBe( 700 );
		// Initial read + one re-read after the failed CAS attempt
		expect( mockGet ).toHaveBeenCalledTimes( 2 );
		expect( mockReturning ).toHaveBeenCalledTimes( 2 );
		expect( mockValues ).toHaveBeenCalledTimes( 1 );
	});

	it('gives up after exhausting retries and never writes a transaction record', async () => {
		mockGet.mockResolvedValue( { ...WALLET } );
		// Every CAS attempt loses the race
		mockReturning.mockResolvedValue( [] );

		const result = await wallet_debit( ctx, { id_wallet: WALLET.id, amount: 300, description: 'test debit' } );

		expect( result.ok ).toBe( false );
		expect( result.error?.code ).toBe( 'CONCURRENT_UPDATE' );
		expect( result.status ).toBe( 409 );
		expect( mockReturning ).toHaveBeenCalledTimes( 5 );
		expect( mockValues ).not.toHaveBeenCalled();
	});

	it('rejects when the balance is insufficient, without attempting an update', async () => {
		mockGet.mockResolvedValue( { ...WALLET, balance: 100 } );

		const result = await wallet_debit( ctx, { id_wallet: WALLET.id, amount: 300, description: 'test debit' } );

		expect( result.ok ).toBe( false );
		expect( result.error?.code ).toBe( 'INSUFFICIENT_BALANCE' );
		expect( mockReturning ).not.toHaveBeenCalled();
		expect( mockValues ).not.toHaveBeenCalled();
	});
});
