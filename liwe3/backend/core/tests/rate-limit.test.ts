import { describe, expect, it, vi } from 'vitest';
import { ipKey, ipPathKey, rateLimitMiddleware } from '../src/middleware/rate-limit';

/**
 * Builds a minimal Hono-like context.
 *
 * @param limiter - the value returned for `app.env.RL_AUTH`, or undefined
 * @param ip - value of the CF-Connecting-IP header
 * @param path - request path
 * @param isDev - value of `app.isDev` (DEV_MODE or Miniflare)
 */
const makeCtx = ( limiter : unknown, ip : string | null = '1.2.3.4', path = '/api/user/login', isDev = false ) => {
	const headers = new Headers();
	if ( ip ) headers.set( 'CF-Connecting-IP', ip );

	return {
		get: ( k : string ) => ( k === 'app' ? { env: { RL_AUTH: limiter }, isDev } : undefined ),
		req: { header: ( h : string ) => headers.get( h ) ?? undefined, path },
		header: vi.fn(),
		json: ( body : unknown, status : number ) => ( { body, status } ),
	} as any;
};

describe('rateLimitMiddleware', () => {
	it('calls next() while under the limit', async () => {
		const next = vi.fn();
		const mw = rateLimitMiddleware( 'RL_AUTH', ipKey );

		await mw( makeCtx( { limit: async () => ( { success: true } ) } ), next );

		expect( next ).toHaveBeenCalledOnce();
	});

	it('answers 429 with Retry-After when the limiter denies', async () => {
		const next = vi.fn();
		const ctx = makeCtx( { limit: async () => ( { success: false } ) } );
		const mw = rateLimitMiddleware( 'RL_AUTH', ipKey );

		const res = await mw( ctx, next );

		expect( next ).not.toHaveBeenCalled();
		expect( res.status ).toBe( 429 );
		expect( ctx.header ).toHaveBeenCalledWith( 'Retry-After', '60' );
	});

	it('is a no-op when the binding is missing (local dev)', async () => {
		const next = vi.fn();
		const mw = rateLimitMiddleware( 'RL_AUTH', ipKey );

		await mw( makeCtx( undefined ), next );

		expect( next ).toHaveBeenCalledOnce();
	});

	it('passes the derived key to the limiter', async () => {
		const limit = vi.fn( async () => ( { success: true } ) );
		const mw = rateLimitMiddleware( 'RL_AUTH', ipKey );

		await mw( makeCtx( { limit } ), vi.fn() );

		expect( limit ).toHaveBeenCalledWith( { key: '1.2.3.4' } );
	});
});

describe('rateLimitMiddleware in local development', () => {
	const denyAll = () => ( { limit: vi.fn( async () => ( { success: false } ) ) } );

	it('skips the limit in dev mode when there is no CF-Connecting-IP header', async () => {
		const next = vi.fn();
		const limiter = denyAll();
		const mw = rateLimitMiddleware( 'RL_AUTH', ipKey );

		await mw( makeCtx( limiter, null, '/api/user/login', true ), next );

		expect( next ).toHaveBeenCalledOnce();
		expect( limiter.limit ).not.toHaveBeenCalled();
	});

	it.each( [ '127.0.0.1', '::1', '::ffff:127.0.0.1' ] )(
		'skips the limit in dev mode for the loopback address %s (wrangler dev sets CF-Connecting-IP to the client IP)',
		async ( ip ) => {
			const next = vi.fn();
			const limiter = denyAll();
			const mw = rateLimitMiddleware( 'RL_AUTH', ipKey );

			await mw( makeCtx( limiter, ip, '/api/user/login', true ), next );

			expect( next ).toHaveBeenCalledOnce();
			expect( limiter.limit ).not.toHaveBeenCalled();
		},
	);

	it('still limits outside dev mode for a loopback address', async () => {
		const next = vi.fn();
		const limiter = denyAll();
		const mw = rateLimitMiddleware( 'RL_AUTH', ipKey );

		const res = await mw( makeCtx( limiter, '127.0.0.1', '/api/user/login', false ), next );

		expect( next ).not.toHaveBeenCalled();
		expect( res.status ).toBe( 429 );
	});

	it('still limits in dev mode for a public address (a deployed worker with DEV_MODE set by mistake)', async () => {
		const next = vi.fn();
		const limiter = denyAll();
		const mw = rateLimitMiddleware( 'RL_AUTH', ipKey );

		const res = await mw( makeCtx( limiter, '1.2.3.4', '/api/user/login', true ), next );

		expect( next ).not.toHaveBeenCalled();
		expect( res.status ).toBe( 429 );
	});

	it('still limits outside dev mode, even without CF-Connecting-IP', async () => {
		const next = vi.fn();
		const limiter = denyAll();
		const mw = rateLimitMiddleware( 'RL_AUTH', ipKey );

		const res = await mw( makeCtx( limiter, null, '/api/user/login', false ), next );

		expect( next ).not.toHaveBeenCalled();
		expect( res.status ).toBe( 429 );
	});
});

describe('key functions', () => {
	it('ipKey falls back to "anon" without CF-Connecting-IP', () => {
		expect( ipKey( makeCtx( undefined, null ) ) ).toBe( 'anon' );
	});

	it('ipPathKey combines ip and path', () => {
		expect( ipPathKey( makeCtx( undefined, '9.9.9.9', '/api/user/2fa/verify' ) ) ).toBe( '9.9.9.9:/api/user/2fa/verify' );
	});
});
