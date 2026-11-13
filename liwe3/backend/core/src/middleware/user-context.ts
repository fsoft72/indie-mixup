import type { Context, Next } from 'hono';
import { updateRequestContext } from '../logger';
import type { HonoEnv } from '../ctx';

/**
 * Middleware that adds user ID and domain to log context.
 * Must run AFTER ctxMiddleware, which builds the per-request ctx.
 * Silently skips if user is not authenticated (no errors logged).
 */
export const userContextMiddleware = () => {
	return async ( c : Context<HonoEnv>, next : Next ) => {
		const ctx = c.get( 'ctx' );

		if ( ctx?.sessionId ) {
			try {
				const user = await ctx.user();
				if ( user ) {
					updateRequestContext( {
						userId: user.id,
						domain: user.domain,
					} );
				}
			} catch {
				// Silently ignore - user not authenticated is normal for public endpoints
			}
		}

		await next();
	};
};
