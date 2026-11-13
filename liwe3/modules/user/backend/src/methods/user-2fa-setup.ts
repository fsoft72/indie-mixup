import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User2FASetup } from '../types';

/*=== f2c_start user_2fa_setup_headers ===*/
import { encryptData, totpOtpauthUrl, totpSecretGenerate } from '@backend/liwe3/src/crypto';
import { users } from '../schema';
/*=== f2c_end user_2fa_setup_headers ===*/

/**
 * Start 2FA for the current user.
 * - Generates secret TOTP
 * - Saves it in `users.two_factor_secret`
 *
 * does **NOT** enable 2FA for the user yet.
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User2FASetup>>} Result object with success status and data or error details
 */
export const user_2fa_setup = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<User2FASetup>> => {
	/*=== f2c_start user_2fa_setup ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );

	const secret = totpSecretGenerate();
	const encryptedSecret = await encryptData( { secret }, ctx.app.cfg.jwt.secret );

	await ctx.app.db.update( users ).set( {
		two_factor_secret: encryptedSecret,
	} ).where( eq( users.id, user.id! ) ).run();

	const otpauth_url = totpOtpauthUrl( secret, user.username ?? '', ctx.app.name );

	return responseSuccess( { secret, otpauth_url } );
	/*=== f2c_end user_2fa_setup ===*/
};
