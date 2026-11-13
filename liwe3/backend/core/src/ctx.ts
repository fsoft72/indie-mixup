import type { Context } from 'hono';
import type { LiWEApp } from './app';
import type { SessionData } from './session';
import type { LiWEUser } from './types';

/**
 * Everything that belongs to a single in-flight request.
 *
 * NEVER store this object on LiWEApp: the app instance is shared across all the
 * concurrent requests served by the same Cloudflare isolate, so any per-request
 * state written on it leaks between requests.
 *
 * The ctx is built once by the request middleware and passed explicitly down to
 * every method, event handler and queue action.
 */
export interface LiWECtx {
	/** Shared, stateless resources (db, kv, cfg, log, hono) */
	app : LiWEApp;
	/** Hono context of the current request, null for non-HTTP contexts (queues, seeders, cron) */
	c : Context | null;
	/** Session id of the current request, null when unauthenticated */
	sessionId : string | null;
	/** Resolves the raw session data of the current request, null when unauthenticated */
	session : () => Promise<SessionData | null>;
	/** Resolves the user of the current request, null when unauthenticated */
	user : () => Promise<LiWEUser | null>;
}

/** Resolver returning the session data of the current request */
export type SessionResolver = () => Promise<SessionData | null>;

/**
 * Hono generics for this app: the shape of everything stored on the Hono
 * `Context` via `c.set()` / `c.get()`. Type a handler's `c` as
 * `Context<HonoEnv>` and `c.get( 'ctx' )` is a `LiWECtx` with no cast.
 */
export type HonoEnv = {
	Variables : {
		app : LiWEApp;
		ctx : LiWECtx;
	};
};

/**
 * Creates a request-scoped context.
 *
 * The session resolver is memoized: the session is fetched from KV at most once
 * per request, no matter how many times `ctx.session()` / `ctx.user()` are called.
 *
 * @param app - The shared LiWEApp instance
 * @param c - The Hono context of the current request, or null for non-HTTP contexts
 * @param sessionId - Session id of the current request, null when unauthenticated
 * @param getSession - Resolver fetching the session data
 * @returns The LiWECtx for the current request
 */
export const ctxCreate = (
	app : LiWEApp,
	c : Context | null,
	sessionId : string | null,
	getSession : SessionResolver,
) : LiWECtx => {
	let sessionPromise : Promise<SessionData | null> | null = null;

	const session = () : Promise<SessionData | null> => {
		if ( !sessionPromise ) sessionPromise = getSession();
		return sessionPromise;
	};

	const user = async () : Promise<LiWEUser | null> => {
		const data = await session();
		if ( !data || !data.metadata ) return null;
		return data.metadata as LiWEUser;
	};

	return { app, c, sessionId, session, user };
};

/**
 * Creates a context for code running outside an HTTP request (queue consumers,
 * module seeders, cron jobs, tests).
 *
 * @param app - The shared LiWEApp instance
 * @param user - Optional user to impersonate, null for an anonymous context
 * @returns A LiWECtx with no Hono context and no session id
 */
export const ctxSystem = ( app : LiWEApp, user : LiWEUser | null = null ) : LiWECtx => {
	const data : SessionData | null = user
		? {
			userId: user.id,
			sessionId: '',
			createdAt: 0,
			expiresAt: 0,
			metadata: user as unknown as Record<string, any>,
		}
		: null;

	return ctxCreate( app, null, null, async () => data );
};

/**
 * Derives a new context bound to a different user, keeping the same app and Hono
 * context. Used by impersonation and by system calls that must run as a given user.
 *
 * SECURITY: this is an unchecked primitive - it performs NO permission check of
 * its own. Any request-triggered caller MUST first verify the real caller is
 * allowed to impersonate (e.g. `has_perms( ctx, [ 'user.change_identity' ] )` or
 * an admin permission) before calling this. Only trusted system code (queue
 * consumers, cron, seeders) may call it unguarded.
 *
 * @param ctx - The source context
 * @param user - The user the new context must resolve to
 * @returns A new LiWECtx resolving to the given user
 */
export const ctxAsUser = ( ctx : LiWECtx, user : LiWEUser ) : LiWECtx =>
	ctxCreate( ctx.app, ctx.c, ctx.sessionId, async () => ( {
		userId: user.id,
		sessionId: ctx.sessionId ?? '',
		createdAt: 0,
		expiresAt: 0,
		metadata: user as unknown as Record<string, any>,
	} ) );

/** Last-resort base URL when neither the request nor the env expose an origin */
const _BASE_URL_FALLBACK = 'http://localhost';

/**
 * Resolves the public base URL (scheme + host, no trailing slash) of the current
 * deployment, to build absolute links that live outside the API (emails, PDFs,
 * redirects to the frontend).
 *
 * Resolution order:
 *   1. origin of the in-flight request (`ctx.c.req.url`) - always correct since
 *      frontend, API and assets are served by the same Worker;
 *   2. first entry of the `ALLOWED_ORIGINS` env var - the only origin known to
 *      non-HTTP contexts (queues, cron, seeders);
 *   3. `http://localhost` as a last resort.
 *
 * @param ctx - The current request context
 * @returns The base URL without a trailing slash
 */
export const ctxBaseUrl = ( ctx : LiWECtx ) : string => {
	const reqUrl = ctx.c?.req.url;
	if ( reqUrl ) {
		try {
			return new URL( reqUrl ).origin;
		} catch {
			// malformed request URL: fall through to the env-based resolution
		}
	}

	const allowed = ( ctx.c?.env?.ALLOWED_ORIGINS ?? '' )
		.split( ',' )
		.map( ( o : string ) => o.trim() )
		.filter( Boolean );
	if ( allowed.length ) return allowed[0].replace( /\/+$/, '' );

	return _BASE_URL_FALLBACK;
};
