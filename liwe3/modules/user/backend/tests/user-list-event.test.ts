import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { listeners_init } from '../src/listeners';
import { USER_CALL_USER_LIST } from '../src/events';
import { LiWEApp, type LiWECtx, liwe_event_call, liwe_event_emit } from '@backend/liwe3';

// Mock database operations
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockAll = vi.fn();

const resetDbMocks = () => {
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { where: mockWhere } );
	mockWhere.mockReturnValue( { all: mockAll } );
};

const createMockApp = () : LiWEApp => {
	const mockApp = new LiWEApp( 'test' );
	Object.defineProperty( mockApp, 'db', { get: () => ( { select: mockSelect } ) } );
	Object.defineProperty( mockApp, 'cfg', { get: () => ( { system: {} } ) } );
	return mockApp;
};

// Extracts the bound values (e.g. the domain) from a drizzle condition, skipping column/table objects
const boundValues = ( cond : any ) : unknown[] => ( cond.queryChunks ?? [] ).filter( ( c : any ) => c?.constructor?.name === 'Param' ).map( ( c : any ) => c.value );

const createMockCtx = ( domain? : string ) : LiWECtx => ( {
	app: createMockApp(),
	c: null,
	sessionId: null,
	session: async () => null,
	user: async () => ( domain ? { domain } : null ) as any,
} );

describe('user.call.user.list listener', () => {
	// Handlers register into a module-level singleton: register once, not per test.
	beforeAll( () => {
		listeners_init( createMockApp() );
	} );

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
	} );

	it('returns only id, username, name, lastname, email, perms and enabled', async () => {
		mockAll.mockResolvedValueOnce( [
			{ id: 'user.1', username: 'mario', name: 'Mario', lastname: 'Rossi', email: 'mario@example.com', perms: [ 'user.list' ], enabled: true },
		] );

		const res = await liwe_event_call<any[]>( createMockCtx( 'acme' ), 'user', 'user.list' );

		expect( res.ok ).toBe( true );
		expect( res.data ).toEqual( [
			{ id: 'user.1', username: 'mario', name: 'Mario', lastname: 'Rossi', email: 'mario@example.com', perms: [ 'user.list' ], enabled: true },
		] );
		// the query only selects the reduced column set, never password or 2FA data
		expect( Object.keys( mockSelect.mock.calls[0][0] ).sort() ).toEqual( [ 'email', 'enabled', 'id', 'lastname', 'name', 'perms', 'username' ] );
	});

	it('normalizes null perms to an empty array', async () => {
		mockAll.mockResolvedValueOnce( [ { username: 'noperms', name: null, lastname: null, email: 'n@example.com', perms: null } ] );

		const res = await liwe_event_call<any[]>( createMockCtx( 'acme' ), 'user', 'user.list' );

		expect( res.data![0].perms ).toEqual( [] );
	});

	it('returns an empty list when the domain has no users', async () => {
		mockAll.mockResolvedValueOnce( [] );

		const res = await liwe_event_call<any[]>( createMockCtx( 'acme' ), 'user', 'user.list' );

		expect( res.ok ).toBe( true );
		expect( res.data ).toEqual( [] );
	});

	it('filters by the domain of the payload when provided', async () => {
		mockAll.mockResolvedValueOnce( [] );

		await liwe_event_emit( createMockCtx( 'acme' ), USER_CALL_USER_LIST, { domain: 'other' } );

		expect( mockWhere ).toHaveBeenCalledTimes( 1 );
		expect( boundValues( mockWhere.mock.calls[0][0] ) ).toEqual( [ 'other' ] );
	});

	it('falls back to the system domain when there is no caller and no payload domain', async () => {
		mockAll.mockResolvedValueOnce( [] );

		await liwe_event_emit( createMockCtx(), USER_CALL_USER_LIST, {} );

		expect( boundValues( mockWhere.mock.calls[0][0] ) ).toEqual( [ '_' ] );
	});
});
