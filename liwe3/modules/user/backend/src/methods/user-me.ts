import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User } from '../types';

/*=== f2c_start user_me_headers ===*/
import { ERR_DB_ERROR } from '@backend/liwe3';
import { users } from '../schema';
/*=== f2c_end user_me_headers ===*/

/**
 * Get session metadata
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User>>} Result object with success status and data or error details
 */
export const user_me = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<User>> => {
	/*=== f2c_start user_me ===*/
	try {
		// getUserData only carries the lightweight session snapshot (id, username,
		// email, perms, domain) taken at login time; fields like two_factor_enabled
		// or name/lastname are never in it, so they must come from a fresh DB read.
		const sessionData = await ctx.session();
		if ( !sessionData ) return responseError( 'No active session found', 401, ERR_UNAUTHORIZED );

		const userId = ( sessionData as any ).userId ?? ( sessionData as any ).metadata?.id;
		if ( !userId ) return responseError( 'No active session found', 401, ERR_UNAUTHORIZED );

		const dbUser = await ctx.app.db.select().from( users ).where( eq( users.id, userId ) ).get();
		if ( !dbUser ) return responseError( 'User not found', 404, ERR_DB_ERROR );

		const { password, two_factor_secret, two_factor_recovery_codes, ...safeUser } = dbUser;

		return responseSuccess( safeUser as any );
	} catch ( error ) {
		console.error( 'Error in user_me:', error );
		return responseError( 'Failed to retrieve user data', 500, ERR_DB_ERROR );
	}
	/*=== f2c_end user_me ===*/
};
