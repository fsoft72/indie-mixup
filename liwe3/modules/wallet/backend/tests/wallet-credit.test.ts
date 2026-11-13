import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiWEApp, type LiWECtx } from '@backend/liwe3';
import { wallet_credit } from '../src/methods/wallet-credit';

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

describe('wallet_credit', () => {
	let ctx : LiWECtx;

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		ctx = createMockCtx();
	} );

	it('credits the wallet on the first attempt when there is no concurrent modification', async () => {
		mockGet.mockResolvedValue( { ...WALLET } );
		mockReturning.mockResolvedValue( [ { id: WALLET.id } ] );
		mockValues.mockResolvedValue( undefined );

		const result = await wallet_credit( ctx, { id_wallet: WALLET.id, amount: 300, description: 'test credit' } );

		expect( result.ok ).toBe( true );
		expect( result.data?.balance ).toBe( 1300 );
		expect( mockGet ).toHaveBeenCalledTimes( 1 );
		expect( mockReturning ).toHaveBeenCalledTimes( 1 );
		expect( mockValues ).toHaveBeenCalledTimes( 1 );
	});

	it('retries after a concurrent balance change and succeeds on the second attempt', async () => {
		mockGet.mockResolvedValue( { ...WALLET } );
		mockReturning
			.mockResolvedValueOnce( [] )
			.mockResolvedValueOnce( [ { id: WALLET.id } ] );
		mockValues.mockResolvedValue( undefined );

		const result = await wallet_credit( ctx, { id_wallet: WALLET.id, amount: 300, description: 'test credit' } );

		expect( result.ok ).toBe( true );
		expect( result.data?.balance ).toBe( 1300 );
		expect( mockGet ).toHaveBeenCalledTimes( 2 );
		expect( mockReturning ).toHaveBeenCalledTimes( 2 );
		expect( mockValues ).toHaveBeenCalledTimes( 1 );
	});

	it('gives up after exhausting retries and never writes a transaction record', async () => {
		mockGet.mockResolvedValue( { ...WALLET } );
		mockReturning.mockResolvedValue( [] );

		const result = await wallet_credit( ctx, { id_wallet: WALLET.id, amount: 300, description: 'test credit' } );

		expect( result.ok ).toBe( false );
		expect( result.error?.code ).toBe( 'CONCURRENT_UPDATE' );
		expect( result.status ).toBe( 409 );
		expect( mockReturning ).toHaveBeenCalledTimes( 5 );
		expect( mockValues ).not.toHaveBeenCalled();
	});

	it('rejects a credit to an inactive wallet, without attempting an update', async () => {
		mockGet.mockResolvedValue( { ...WALLET, is_active: false } );

		const result = await wallet_credit( ctx, { id_wallet: WALLET.id, amount: 300, description: 'test credit' } );

		expect( result.ok ).toBe( false );
		expect( result.error?.code ).toBe( 'WALLET_INACTIVE' );
		expect( mockReturning ).not.toHaveBeenCalled();
		expect( mockValues ).not.toHaveBeenCalled();
	});
});
