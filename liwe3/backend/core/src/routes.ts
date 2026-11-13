import type { Context } from 'hono';
import type { HonoEnv, LiWECtx } from './ctx';
import type { LiWEResponse } from './response';
import { responseError } from './response';
import { has_perms } from './permissions';
import { routeMapAdd } from './route-map';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED } from './error-codes';

/**
 * A LiWE3 method function: takes the request ctx and the request params.
 */
type MethodFn = ( ctx : LiWECtx, ...args : any[] ) => Promise<LiWEResponse>;

/** Sentinel gate: the route is reachable without authentication. */
export const PUBLIC = 'public' as const;

/** Sentinel gate: any authenticated user may enter. */
export const LOGGED = 'logged' as const;

/**
 * The permission gate of a route: a sentinel, or a list of permission names of
 * which the caller needs at least one (`has_perms` semantics, `system.admin`
 * always satisfies).
 */
export type RouteGate = typeof PUBLIC | typeof LOGGED | string[];

/**
 * Options passed to `routeGet` / `routeBody` at registration.
 */
export interface RouteOptions {
	/**
	 * The NECESSARY condition to enter the method. It is not sufficient:
	 * resource-ownership and scope-widening checks stay inside the method.
	 */
	perms : RouteGate;
	/** Optional human description, surfaced by the routes introspection endpoint. */
	description? : string;
}

/**
 * Reads the per-request ctx built by ctxMiddleware.
 *
 * @param c - The Hono context
 * @returns The LiWECtx, or null when the middleware did not run
 */
const _getCtx = ( c : Context<HonoEnv> ) : LiWECtx | null => c.get( 'ctx' ) ?? null;

/**
 * Evaluates a route gate against the request context.
 *
 * @param ctx - the per-request context
 * @param gate - the declared gate
 * @returns true when the caller is allowed to enter the method
 */
const _gateCheck = async ( ctx : LiWECtx, gate : RouteGate ) : Promise<boolean> => {
	if ( gate === PUBLIC ) return true;
	if ( gate === LOGGED ) return ( await ctx.user() ) !== null;
	return has_perms( ctx, gate );
};

/**
 * Builds the 401/403 response for a failed gate check: 401 when the caller is
 * not authenticated (re-login), 403 when authenticated but lacking the gate.
 *
 * @param c - the Hono context
 * @param ctx - the per-request context
 */
const _gateReject = async ( c : Context<HonoEnv>, ctx : LiWECtx ) => {
	const logged = ( await ctx.user() ) !== null;
	return logged
		? c.json( responseError( 'Permission denied', 403, ERR_PERMISSION_DENIED ), 403 )
		: c.json( responseError( 'Authentication required', 401, ERR_UNAUTHORIZED ), 401 );
};

/**
 * Wraps a GET method into a Hono route handler.
 * Extracts query parameters and passes them to the method.
 *
 * @param method - The method function to call
 * @param options - Route gate and metadata. Mandatory: a route with no declared
 *                  gate does not compile, so "open by omission" is impossible.
 * @returns Hono route handler
 */
export const routeGet = ( method : MethodFn, options : RouteOptions ) => {
	const handler = async ( c : Context<HonoEnv> ) => {
		const ctx = _getCtx( c );
		if ( !ctx ) return c.json( responseError( 'Request context not initialized', 500, 'NO_REQUEST_CTX' ), 500 );

		if ( !( await _gateCheck( ctx, options.perms ) ) ) return _gateReject( c, ctx );

		const res = await method( ctx, c.req.query() );
		if ( res.response ) return res.response;
		return c.json( res, res.status );
	};

	routeMapAdd( handler, { name: method.name, perms: options.perms, description: options.description } );
	return handler;
};

/**
 * Wraps a method that needs the raw request body (binary uploads, streams).
 *
 * Unlike `routeBody`, this NEVER reads or parses the body: Hono caches the first
 * read of a request body, so a `c.req.json()` here would corrupt a later
 * `c.req.arrayBuffer()` inside the method (binary bytes round-tripped through a
 * UTF-8 string come back full of U+FFFD). The method reads what it needs from
 * `ctx.c.req` itself (headers, `arrayBuffer()`, `blob()`, ...).
 *
 * @param method - The method function to call; it receives only the ctx
 * @param options - Route gate and metadata (same contract as `routeBody`)
 * @returns Hono route handler
 */
export const routeRaw = ( method : MethodFn, options : RouteOptions ) => {
	const handler = async ( c : Context<HonoEnv> ) => {
		const ctx = _getCtx( c );
		if ( !ctx ) return c.json( responseError( 'Request context not initialized', 500, 'NO_REQUEST_CTX' ), 500 );

		if ( !( await _gateCheck( ctx, options.perms ) ) ) return _gateReject( c, ctx );

		try {
			const res = await method( ctx );
			if ( res.response ) return res.response;
			return c.json( res, res.status );
		} catch ( error ) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return c.json( responseError( errorMessage ) );
		}
	};

	routeMapAdd( handler, { name: method.name, perms: options.perms, description: options.description } );
	return handler;
};

/**
 * Wraps a body-based method (POST/PUT/PATCH/DELETE) into a Hono route handler.
 * Parses JSON body and handles errors uniformly.
 *
 * @param method - The method function to call
 * @param options - Route gate and metadata. Mandatory: a route with no declared
 *                  gate does not compile, so "open by omission" is impossible.
 * @returns Hono route handler
 */
export const routeBody = ( method : MethodFn, options : RouteOptions ) => {
	const handler = async ( c : Context<HonoEnv> ) => {
		const ctx = _getCtx( c );
		if ( !ctx ) return c.json( responseError( 'Request context not initialized', 500, 'NO_REQUEST_CTX' ), 500 );

		// the gate runs before the body is parsed: an unauthorized caller does not
		// even get their JSON read
		if ( !( await _gateCheck( ctx, options.perms ) ) ) return _gateReject( c, ctx );

		try {
			// tolerate an empty / missing / malformed JSON body: methods that require
			// params will reject the empty object through their own Zod validation
			const body = await c.req.json().catch( () => ( {} ) );
			const res = await method( ctx, body );
			if ( res.response ) return res.response;
			return c.json( res, res.status );
		} catch ( error ) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return c.json( responseError( errorMessage ) );
		}
	};

	routeMapAdd( handler, { name: method.name, perms: options.perms, description: options.description } );
	return handler;
};
