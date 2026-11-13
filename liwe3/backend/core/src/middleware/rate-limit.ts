import type { Context, Next } from 'hono';
import type { HonoEnv } from '../ctx';
import { responseError } from '../response';
import { ERR_RATE_LIMITED } from '../error-codes';

/**
 * The shape of a Cloudflare native rate-limit binding: a single async `limit`
 * call keyed by an arbitrary string. It needs no KV and no storage.
 */
export interface RateLimitBinding {
	limit : ( options : { key : string } ) => Promise<{ success : boolean }>;
}

/**
 * Derives the rate-limit bucket key from the request.
 */
export type RateLimitKeyFn = ( c : Context<HonoEnv> ) => string;

/**
 * Bucket key: the client IP alone.
 *
 * `CF-Connecting-IP` is the address Cloudflare itself sets and cannot be spoofed
 * by the caller, unlike `X-Forwarded-For`.
 *
 * @param c - the Hono request context
 * @returns the client IP, or "anon" when the header is absent (local dev)
 */
export const ipKey : RateLimitKeyFn = ( c ) => c.req.header( 'CF-Connecting-IP' ) ?? 'anon';

/**
 * Bucket key: the client IP plus the request path.
 *
 * Narrower than {@link ipKey}: a shared office IP hitting different 2FA-scoped
 * routes is not throttled as one bucket.
 *
 * @param c - the Hono request context
 * @returns "<ip>:<path>"
 */
export const ipPathKey : RateLimitKeyFn = ( c ) => `${ipKey( c )}:${c.req.path}`;

/** Client addresses of a request that comes from the machine running `wrangler dev` */
const LOOPBACK_IPS = new Set( [ '127.0.0.1', '::1', '::ffff:127.0.0.1' ] );

/**
 * True for a request served by a local development worker: dev mode (`app.isDev`,
 * that is DEV_MODE or Miniflare) AND the client is this machine (loopback address,
 * or no `CF-Connecting-IP` header at all).
 *
 * Both conditions are needed. Outside dev mode nothing is skipped, whatever the
 * address. In dev mode a deployed worker (DEV_MODE set by mistake) is still limited,
 * because its clients come from public addresses: Cloudflare sets the header and a
 * caller cannot spoof it.
 *
 * @param c - the Hono request context
 * @returns true when the rate limit must be skipped
 */
export const isLocalDev = ( c : Context<HonoEnv> ) : boolean => {
	if ( c.get( 'app' )?.isDev !== true ) return false;

	const ip = c.req.header( 'CF-Connecting-IP' );
	return !ip || LOOPBACK_IPS.has( ip );
};

/**
 * Rate-limiting middleware backed by a Cloudflare native rate-limit binding.
 *
 * When the named binding is not present on `app.env` (local dev without the
 * binding configured) the middleware is a no-op, so it never blocks development.
 * It is also skipped for local development traffic, see {@link isLocalDev}: with
 * the binding configured, `wrangler dev` puts every request in the same "anon"
 * bucket and a test suite would hit the limit in a few seconds.
 * On a limit hit it answers 429 with a `Retry-After` header and does not call
 * the downstream handler.
 *
 * @param binding - name of the rate-limit binding on `app.env`
 * @param keyFn - derives the bucket key from the request
 * @returns a Hono middleware handler
 */
export const rateLimitMiddleware = ( binding : string, keyFn : RateLimitKeyFn ) => async ( c : Context<HonoEnv>, next : Next ) : Promise<Response | void> => {
	if ( isLocalDev( c ) ) return next();

	const limiter = c.get( 'app' )?.env?.[binding] as RateLimitBinding | undefined;
	if ( !limiter ) return next();

	const { success } = await limiter.limit( { key: keyFn( c ) } );
	if ( success ) return next();

	c.header( 'Retry-After', '60' );
	return c.json( responseError( 'Too many requests', 429, ERR_RATE_LIMITED ), 429 );
};
