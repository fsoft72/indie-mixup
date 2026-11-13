import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiWEApp, type LiWECtx } from '@backend/liwe3';
import { user_role_add } from '../src/methods/user-role-add';
import { user_role_del } from '../src/methods/user-role-del';
import { user_role_list } from '../src/methods/user-role-list';
import { user_role_assign } from '../src/methods/user-role-assign';
import { user_roles, users } from '../src/schema';

vi.mock( '@backend/liwe3', async () => {
	const actual = await vi.importActual( '@backend/liwe3' );
	return {
		...actual,
		mkid: vi.fn(),
		has_perms: vi.fn(),
	};
} );

import { has_perms, mkid, routeBody, routeGet } from '@backend/liwe3';
import { USER_PERM_PERMS, USER_PERM_ROLE_MANAGE } from '../src/perms';

/** Minimal fake Hono context for exercising a gated route handler. */
const fakeC = ( c : any, body : any = {} ) => ( {
	get: ( k : string ) => ( k === 'ctx' ? c : undefined ),
	req: { query: () => body, json: async () => body },
	json: ( b : any, s? : number ) => ( { body: b, status: s ?? b?.status ?? 200 } ),
} );

// module_init (used by the route-registration test below) transitively imports
// user-add.ts, which imports '@backend/liwe3/src/email-templates' through an
// alias that vitest.config.ts does not resolve correctly (pre-existing, out of
// scope for this task). Stub out the whole module so that broken import is never
// evaluated.
vi.mock( '../src/methods/user-add', () => ( {
	user_add: vi.fn(),
} ) );

export const mockInsert = vi.fn();
export const mockValues = vi.fn();
export const mockRun = vi.fn();
export const mockSelect = vi.fn();
export const mockFrom = vi.fn();
export const mockAll = vi.fn();
export const mockWhere = vi.fn();
export const mockGet = vi.fn();
export const mockUpdate = vi.fn();
export const mockSet = vi.fn();
export const mockDelete = vi.fn();

export const resetDbMocks = () => {
	mockInsert.mockReturnValue( { values: mockValues } );
	mockValues.mockReturnValue( { run: mockRun } );
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { all: mockAll, where: mockWhere } );
	mockWhere.mockReturnValue( { run: mockRun, get: mockGet, all: mockAll } );
	mockUpdate.mockReturnValue( { set: mockSet } );
	mockSet.mockReturnValue( { where: mockWhere } );
	mockDelete.mockReturnValue( { where: mockWhere } );
};

export const createMockApp = () : LiWEApp => {
	const mockApp = new LiWEApp( 'test' );
	Object.defineProperty( mockApp, 'db', {
		get: () => ( { insert: mockInsert, select: mockSelect, update: mockUpdate, delete: mockDelete } ),
	} );
	Object.defineProperty( mockApp, 'cfg', { get: () => ( { system: {} } ) } ); // avoids a crash in user_create_default_users during module_init tests
	return mockApp;
};

export const createMockCtx = (
	currentUser : any = { id: 'admin_1', domain: 'acme', perms: [ 'user.role.manage', 'user.perms' ] },
	app : LiWEApp = createMockApp(),
) : LiWECtx => ( {
	app,
	c: null,
	sessionId: currentUser ? 'sess_1' : null,
	session: async () => null,
	user: async () => currentUser,
} );

describe('user_role_add', () => {
	let ctx : LiWECtx;

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		ctx = createMockCtx();
		vi.mocked( has_perms ).mockResolvedValue( true );
		vi.mocked( mkid ).mockReturnValue( 'urol_new' );
	} );

	it('creates a new role when no id is given', async () => {
		mockGet
			.mockResolvedValueOnce( undefined ) // duplicate name check
			.mockResolvedValueOnce( { id: 'urol_new', domain: 'acme', name: 'editor', description: null, perms: [ 'content.edit' ] } ); // re-fetch after insert

		const result = await user_role_add( ctx, { name: 'editor', perms: [ 'content.edit' ] } );

		expect( mockInsert ).toHaveBeenCalled();
		expect( mockValues ).toHaveBeenCalledWith( expect.objectContaining( {
			id: 'urol_new',
			domain: 'acme',
			name: 'editor',
			perms: [ 'content.edit' ],
		} ) );
		expect( result.ok ).toBe( true );
		expect( result.data?.name ).toBe( 'editor' );
	});

	it('rejects a duplicate role name in the same domain', async () => {
		mockGet.mockResolvedValueOnce( { id: 'urol_other' } ); // duplicate name check finds another role

		const result = await user_role_add( ctx, { name: 'editor' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 400 );
		expect( mockInsert ).not.toHaveBeenCalled();
	});

	it('unions newly added perms into every user assigned to the role, without touching other perms', async () => {
		const existingRole = { id: 'urol_1', domain: 'acme', name: 'editor', description: null, perms: [ 'content.edit' ] };

		mockGet
			.mockResolvedValueOnce( existingRole ) // fetch existing role by id
			.mockResolvedValueOnce( undefined ) // duplicate name check (same role, excluded by id match, so no conflict returned)
			.mockResolvedValueOnce( { ...existingRole, perms: [ 'content.edit', 'content.publish' ] } ); // re-fetch after update

		mockAll.mockResolvedValueOnce( [
			{ id: 'user_1', perms: [ 'own.dashboard' ] },
			{ id: 'user_2', perms: [ 'own.dashboard', 'content.publish' ] },
		] );

		const result = await user_role_add( ctx, { id: 'urol_1', name: 'editor', perms: [ 'content.edit', 'content.publish' ] } );

		expect( mockSet ).toHaveBeenCalledWith( expect.objectContaining( { perms: [ 'own.dashboard', 'content.publish' ] } ) );
		expect( result.ok ).toBe( true );
	});

	it('the route is gated on user.role.manage', async () => {
		vi.mocked( has_perms ).mockResolvedValue( false );

		const noPerm = createMockCtx( { id: 'u1', domain: 'acme', perms: [] } );
		const res = await routeBody( user_role_add, { perms: [ USER_PERM_ROLE_MANAGE ] } )( fakeC( noPerm, { name: 'editor' } ) as any );

		expect( res.status ).toBe( 403 );
		expect( mockInsert ).not.toHaveBeenCalled();
	});
});

describe('user_role_del', () => {
	let ctx : LiWECtx;

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		ctx = createMockCtx();
		vi.mocked( has_perms ).mockResolvedValue( true );
	} );

	it('deletes the role and unlinks assigned users without touching their perms', async () => {
		mockGet.mockResolvedValueOnce( { id: 'urol_1', domain: 'acme', name: 'editor', perms: [ 'content.edit' ] } );

		const result = await user_role_del( ctx, { id: 'urol_1' } );

		expect( mockUpdate ).toHaveBeenCalledWith( users );
		expect( mockSet ).toHaveBeenCalledWith( { id_role: null } );
		expect( mockDelete ).toHaveBeenCalledWith( user_roles );
		expect( result.ok ).toBe( true );
		expect( result.data ).toBe( true );
	});

	it('returns 404 for a non-existent role', async () => {
		mockGet.mockResolvedValueOnce( undefined );

		const result = await user_role_del( ctx, { id: 'urol_missing' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 404 );
		expect( mockDelete ).not.toHaveBeenCalled();
	});

	it('the route is gated on user.role.manage', async () => {
		vi.mocked( has_perms ).mockResolvedValue( false );

		const noPerm = createMockCtx( { id: 'u1', domain: 'acme', perms: [] } );
		const res = await routeBody( user_role_del, { perms: [ USER_PERM_ROLE_MANAGE ] } )( fakeC( noPerm, { id: 'urol_1' } ) as any );

		expect( res.status ).toBe( 403 );
		expect( mockDelete ).not.toHaveBeenCalled();
	});
});

describe('user_role_list', () => {
	let ctx : LiWECtx;

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		ctx = createMockCtx();
		vi.mocked( has_perms ).mockResolvedValue( true );
	} );

	it('lists roles scoped to the current domain', async () => {
		mockAll.mockResolvedValueOnce( [
			{ id: 'urol_1', domain: 'acme', name: 'editor', description: null, perms: [ 'content.edit' ] },
		] );

		const result = await user_role_list( ctx, {} );

		expect( mockFrom ).toHaveBeenCalledWith( expect.anything() );
		expect( mockWhere ).toHaveBeenCalled();
		expect( result.ok ).toBe( true );
		expect( result.data ).toHaveLength( 1 );
	});

	it('skips the domain filter for a system.admin user in the system domain', async () => {
		ctx = createMockCtx( { id: 'root', domain: 'system', perms: [ 'system.admin' ] } );
		mockAll.mockResolvedValueOnce( [] );

		const result = await user_role_list( ctx, {} );

		expect( mockWhere ).not.toHaveBeenCalled();
		expect( result.ok ).toBe( true );
	});

	it('applies the domain filter even when perms is undefined (regression test for a truthiness bug)', async () => {
		ctx = createMockCtx( { id: 'sysuser', domain: 'system', perms: undefined } );
		mockAll.mockResolvedValueOnce( [] );

		const result = await user_role_list( ctx, {} );

		expect( mockWhere ).toHaveBeenCalled();
		expect( result.ok ).toBe( true );
	});

	it('the route is gated on user.role.manage', async () => {
		vi.mocked( has_perms ).mockResolvedValue( false );

		const noPerm = createMockCtx( { id: 'u1', domain: 'acme', perms: [] } );
		const res = await routeGet( user_role_list, { perms: [ USER_PERM_ROLE_MANAGE ] } )( fakeC( noPerm ) as any );

		expect( res.status ).toBe( 403 );
	});
});

describe('user_role_assign', () => {
	let ctx : LiWECtx;

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		ctx = createMockCtx();
		vi.mocked( has_perms ).mockResolvedValue( true );
	} );

	it('unions the role perms into the user perms and sets id_role', async () => {
		mockGet
			.mockResolvedValueOnce( { id: 'user_1', domain: 'acme', perms: [ 'own.dashboard' ] } ) // target user
			.mockResolvedValueOnce( { id: 'urol_1', domain: 'acme', perms: [ 'content.edit' ] } ) // role
			.mockResolvedValueOnce( { id: 'user_1', domain: 'acme', perms: [ 'own.dashboard', 'content.edit' ], id_role: 'urol_1', password: 'x' } ); // re-fetch

		const result = await user_role_assign( ctx, { id_user: 'user_1', id_role: 'urol_1' } );

		expect( mockSet ).toHaveBeenCalledWith( { id_role: 'urol_1', perms: [ 'own.dashboard', 'content.edit' ] } );
		expect( result.ok ).toBe( true );
		expect( result.data?.password ).toBeNull();
	});

	it('rejects assigning a role from a different domain', async () => {
		mockGet
			.mockResolvedValueOnce( { id: 'user_1', domain: 'acme', perms: [] } )
			.mockResolvedValueOnce( { id: 'urol_1', domain: 'other-domain', perms: [ 'content.edit' ] } );

		const result = await user_role_assign( ctx, { id_user: 'user_1', id_role: 'urol_1' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 400 );
		expect( mockUpdate ).not.toHaveBeenCalled();
	});

	it('returns 404 when the user does not exist', async () => {
		mockGet.mockResolvedValueOnce( undefined );

		const result = await user_role_assign( ctx, { id_user: 'missing', id_role: 'urol_1' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 404 );
	});

	it('the route is gated on user.perms', async () => {
		vi.mocked( has_perms ).mockResolvedValue( false );

		const noPerm = createMockCtx( { id: 'u1', domain: 'acme', perms: [] } );
		const res = await routeBody( user_role_assign, { perms: [ USER_PERM_PERMS ] } )( fakeC( noPerm, { id_user: 'user_1', id_role: 'urol_1' } ) as any );

		expect( res.status ).toBe( 403 );
		expect( mockUpdate ).not.toHaveBeenCalled();
	});
});

import { module_init } from '../src/index';

describe('user_role routes', () => {
	let mockApp : LiWEApp;

	beforeEach( async () => {
		vi.clearAllMocks();
		resetDbMocks();
		mockApp = createMockApp();
		mockApp.hono.get = vi.fn();
		mockApp.hono.post = vi.fn();
		mockApp.hono.delete = vi.fn();
		mockAll.mockResolvedValue( [] );
		mockGet.mockResolvedValue( undefined );

		await module_init( mockApp );
	} );

	it('registers the role routes', () => {
		expect( mockApp.hono.post ).toHaveBeenCalledWith( '/api/user/role/add', expect.any( Function ) );
		expect( mockApp.hono.delete ).toHaveBeenCalledWith( '/api/user/role/del', expect.any( Function ) );
		expect( mockApp.hono.get ).toHaveBeenCalledWith( '/api/user/role/list', expect.any( Function ) );
		expect( mockApp.hono.post ).toHaveBeenCalledWith( '/api/user/role/assign', expect.any( Function ) );
	});
});
