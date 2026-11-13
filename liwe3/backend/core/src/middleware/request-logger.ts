import type { Context, Next } from 'hono';
import { clearRequestContext, createRequestId, logger, setRequestContext } from '../logger';
import type { LiWEApp } from '../app';

/**
 * Middleware that:
 * 1. Generates a unique request ID
 * 2. Sets request context for all logs during this request
 * 3. Logs request start and end
 * 4. Adds X-Request-ID header to response
 */
export const requestLoggerMiddleware = ( app? : LiWEApp ) => {
	return async ( c : Context, next : Next ) => {
		const requestId = createRequestId();
		const startTime = Date.now();
		const testTag = app?.isTestMode ? '\x1b[43m\x1b[30m[TEST DB]\x1b[0m ' : '';

		// Set context for all logs during this request
		setRequestContext( {
			requestId,
			method: c.req.method,
			path: c.req.path,
			startTime,
		} );

		// Log request start (debug level)
		logger.debug( `${testTag}${c.req.method} ${c.req.path}`, {
			query: Object.fromEntries( new URL( c.req.url ).searchParams ),
		} );

		try {
			// Add request ID to response headers
			c.header( 'X-Request-ID', requestId );

			await next();

			// Log request completion
			const duration = Date.now() - startTime;
			logger.info( `${testTag}${c.req.method} ${c.req.path} ${c.res.status}`, {
				durationMs: duration,
			} );
		} catch ( error ) {
			// Log unhandled errors
			const duration = Date.now() - startTime;
			logger.fatal( 'Unhandled exception', error as Error, {
				durationMs: duration,
			} );
			throw error;
		} finally {
			clearRequestContext();
		}
	};
};
