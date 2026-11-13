import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/*=== f2c_start user_logout_headers ===*/
import { sessionDestroy, sessionListIds } from '@backend/liwe3';
import { user_refresh_tokens, users } from '../schema';
/*=== f2c_end user_logout_headers ===*/

/**
 * Log out a user from the system
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const user_logout = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	/*=== f2c_start user_logout ===*/
	try {
		// Verify that the session exists and is valid
		const sessionData = await ctx.session();
		if ( !sessionData ) return responseError( 'No active session found', 401, ERR_UNAUTHORIZED );

		const userId = sessionData.userId;

		// Get current token version and increment it
		const currentUser = await ctx.app.db.select( { token_version: users.token_version } )
			.from( users )
			.where( eq( users.id, userId ) )
			.get();

		const newTokenVersion = ( currentUser?.token_version ?? 0 ) + 1;

		// Increment token version to invalidate all JWTs
		await ctx.app.db.update( users )
			.set( { token_version: newTokenVersion } )
			.where( eq( users.id, userId ) )
			.run();

		// Delete all refresh tokens for this user
		await ctx.app.db.delete( user_refresh_tokens )
			.where( eq( user_refresh_tokens.id_user, userId ) )
			.run();

		// Fetch and delete all sessions for this user
		const sessionIds = await sessionListIds( ctx.app.kv, userId );

		for ( const sid of sessionIds ) {
			await sessionDestroy( ctx.app.kv, ctx.app.name, sid, userId );
		}

		// Also destroy current session (redundant but safe - covers the case where the
		// current session id wasn't yet visible in the index, e.g. right after login)
		await sessionDestroy( ctx.app.kv, ctx.app.name, sessionData.sessionId, userId );

		return responseSuccess( true );
	} catch ( error ) {
		console.error( '=== ERROR: Logout failed:', error );
		const errorMessage = error instanceof Error ? error.message : 'Logout failed';
		return responseError( errorMessage, 500 );
	}
	/*=== f2c_end user_logout ===*/
};
