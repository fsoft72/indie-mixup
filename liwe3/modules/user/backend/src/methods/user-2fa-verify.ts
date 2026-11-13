import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UserLogin } from '../types';

/**
 * Schema for Verify if the user 2FA code is valid
 *
 * @property {string} pending_token - Brief JWT created by user_login (required)
 * @property {string} code - 2FA Code (required)
 */
const User2faVerifySchema = z.object( {
	pending_token: z.string(),
	code: z.string(),
} );

/** Parameters for user_2fa_verify */
export type User2faVerifyParams = z.infer<typeof User2faVerifySchema>;

/*=== f2c_start user_2fa_verify_headers ===*/
import { decryptData, jwtVerify, totpVerify, verifyPassword } from '@backend/liwe3/src/crypto';
import { users } from '../schema';
import { user_login_complete } from './user-login';
/*=== f2c_end user_2fa_verify_headers ===*/

/**
 * Verify if the user 2FA code is valid
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {User2faVerifyParams} params - Request parameters
 * @param {string} params.pending_token - Brief JWT created by user_login
 * @param {string} params.code - 2FA Code
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UserLogin>>} Result object with success status and data or error details
 */
export const user_2fa_verify = async ( ctx : LiWECtx, params : User2faVerifyParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UserLogin>> => {
	const validation = paramsValidation<User2faVerifyParams>( User2faVerifySchema as any, params );
	if ( !validation.success ) return validation.error;

	const { pending_token, code } = validation.data;

	/*=== f2c_start user_2fa_verify ===*/

	const payload = await jwtVerify( pending_token, ctx.app.cfg.jwt.secret );
	if ( !payload || payload.purpose !== '2fa_pending' || !payload.id_user ) return responseError( 'Invalid or expired pending token', 401, ERR_UNAUTHORIZED );

	const dbUser = await ctx.app.db.select().from( users ).where( eq( users.id, payload.id_user ) ).get();
	if ( !dbUser?.two_factor_enabled || !dbUser.two_factor_secret ) return responseError( '2FA is not enabled for this user', 400, '2FA_NOT_ENABLED' );

	const { secret } = await decryptData( dbUser.two_factor_secret, ctx.app.cfg.jwt.secret ) as { secret : string };

	let validCode = await totpVerify( secret, code );

	if ( !validCode ) {
		const recoveryCodes = dbUser.two_factor_recovery_codes ?? [];

		for ( let i = 0; i < recoveryCodes.length; i++ ) {
			if ( !await verifyPassword( code, recoveryCodes[i] ) ) continue;

			validCode = true;
			const remaining = recoveryCodes.filter( ( _, idx ) => idx !== i );
			await ctx.app.db.update( users ).set( { two_factor_recovery_codes: remaining } ).where( eq( users.id, dbUser.id! ) ).run();
			break;
		}
	}

	if ( !validCode ) return responseError( 'Invalid code', 400, '2FA_INVALID_CODE' );

	return await user_login_complete( ctx, dbUser as any );
	/*=== f2c_end user_2fa_verify ===*/
};
