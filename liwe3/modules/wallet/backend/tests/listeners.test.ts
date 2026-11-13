import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type LiWECtx, liwe_event_call } from '@backend/liwe3';
import { listeners_init } from '../src/listeners';

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();
const mockOrderedWhere = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockUpdateWhere = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockRun = vi.fn();

const resetDbMocks = () => {
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { where: mockWhere } );
	mockWhere.mockReturnValue( { get: mockGet } );
	mockUpdate.mockReturnValue( { set: mockSet } );
	mockSet.mockReturnValue( { where: mockUpdateWhere } );
	mockUpdateWhere.mockReturnValue( { run: mockRun } );
	mockInsert.mockReturnValue( { values: mockValues } );
	mockValues.mockReturnValue( { run: mockRun } );
	mockRun.mockResolvedValue( undefined );
};

const makeCtx = () : LiWECtx => ( {
	app: { db: { select: mockSelect, update: mockUpdate, insert: mockInsert } } as any,
	c: null,
	sessionId: null,
	session: async () => null,
	user: async () => null,
} );

describe('wallet listeners (wallet.call.*)', () => {
	beforeAll( () => {
		listeners_init();
	} );

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
	} );

	it('balance.get creates a points wallet lazily and returns balance 0', async () => {
		mockGet.mockResolvedValueOnce( undefined ); // no existing wallet
		mockGet.mockResolvedValueOnce( { id: 'wall_new', balance: 0, currency_code: 'POINTS', id_user: 'user_1' } ); // re-select after insert

		const res = await liwe_event_call( makeCtx(), 'wallet', 'balance.get', { id_user: 'user_1', domain: '_' } );

		expect( res.ok ).toBe( true );
		expect( res.data ).toEqual( { balance: 0 } );
		expect( mockInsert ).toHaveBeenCalled();
	});

	it('credit increases an existing wallet balance and records a transaction', async () => {
		mockGet.mockResolvedValueOnce( { id: 'wall_1', balance: 500, currency_code: 'POINTS', id_user: 'user_1' } );

		const res = await liwe_event_call( makeCtx(), 'wallet', 'credit', {
			id_user: 'user_1',
			amount: 200,
			domain: '_',
			description: 'test credit',
		} );

		expect( res.ok ).toBe( true );
		expect( res.data ).toEqual( { id_wallet: 'wall_1', balance: 700, currency_code: 'POINTS' } );
		expect( mockUpdate ).toHaveBeenCalled();
		expect( mockInsert ).toHaveBeenCalled();
	});

	it('debit rejects when the wallet balance is insufficient', async () => {
		mockGet.mockResolvedValueOnce( { id: 'wall_1', balance: 50, currency_code: 'POINTS', id_user: 'user_1' } );

		const res = await liwe_event_call( makeCtx(), 'wallet', 'debit', {
			id_user: 'user_1',
			amount: 200,
			domain: '_',
			description: 'test debit',
		} );

		expect( res.ok ).toBe( false );
		expect( res.error?.code ).toBe( 'INSUFFICIENT_BALANCE' );
		expect( mockUpdate ).not.toHaveBeenCalled();
	});

	it('debit succeeds and decreases the wallet balance when funds are sufficient', async () => {
		mockGet.mockResolvedValueOnce( { id: 'wall_1', balance: 500, currency_code: 'POINTS', id_user: 'user_1' } );

		const res = await liwe_event_call( makeCtx(), 'wallet', 'debit', {
			id_user: 'user_1',
			amount: 200,
			domain: '_',
			description: 'test debit',
		} );

		expect( res.ok ).toBe( true );
		expect( res.data ).toEqual( { id_wallet: 'wall_1', balance: 300, currency_code: 'POINTS' } );
	});

	it('users.above_balance maps matching wallets to { id_user, balance, iban }', async () => {
		mockWhere.mockReturnValueOnce( Promise.resolve( [
			{ id: 'wall_1', id_user: 'user_1', balance: 500, currency_code: 'POINTS' },
			{ id: 'wall_2', id_user: 'user_2', balance: 900, currency_code: 'POINTS' },
		] ) );

		const res = await liwe_event_call( makeCtx(), 'wallet', 'users.above_balance', { min_balance: 100, domain: '_' } );

		expect( res.ok ).toBe( true );
		expect( res.data ).toEqual( {
			users: [
				{ id_user: 'user_1', balance: 500, iban: '' },
				{ id_user: 'user_2', balance: 900, iban: '' },
			],
		} );
	});

	it('balance.get rejects a call missing id_user', async () => {
		const res = await liwe_event_call( makeCtx(), 'wallet', 'balance.get', { domain: '_' } );

		expect( res.ok ).toBe( false );
		expect( res.error?.code ).toBe( 'MISSING_PARAM' );
	});
});
