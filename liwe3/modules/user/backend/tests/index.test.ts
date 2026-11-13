import { beforeEach, describe, expect, it, vi } from 'vitest';
import { user_add, user_delete, user_list, user_perms_set } from '../src/methods';
import { module_init } from '../src/index';
import { users } from '../src/schema';
import { LiWEApp, type LiWECtx, liwe_event_emit, liwe_event_register } from '@backend/liwe3';

vi.mock( '@backend/liwe3', async () => {
	const actual = await vi.importActual( '@backend/liwe3' );
	return {
		...actual,
		mkid: vi.fn(),
		has_perms: vi.fn(),
		sessionListIds: vi.fn(),
		sessionUpdateMetadata: vi.fn(),
	};
} );

import { has_perms, mkid, routeBody, routeGet, sessionListIds, sessionUpdateMetadata } from '@backend/liwe3';
import { USER_PERM_DELETE, USER_PERM_LIST, USER_PERM_PERMS } from '../src/perms';

/** Minimal fake Hono context for exercising a gated route handler. */
const fakeC = ( ctx : any, body : any = {} ) => ( {
	get: ( k : string ) => ( k === 'ctx' ? ctx : undefined ),
	req: { query: () => body, json: async () => body },
	json: ( b : any, s? : number ) => ( { body: b, status: s ?? b?.status ?? 200 } ),
} );

// Mock database operations
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockRun = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockAll = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();

const resetDbMocks = () => {
	mockInsert.mockReturnValue( { values: mockValues } );
	mockValues.mockReturnValue( { run: mockRun } );
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { all: mockAll, where: mockWhere } );
	mockWhere.mockReturnValue( { run: mockRun, get: mockGet, all: mockAll } );
	mockDelete.mockReturnValue( { where: mockWhere } );
	mockUpdate.mockReturnValue( { set: mockSet } );
	mockSet.mockReturnValue( { where: mockWhere } );
};

// Mock app instance: real LiWEApp with db/cfg/hono stubbed out
const createMockApp = () : LiWEApp => {
	const mockApp = new LiWEApp( 'test' );
	Object.defineProperty( mockApp, 'db', {
		get: () => ( { insert: mockInsert, select: mockSelect, update: mockUpdate, delete: mockDelete } ),
	} );
	// avoids a crash in user_create_default_users, called by module_init
	Object.defineProperty( mockApp, 'cfg', { get: () => ( { system: {} } ) } );
	mockApp.hono.get = vi.fn();
	mockApp.hono.post = vi.fn();
	mockApp.hono.delete = vi.fn();
	mockApp.hono.patch = vi.fn();
	return mockApp;
};

// Wraps a mock app into the LiWECtx shape every method now expects
const createMockCtx = ( currentUser : any = null, app : LiWEApp = createMockApp() ) : LiWECtx => ( {
	app,
	c: null,
	sessionId: currentUser ? 'sess_1' : null,
	session: async () => null,
	user: async () => currentUser,
} );

// Builds a fake Hono Context carrying a real ctx, for exercising routeGet/routeBody wiring
const createMockHonoContext = ( ctx : LiWECtx, opts : { query? : any; body? : any } = {} ) => ( {
	get: ( key : string ) => ( key === 'ctx' ? ctx : undefined ),
	req: {
		query: () => opts.query ?? {},
		json: async () => opts.body ?? {},
	},
	json: vi.fn( ( data : any, status? : number ) => ( { __response: true, data, status } ) ),
} );

describe('user_add function', () => {
	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		vi.mocked( mkid ).mockReturnValue( 'user_generated_id' );
	} );

	it('creates a user, hashes the password, and returns it without the password', async () => {
		mockGet
			.mockResolvedValueOnce( undefined ) // duplicate username/email check
			.mockResolvedValueOnce( {
				id: 'user_123',
				username: 'testuser',
				email: 'test@example.com',
				domain: 'acme',
				password: 'irrelevant-hash',
				email_verified: true,
			} );
		mockRun.mockResolvedValue( undefined );

		const ctx = createMockCtx();
		const result = await user_add( ctx, {
			id: 'user_123',
			username: 'testuser',
			email: 'test@example.com',
			email_verified: true,
		} );

		expect( mockInsert ).toHaveBeenCalledWith( users );
		expect( mockValues ).toHaveBeenCalledWith( expect.objectContaining( {
			id: 'user_123',
			username: 'testuser',
			email: 'test@example.com',
		} ) );
		expect( result.ok ).toBe( true );
		expect( ( result.data as any ).password ).toBeNull();
	});

	it('generates an id when none is provided', async () => {
		mockGet
			.mockResolvedValueOnce( undefined )
			.mockResolvedValueOnce( { id: 'user_generated_id', username: 'testuser', email: 'test@example.com', email_verified: true } );
		mockRun.mockResolvedValue( undefined );

		const ctx = createMockCtx();
		const result = await user_add( ctx, { username: 'testuser', email: 'test@example.com', email_verified: true } );

		expect( mkid ).toHaveBeenCalledWith( 'user' );
		expect( mockValues ).toHaveBeenCalledWith( expect.objectContaining( { id: 'user_generated_id' } ) );
		expect( result.ok ).toBe( true );
	});

	it('preserves a caller-provided id', async () => {
		mockGet
			.mockResolvedValueOnce( undefined )
			.mockResolvedValueOnce( { id: 'custom_user_id', username: 'testuser', email: 'test@example.com', email_verified: true } );
		mockRun.mockResolvedValue( undefined );

		const ctx = createMockCtx();
		await user_add( ctx, { id: 'custom_user_id', username: 'testuser', email: 'test@example.com', email_verified: true } );

		expect( mkid ).not.toHaveBeenCalled();
		expect( mockValues ).toHaveBeenCalledWith( expect.objectContaining( { id: 'custom_user_id' } ) );
	});

	it('rejects a duplicate username/email in the same domain', async () => {
		mockGet.mockResolvedValueOnce( { id: 'existing_user' } ); // duplicate check finds a match

		const ctx = createMockCtx();
		const result = await user_add( ctx, { username: 'testuser', email: 'test@example.com' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 400 );
		expect( mockInsert ).not.toHaveBeenCalled();
	});

	it('propagates a database error', async () => {
		mockGet.mockResolvedValueOnce( undefined );
		mockRun.mockRejectedValue( new Error( 'Database error' ) );

		const ctx = createMockCtx();
		await expect( user_add( ctx, { username: 'testuser', email: 'test@example.com' } ) ).rejects.toThrow( 'Database error' );
	});

	it('emits user.create with { id_user, domain }', async () => {
		mockGet
			.mockResolvedValueOnce( undefined )
			.mockResolvedValueOnce( { id: 'user_123', username: 'testuser', email: 'test@example.com', domain: 'acme', email_verified: true } );
		mockRun.mockResolvedValue( undefined );

		const received : any[] = [];
		liwe_event_register( 'user.create', async ( _ctx, data ) => {
			received.push( data );
			return { ok: true, status: 200, data: true };
		} );

		const ctx = createMockCtx();
		await user_add( ctx, { id: 'user_123', username: 'testuser', email: 'test@example.com', email_verified: true } );

		expect( received ).toEqual( [ { id_user: 'user_123', domain: 'acme' } ] );
	});
});

describe('user_list function', () => {
	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		vi.mocked( has_perms ).mockResolvedValue( true );
		// mockWhere/mockAll are chained through offset/limit in user_list, which this
		// mock doesn't model; user_list calls .all() directly on the query builder
		// returned by select().from() when neither offset nor limit filters apply.
		mockFrom.mockReturnValue( { all: mockAll, where: mockWhere } );
	} );

	it('lists users, applying the domain filter for a non-system-admin caller', async () => {
		const mockUsers = [ { id: 'user_1', domain: 'acme' }, { id: 'user_2', domain: 'acme' } ];
		mockWhere.mockReturnValue( { all: mockAll } );
		mockAll.mockResolvedValue( mockUsers );

		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.list' ] } );
		const result = await user_list( ctx, {} );

		expect( mockFrom ).toHaveBeenCalledWith( users );
		expect( mockWhere ).toHaveBeenCalled();
		expect( result.ok ).toBe( true );
		expect( result.data ).toEqual( mockUsers );
	});

	it('skips the domain filter for a system.admin user in the system domain', async () => {
		mockAll.mockResolvedValue( [] );

		const ctx = createMockCtx( { id: 'root', domain: 'system', perms: [ 'system.admin' ] } );
		const result = await user_list( ctx, {} );

		expect( mockWhere ).not.toHaveBeenCalled();
		expect( result.ok ).toBe( true );
	});

	it('requires authentication', async () => {
		const ctx = createMockCtx( null );
		const result = await user_list( ctx, {} );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 401 );
	});

	it('the route is gated on user.list', async () => {
		vi.mocked( has_perms ).mockResolvedValue( false );

		const ctx = createMockCtx( { id: 'user_1', domain: 'acme', perms: [] } );
		const res = await routeGet( user_list, { perms: [ USER_PERM_LIST ] } )( fakeC( ctx ) as any );

		expect( res.status ).toBe( 403 );
	});

	it('propagates a database error', async () => {
		mockWhere.mockReturnValue( { all: mockAll } );
		mockAll.mockRejectedValue( new Error( 'Database error' ) );

		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.list' ] } );
		await expect( user_list( ctx, {} ) ).rejects.toThrow( 'Database error' );
	});
});

describe('user_delete function', () => {
	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		vi.mocked( has_perms ).mockResolvedValue( true );
	} );

	it('deletes a user by id', async () => {
		mockGet
			.mockResolvedValueOnce( { id: 'user_123', domain: 'acme' } ) // multi-tenant guard: target row, same domain
			.mockResolvedValueOnce( undefined ); // no row left after the delete

		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.delete' ] } );
		const result = await user_delete( ctx, { id: 'user_123' } );

		expect( mockDelete ).toHaveBeenCalledWith( users );
		expect( mockWhere ).toHaveBeenCalled();
		expect( result.ok ).toBe( true );
		expect( result.data ).toBe( true );
	});

	it('emits user.delete with { id_user }', async () => {
		mockGet
			.mockResolvedValueOnce( { id: 'user_123', domain: 'acme' } ) // multi-tenant guard: target row, same domain
			.mockResolvedValueOnce( undefined ); // no row left after the delete

		const received : any[] = [];
		liwe_event_register( 'user.delete', async ( _ctx, data ) => {
			received.push( data );
			return { ok: true, status: 200, data: true };
		} );

		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.delete' ] } );
		await user_delete( ctx, { id: 'user_123' } );

		expect( received ).toEqual( [ { id_user: 'user_123' } ] );
	});

	it('requires authentication', async () => {
		const ctx = createMockCtx( null );
		const result = await user_delete( ctx, { id: 'user_123' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 401 );
		expect( mockDelete ).not.toHaveBeenCalled();
	});

	it('the route is gated on user.delete', async () => {
		vi.mocked( has_perms ).mockResolvedValue( false );

		const ctx = createMockCtx( { id: 'user_1', domain: 'acme', perms: [] } );
		const res = await routeBody( user_delete, { perms: [ USER_PERM_DELETE ] } )( fakeC( ctx, { id: 'user_123' } ) as any );

		expect( res.status ).toBe( 403 );
		expect( mockDelete ).not.toHaveBeenCalled();
	});

	it('returns an error when the row still exists after deletion', async () => {
		mockGet
			.mockResolvedValueOnce( { id: 'user_123', domain: 'acme' } ) // multi-tenant guard: target row, same domain
			.mockResolvedValueOnce( { id: 'user_123', domain: 'acme' } ); // deletion did not remove the row

		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.delete' ] } );
		const result = await user_delete( ctx, { id: 'user_123' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 500 );
	});

	it('handles a database error gracefully', async () => {
		mockGet.mockResolvedValueOnce( { id: 'user_123', domain: 'acme' } ); // multi-tenant guard: target row, same domain
		mockWhere
			.mockReturnValueOnce( { run: mockRun, get: mockGet, all: mockAll } ) // the select().where() pre-load
			.mockReturnValueOnce( { run: mockRun } ); // the delete().where() call
		mockRun.mockRejectedValueOnce( new Error( 'Database error' ) );

		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.delete' ] } );
		const result = await user_delete( ctx, { id: 'user_123' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 500 );
	});
});

describe('user_perms_set function', () => {
	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		vi.mocked( has_perms ).mockResolvedValue( true );
	} );

	it('overwrites permissions for an existing user', async () => {
		const existingUser = { id: 'user_123', username: 'testuser', perms: [ 'user.list' ], password: 'x', domain: 'acme' };
		const updatedUser = { ...existingUser, perms: [ 'user.view' ] };

		mockGet.mockResolvedValueOnce( existingUser ).mockResolvedValueOnce( updatedUser );
		mockRun.mockResolvedValueOnce( undefined );

		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.perms' ] } );
		const result = await user_perms_set( ctx, { id_user: 'user_123', perms: [ 'user.view' ] } );

		expect( mockUpdate ).toHaveBeenCalledWith( users );
		expect( mockSet ).toHaveBeenCalledWith( { perms: [ 'user.view' ] } );
		expect( result.ok ).toBe( true );
		expect( ( result.data as any ).password ).toBeNull();
	});

	it('refreshes the new perms into every active session of the target user', async () => {
		const existingUser = { id: 'user_123', username: 'testuser', perms: [ 'user.list' ], password: 'x', domain: 'acme' };
		const updatedUser = { ...existingUser, perms: [ 'user.view', 'upload.send_file' ] };

		mockGet.mockResolvedValueOnce( existingUser ).mockResolvedValueOnce( updatedUser );
		mockRun.mockResolvedValueOnce( undefined );
		vi.mocked( sessionListIds ).mockResolvedValueOnce( [ 'sess_a', 'sess_b' ] );
		vi.mocked( sessionUpdateMetadata ).mockResolvedValue( true );

		// give the mock app a working KV so the propagation path runs
		const app = createMockApp();
		Object.defineProperty( app, 'kv', { get: () => ( {} ) } );
		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.perms' ] }, app );

		const result = await user_perms_set( ctx, { id_user: 'user_123', perms: [ 'user.view', 'upload.send_file' ] } );

		expect( result.ok ).toBe( true );
		expect( sessionListIds ).toHaveBeenCalledWith( expect.anything(), 'user_123' );
		expect( sessionUpdateMetadata ).toHaveBeenCalledTimes( 2 );
		expect( sessionUpdateMetadata ).toHaveBeenCalledWith( expect.anything(), 'test', 'sess_a', { perms: [ 'user.view', 'upload.send_file' ] } );
		expect( sessionUpdateMetadata ).toHaveBeenCalledWith( expect.anything(), 'test', 'sess_b', { perms: [ 'user.view', 'upload.send_file' ] } );
	});

	it('still succeeds when the session refresh throws (best-effort)', async () => {
		const existingUser = { id: 'user_123', username: 'testuser', perms: [ 'user.list' ], password: 'x', domain: 'acme' };
		const updatedUser = { ...existingUser, perms: [ 'user.view' ] };

		mockGet.mockResolvedValueOnce( existingUser ).mockResolvedValueOnce( updatedUser );
		mockRun.mockResolvedValueOnce( undefined );
		vi.mocked( sessionListIds ).mockRejectedValueOnce( new Error( 'KV down' ) );

		const app = createMockApp();
		Object.defineProperty( app, 'kv', { get: () => ( {} ) } );
		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.perms' ] }, app );

		const result = await user_perms_set( ctx, { id_user: 'user_123', perms: [ 'user.view' ] } );

		expect( result.ok ).toBe( true );
	});

	it('returns 404 when the user does not exist', async () => {
		mockGet.mockResolvedValueOnce( undefined );

		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.perms' ] } );
		const result = await user_perms_set( ctx, { id_user: 'missing', perms: [] } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 404 );
		expect( mockUpdate ).not.toHaveBeenCalled();
	});

	it('requires authentication', async () => {
		const ctx = createMockCtx( null );
		const result = await user_perms_set( ctx, { id_user: 'user_123', perms: [] } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 401 );
	});

	it('the route is gated on user.perms', async () => {
		vi.mocked( has_perms ).mockResolvedValue( false );

		const ctx = createMockCtx( { id: 'user_1', domain: 'acme', perms: [] } );
		const res = await routeBody( user_perms_set, { perms: [ USER_PERM_PERMS ] } )( fakeC( ctx, { id_user: 'user_123', perms: [] } ) as any );

		expect( res.status ).toBe( 403 );
		expect( mockUpdate ).not.toHaveBeenCalled();
	});

	it('returns a validation error for a missing id_user', async () => {
		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.perms' ] } );
		const result = await user_perms_set( ctx, { perms: [ 'user.view' ] } as any );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 400 );
		expect( mockSelect ).not.toHaveBeenCalled();
	});

	it('handles a database error during the user lookup', async () => {
		mockGet.mockRejectedValueOnce( new Error( 'Database connection failed' ) );

		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.perms' ] } );
		const result = await user_perms_set( ctx, { id_user: 'user_123', perms: [] } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 500 );
	});
});

describe('module_init function', () => {
	let mockApp : LiWEApp;

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		mockApp = createMockApp();
		mockGet.mockResolvedValue( undefined ); // user_create_default_users' own lookup, during module_init
	} );

	it('registers the user routes', async () => {
		await module_init( mockApp );

		expect( mockApp.hono.get ).toHaveBeenCalledWith( '/api/user/list', expect.any( Function ) );
		expect( mockApp.hono.post ).toHaveBeenCalledWith( '/api/user/add', expect.any( Function ) );
		expect( mockApp.hono.delete ).toHaveBeenCalledWith( '/api/user/delete', expect.any( Function ) );
		expect( mockApp.hono.post ).toHaveBeenCalledWith( '/api/user/perms/set', expect.any( Function ) );
	});

	it('wires /api/user/list through routeGet down to user_list', async () => {
		await module_init( mockApp );

		const getHandlerCall = vi.mocked( mockApp.hono.get ).mock.calls.find( ( call ) => call[0] === '/api/user/list' );
		expect( getHandlerCall ).toBeDefined();

		const handler = getHandlerCall![1] as ( c : any ) => Promise<any>;

		mockFrom.mockReturnValue( { all: mockAll, where: mockWhere } );
		mockWhere.mockReturnValue( { all: mockAll } );
		mockAll.mockResolvedValue( [ { id: 'user_1' } ] );
		vi.mocked( has_perms ).mockResolvedValue( true );

		const ctx = createMockCtx( { id: 'admin_1', domain: 'acme', perms: [ 'user.list' ] } );
		const c = createMockHonoContext( ctx, { query: {} } );

		await handler( c );

		expect( c.json ).toHaveBeenCalledWith( expect.objectContaining( { ok: true } ), 200 );
	});

	it('returns a 500 with no ctx when the request middleware did not run', async () => {
		await module_init( mockApp );

		const getHandlerCall = vi.mocked( mockApp.hono.get ).mock.calls.find( ( call ) => call[0] === '/api/user/list' );
		const handler = getHandlerCall![1] as ( c : any ) => Promise<any>;

		const c = { get: () => undefined, req: { query: () => ( {} ) }, json: vi.fn() };
		await handler( c );

		expect( c.json ).toHaveBeenCalledWith( expect.objectContaining( { ok: false } ), 500 );
	});
});
