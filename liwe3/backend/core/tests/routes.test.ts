import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOGGED, PUBLIC, routeBody, routeGet } from '../src/routes';
import { collectRouteList, publicRoutes, routeMapAll, routeMapGet, routeMapReset } from '../src/route-map';

/**
 * Minimal fake ctx: only `user()` is exercised by the gate.
 *
 * @param user - the resolved user, or null for an anonymous request
 */
const makeCtx = ( user : any ) => ( { user: async () => user } );

/**
 * Minimal fake Hono context.
 *
 * @param ctx - the value returned for `c.get('ctx')`
 * @param opts - optional query object and a body resolver spy
 */
const makeC = ( ctx : any, opts : { query? : any; jsonSpy? : any } = {} ) => ( {
	get: ( k : string ) => ( k === 'ctx' ? ctx : undefined ),
	req: {
		query: () => opts.query ?? {},
		json: opts.jsonSpy ?? ( async () => ( {} ) ),
	},
	json: ( body : any, status? : number ) => ( { body, status: status ?? body?.status ?? 200 } ),
} );

const okMethod = vi.fn( async () => ( { ok: true, status: 200, data: 'done' } ) );

beforeEach( () => {
	vi.clearAllMocks();
	routeMapReset();
} );

describe('route gate', () => {
	it('PUBLIC lets an anonymous request through', async () => {
		const handler = routeGet( okMethod, { perms: PUBLIC } );
		const res = await handler( makeC( makeCtx( null ) ) as any );

		expect( okMethod ).toHaveBeenCalledOnce();
		expect( res.body.data ).toBe( 'done' );
	});

	it('LOGGED returns 401 for an anonymous request', async () => {
		const handler = routeGet( okMethod, { perms: LOGGED } );
		const res = await handler( makeC( makeCtx( null ) ) as any );

		expect( okMethod ).not.toHaveBeenCalled();
		expect( res.status ).toBe( 401 );
	});

	it('LOGGED lets an authenticated request through', async () => {
		const handler = routeGet( okMethod, { perms: LOGGED } );
		const res = await handler( makeC( makeCtx( { id: 'u1', perms: [ 'x' ] } ) ) as any );

		expect( okMethod ).toHaveBeenCalledOnce();
		expect( res.body.data ).toBe( 'done' );
	});

	it('a permission gate returns 403 for an authenticated user without it', async () => {
		const handler = routeGet( okMethod, { perms: [ 'user.list' ] } );
		const res = await handler( makeC( makeCtx( { id: 'u1', perms: [ 'other.perm' ] } ) ) as any );

		expect( okMethod ).not.toHaveBeenCalled();
		expect( res.status ).toBe( 403 );
	});

	it('a permission gate lets a holder of the permission through', async () => {
		const handler = routeGet( okMethod, { perms: [ 'user.list' ] } );
		const res = await handler( makeC( makeCtx( { id: 'u1', perms: [ 'user.list' ] } ) ) as any );

		expect( okMethod ).toHaveBeenCalledOnce();
		expect( res.body.data ).toBe( 'done' );
	});

	it('the gate runs before the JSON body is parsed', async () => {
		const jsonSpy = vi.fn( async () => ( {} ) );
		const handler = routeBody( okMethod, { perms: LOGGED } );

		const res = await handler( makeC( makeCtx( null ), { jsonSpy } ) as any );

		expect( res.status ).toBe( 401 );
		expect( jsonSpy ).not.toHaveBeenCalled();
		expect( okMethod ).not.toHaveBeenCalled();
	});
});

describe('route map', () => {
	it('records the declared gate keyed by the returned handler', () => {
		const user_list = async () => ( { ok: true, status: 200 } );
		const handler = routeGet( user_list, { perms: [ 'user.list' ], description: 'list users' } );

		expect( routeMapGet( handler ) ).toEqual( { name: 'user_list', perms: [ 'user.list' ], description: 'list users' } );
	});

	it('routeMapAll returns every recorded route', () => {
		const a = routeGet( okMethod, { perms: PUBLIC } );
		const b = routeBody( okMethod, { perms: LOGGED } );

		const handlers = routeMapAll().map( ( [ h ] ) => h );
		expect( handlers ).toContain( a );
		expect( handlers ).toContain( b );
		expect( routeMapAll() ).toHaveLength( 2 );
	});
});

describe('collectRouteList', () => {
	it('correlates hono routes with their declared gate, /api only, sorted', () => {
		const login = routeBody( okMethod, { perms: PUBLIC } );
		const list = routeGet( okMethod, { perms: [ 'user.list' ], description: 'all users' } );
		const asset = routeGet( okMethod, { perms: LOGGED } );

		const rows = collectRouteList( [
			{ method: 'GET', path: '/api/user/list', handler: list },
			{ method: 'POST', path: '/api/user/login', handler: login },
			{ method: 'GET', path: '/static/x', handler: asset }, // not /api -> skipped
			{ method: 'GET', path: '/api/no-gate', handler: () => {} }, // not in map -> skipped
		] );

		expect( rows ).toEqual( [
			{ method: 'GET', path: '/api/user/list', perms: [ 'user.list' ], description: 'all users' },
			{ method: 'POST', path: '/api/user/login', perms: PUBLIC, description: undefined },
		] );
	});

	it('publicRoutes returns only the PUBLIC ones as "METHOD /path"', () => {
		const pub = routeBody( okMethod, { perms: PUBLIC } );
		const priv = routeGet( okMethod, { perms: LOGGED } );

		expect( publicRoutes( [
			{ method: 'POST', path: '/api/user/login', handler: pub },
			{ method: 'GET', path: '/api/user/me', handler: priv },
		] ) ).toEqual( [ 'POST /api/user/login' ] );
	});
});
