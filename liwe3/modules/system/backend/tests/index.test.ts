import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as systemMethods from '../src/methods';
import { module_init } from '../src/index';
import { responseError, responseSuccess, routeBody } from '@backend/liwe3';
import { SYSTEM_PERM_DOMAIN } from '../src/perms';

/** Minimal fake Hono context for exercising a gated route handler. */
const fakeC = ( ctx : any, body : any = {} ) => ( {
	get: ( k : string ) => ( k === 'ctx' ? ctx : undefined ),
	req: { query: () => body, json: async () => body },
	json: ( b : any, s? : number ) => ( { body: b, status: s ?? b?.status ?? 200 } ),
} );

// Mock only the response helpers so we can assert how methods respond, while
// keeping the rest of core (paramsValidation, has_perms, events, mkid) real.
vi.mock( '@backend/liwe3', async () => {
	const actual = await vi.importActual<any>( '@backend/liwe3' );
	return {
		...actual,
		responseSuccess: vi.fn( ( data : any ) => ( { ok: true, data, message: 'Success' } ) ),
		responseError: vi.fn( ( message : string, status = 500, code = 'ERROR' ) => ( { ok: false, message, status, code } ) ),
	};
} );

/**
 * Minimal Drizzle-shaped query mock. Every builder call returns the same object,
 * which is thenable (resolves to `state.rows`), so `await db.select().from().where()`
 * works at any chain depth. `.get()` shifts from `state.getQueue`; an Error in the
 * queue (or `state.throwErr`) rejects, to exercise the catch paths.
 */
const makeDb = () => {
	const state : { rows : any[]; getQueue : any[]; throwErr : Error | null } = {
		rows: [],
		getQueue: [],
		throwErr: null,
	};

	const q : any = {
		select: vi.fn( () => q ),
		from: vi.fn( () => q ),
		where: vi.fn( () => q ),
		values: vi.fn( () => q ),
		set: vi.fn( () => q ),
		update: vi.fn( () => q ),
		insert: vi.fn( () => q ),
		delete: vi.fn( () => q ),
		run: vi.fn( () => Promise.resolve( { success: true } ) ),
		get: vi.fn( () => {
			const v = state.getQueue.length ? state.getQueue.shift() : null;
			return v instanceof Error ? Promise.reject( v ) : Promise.resolve( v );
		} ),
		then: ( resolve : ( v : any ) => void, reject : ( e : any ) => void ) => state.throwErr ? reject( state.throwErr ) : resolve( state.rows ),
	};

	return { state, db: q };
};

const makeCtx = ( db : any, user : any = { perms: [ 'system.admin' ] } ) =>
	( {
		app: { db, cfg: {} },
		user: async () => user,
	} ) as any;

beforeEach( () => {
	vi.clearAllMocks();
} );

describe('system_uptime', () => {
	it('returns the uptime in seconds', async () => {
		const result = await systemMethods.system_uptime( makeCtx( makeDb().db ) );

		expect( responseSuccess ).toHaveBeenCalledWith( expect.any( Number ) );
		expect( result.ok ).toBe( true );
		expect( result.data ).toBeGreaterThanOrEqual( 0 );
	});
});

describe('system_domains_list', () => {
	it('selects visible domains and returns them', async () => {
		const { state, db } = makeDb();
		const rows = [ { code: 'a', name: 'A', visible: true, total_max_tiers: 0, tiers_allocated: 0 } ];
		state.rows = rows;

		const result = await systemMethods.system_domains_list( makeCtx( db ) );

		expect( db.select ).toHaveBeenCalled();
		expect( db.where ).toHaveBeenCalled();
		expect( responseSuccess ).toHaveBeenCalledWith( rows );
		expect( result.data ).toBe( rows );
	});

	it('maps a database failure to a DATABASE_ERROR response', async () => {
		const { state, db } = makeDb();
		state.throwErr = new Error( 'connection lost' );

		await systemMethods.system_domains_list( makeCtx( db ) );

		expect( responseError ).toHaveBeenCalledWith( 'connection lost', 500, 'DATABASE_ERROR' );
	});
});

describe('system_admin_domains_list', () => {
	it('selects every domain without a visibility filter', async () => {
		const { state, db } = makeDb();
		const rows = [
			{ code: 'v', name: 'V', visible: true, tiers_allocated: 0, total_max_tiers: 0 },
			{ code: 'h', name: 'H', visible: false, tiers_allocated: 0, total_max_tiers: 0 },
		];
		state.rows = rows;

		await systemMethods.system_admin_domains_list( makeCtx( db ) );

		expect( db.select ).toHaveBeenCalled();
		expect( db.where ).not.toHaveBeenCalled();
		expect( responseSuccess ).toHaveBeenCalledWith( rows );
	});
});

describe('system_admin_permissions_list', () => {
	it('returns the full permission registry', async () => {
		const result = await systemMethods.system_admin_permissions_list( makeCtx( makeDb().db ) );

		expect( responseSuccess ).toHaveBeenCalledWith( expect.any( Object ) );
		expect( result.ok ).toBe( true );
	});
});

describe('system_email_test', () => {
	it('rejects params without an email', async () => {
		const result = await systemMethods.system_email_test( makeCtx( makeDb().db ), {} as any );
		expect( result.ok ).toBe( false );
	});

	it('reports success for a valid email', async () => {
		const result = await systemMethods.system_email_test( makeCtx( makeDb().db ), { email: 'a@b.com' } );
		expect( responseSuccess ).toHaveBeenCalledWith( true );
		expect( result.ok ).toBe( true );
	});
});

describe('system_admin_domain_add', () => {
	it('rejects params missing code or name', async () => {
		const result = await systemMethods.system_admin_domain_add( makeCtx( makeDb().db ), { name: 'Only name' } as any );
		expect( result.ok ).toBe( false );
	});

	it('inserts and returns the created domain when the code is free', async () => {
		const { state, db } = makeDb();
		const created = { code: 'new', name: 'New', visible: true, tiers_allocated: 0, total_max_tiers: 0 };
		state.getQueue = [ null, created ]; // existence check -> none, then read-back -> created

		const result = await systemMethods.system_admin_domain_add( makeCtx( db ), { code: 'new', name: 'New' } );

		expect( db.insert ).toHaveBeenCalled();
		expect( db.values ).toHaveBeenCalled();
		expect( responseSuccess ).toHaveBeenCalledWith( created );
		expect( result.data ).toBe( created );
	});

	it('refuses a code that already exists', async () => {
		const { state, db } = makeDb();
		state.getQueue = [ { code: 'dup' } ];

		await systemMethods.system_admin_domain_add( makeCtx( db ), { code: 'dup', name: 'Dup' } );

		expect( db.insert ).not.toHaveBeenCalled();
		expect( responseError ).toHaveBeenCalledWith( 'Domain with this code already exists', 409, 'DOMAIN_EXISTS' );
	});
});

describe('system_admin_domain_del', () => {
	it('rejects params missing the code', async () => {
		const result = await systemMethods.system_admin_domain_del( makeCtx( makeDb().db ), {} as any );
		expect( result.ok ).toBe( false );
	});

	it('the route is gated on system.domain', async () => {
		const ctx = makeCtx( makeDb().db, { perms: [] } );

		const res = await routeBody( systemMethods.system_admin_domain_del, { perms: [ SYSTEM_PERM_DOMAIN ] } )( fakeC( ctx, { code: 'x' } ) as any );

		expect( res.status ).toBe( 403 );
	});

	it('deletes an existing domain for an admin caller', async () => {
		const { state, db } = makeDb();
		state.getQueue = [ { code: 'gone' } ];

		const result = await systemMethods.system_admin_domain_del( makeCtx( db ), { code: 'gone' } );

		expect( db.delete ).toHaveBeenCalled();
		expect( responseSuccess ).toHaveBeenCalledWith( true );
		expect( result.ok ).toBe( true );
	});

	it('404s when the domain does not exist', async () => {
		const { state, db } = makeDb();
		state.getQueue = [ null ];

		await systemMethods.system_admin_domain_del( makeCtx( db ), { code: 'missing' } );

		expect( db.delete ).not.toHaveBeenCalled();
		expect( responseError ).toHaveBeenCalledWith( 'Domain not found', 404, 'DOMAIN_NOT_FOUND' );
	});
});

describe('module_init', () => {
	it('registers every system route on the Hono instance', async () => {
		const { db } = makeDb();
		const hono = { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn(), use: vi.fn() };
		const app : any = {
			cfg: { system: { domain: '_' } },
			db,
			hono,
		};

		await module_init( app );

		const routesFor = ( fn : ReturnType<typeof vi.fn> ) => fn.mock.calls.map( ( c ) => c[0] );

		expect( routesFor( hono.get ) ).toEqual( expect.arrayContaining( [
			'/api/system/domains/list',
			'/api/system/admin/domains/list',
			'/api/system/admin/permissions/list',
			'/api/system/domain/create/invite',
			'/api/system/uptime',
			'/api/system/domain/subdomain/list_managed',
		] ) );
		expect( routesFor( hono.post ) ).toEqual( expect.arrayContaining( [
			'/api/system/admin/domain/add',
			'/api/system/email/test',
			'/api/system/admin/domain/create_root',
			'/api/system/domain/subdomain/create',
			'/api/system/domain/user/assign_role',
			'/api/system/admin/test/enter',
			'/api/system/admin/test/exit',
		] ) );
		expect( routesFor( hono.delete ) ).toEqual( [ '/api/system/admin/domain/del' ] );

		for ( const fn of [ hono.get, hono.post, hono.delete ] ) {
			for ( const call of fn.mock.calls ) {
				expect( typeof call[1] ).toBe( 'function' );
			}
		}
	});
});
