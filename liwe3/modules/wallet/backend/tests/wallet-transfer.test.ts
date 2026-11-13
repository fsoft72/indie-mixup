import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiWEApp, type LiWECtx } from '@backend/liwe3';
import { wallet_transfer } from '../src/methods/wallet-transfer';

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockReturning = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockInsertSelect = vi.fn();
const mockBatch = vi.fn();

const resetDbMocks = () => {
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { where: mockWhere } );
	mockWhere.mockReturnValue( { get: mockGet, returning: mockReturning } );
	mockUpdate.mockReturnValue( { set: mockSet } );
	mockSet.mockReturnValue( { where: mockWhere } );
	mockInsert.mockReturnValue( { values: mockValues, select: mockInsertSelect } );
};

const WALLET_FROM = { id: 'wallet_from', name: 'Source', balance: 1000, is_active: true, currency_code: 'POINTS', id_user: 'user_1' };
const WALLET_TO = { id: 'wallet_to', name: 'Destination', balance: 200, is_active: true, currency_code: 'POINTS', id_user: 'user_2' };

const createMockApp = () : LiWEApp => {
	const mockApp = new LiWEApp( 'test' );
	Object.defineProperty( mockApp, 'db', {
		get: () => ( { select: mockSelect, update: mockUpdate, insert: mockInsert, batch: mockBatch } ),
	} );
	return mockApp;
};

const createMockCtx = (
	currentUser : any = { id: 'user_1', domain: 'acme', perms: [ 'wallet.transfer' ] },
	app : LiWEApp = createMockApp(),
) : LiWECtx => ( {
	app,
	c: null,
	sessionId: currentUser ? 'sess_1' : null,
	session: async () => null,
	user: async () => currentUser,
} );

describe('wallet_transfer', () => {
	let ctx : LiWECtx;

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		ctx = createMockCtx();
	} );

	it('transfers funds on the first attempt when there is no concurrent modification', async () => {
		mockGet
			.mockResolvedValueOnce( { ...WALLET_FROM } )
			.mockResolvedValueOnce( { ...WALLET_TO } );
		// Single atomic batch: [ updateFrom, updateTo, insertDebit, insertCredit ]
		mockBatch.mockResolvedValueOnce( [ [ { id: WALLET_FROM.id } ], [ { id: WALLET_TO.id } ], undefined, undefined ] );

		const result = await wallet_transfer( ctx, { id_wallet_from: WALLET_FROM.id, id_wallet_to: WALLET_TO.id, amount: 300, description: 'test transfer' } );

		expect( result.ok ).toBe( true );
		expect( result.data?.debit_transaction.balance_after ).toBe( 700 );
		expect( result.data?.credit_transaction.balance_after ).toBe( 500 );
		expect( mockGet ).toHaveBeenCalledTimes( 2 );
		expect( mockBatch ).toHaveBeenCalledTimes( 1 );
	});

	it('retries after a concurrent balance change on either wallet and succeeds on the second attempt', async () => {
		mockGet.mockResolvedValue( { ...WALLET_FROM } ); // overwritten per-call below via mockImplementation
		let getCall = 0;
		mockGet.mockImplementation( () => {
			getCall++;
			// Calls 1-2: initial read. Calls 3-4: retry re-read.
			return Promise.resolve( getCall % 2 === 1 ? { ...WALLET_FROM } : { ...WALLET_TO } );
		} );

		mockBatch
			.mockResolvedValueOnce( [ [], [], undefined, undefined ] ) // first CAS attempt loses the race: every guarded statement no-ops
			.mockResolvedValueOnce( [ [ { id: WALLET_FROM.id } ], [ { id: WALLET_TO.id } ], undefined, undefined ] ); // second attempt succeeds

		const result = await wallet_transfer( ctx, { id_wallet_from: WALLET_FROM.id, id_wallet_to: WALLET_TO.id, amount: 300, description: 'test transfer' } );

		expect( result.ok ).toBe( true );
		expect( result.data?.debit_transaction.balance_after ).toBe( 700 );
		expect( result.data?.credit_transaction.balance_after ).toBe( 500 );
		// Initial read (2 calls) + one retry re-read (2 calls)
		expect( mockGet ).toHaveBeenCalledTimes( 4 );
		expect( mockBatch ).toHaveBeenCalledTimes( 2 );
	});

	it('gives up after exhausting retries without ever committing balances or audit rows', async () => {
		mockGet
			.mockImplementation( () => Promise.resolve( { ...WALLET_FROM } ) );
		let call = 0;
		mockGet.mockImplementation( () => {
			call++;
			return Promise.resolve( call % 2 === 1 ? { ...WALLET_FROM } : { ...WALLET_TO } );
		} );
		mockBatch.mockResolvedValue( [ [], [], undefined, undefined ] ); // every CAS attempt loses the race: guarded updates and inserts all no-op

		const result = await wallet_transfer( ctx, { id_wallet_from: WALLET_FROM.id, id_wallet_to: WALLET_TO.id, amount: 300, description: 'test transfer' } );

		expect( result.ok ).toBe( false );
		expect( result.error?.code ).toBe( 'CONCURRENT_UPDATE' );
		expect( result.status ).toBe( 409 );
		// 5 attempts, one atomic batch each; guarded so nothing is ever committed
		expect( mockBatch ).toHaveBeenCalledTimes( 5 );
	});

	it('rejects when source balance is insufficient, without touching the database further', async () => {
		mockGet
			.mockResolvedValueOnce( { ...WALLET_FROM, balance: 100 } )
			.mockResolvedValueOnce( { ...WALLET_TO } );

		const result = await wallet_transfer( ctx, { id_wallet_from: WALLET_FROM.id, id_wallet_to: WALLET_TO.id, amount: 300, description: 'test transfer' } );

		expect( result.ok ).toBe( false );
		expect( result.error?.code ).toBe( 'INSUFFICIENT_BALANCE' );
		expect( mockBatch ).not.toHaveBeenCalled();
	});
});
