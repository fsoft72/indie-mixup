import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Disables 2FA for the current user.
Requires user password (not OTP because user could have lost the token)

Resets: `two_factor_enabled`, `two_factor_secret`, `two_factor_recovery_codes`
 *
 * @property {string} password - Current user password (required)
 */
const User2faDisableSchema = z.object( {
	password: z.string(),
} );

/** Parameters for user_2fa_disable */
export type User2faDisableParams = z.infer<typeof User2faDisableSchema>;

/*=== f2c_start user_2fa_disable_headers ===*/
import { verifyPassword } from '@backend/liwe3/src/crypto';
import { users } from '../schema';
/*=== f2c_end user_2fa_disable_headers ===*/

/**
 * Disables 2FA for the current user.
 * Requires user password (not OTP because user could have lost the token)
 *
 * Resets: `two_factor_enabled`, `two_factor_secret`, `two_factor_recovery_codes`
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {User2faDisableParams} params - Request parameters
 * @param {string} params.password - Current user password
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const user_2fa_disable = async ( ctx : LiWECtx, params : User2faDisableParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<User2faDisableParams>( User2faDisableSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { password } = validation.data;

	/*=== f2c_start user_2fa_disable ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );

	const dbUser = await ctx.app.db.select().from( users ).where( eq( users.id, user.id! ) ).get();
	if ( !dbUser || !await verifyPassword( password, dbUser.password ?? '' ) ) return responseError( 'Invalid password', 403, ERR_UNAUTHORIZED );

	await ctx.app.db.update( users ).set( {
		two_factor_enabled: false,
		two_factor_secret: null,
		two_factor_recovery_codes: null,
	} ).where( eq( users.id, user.id! ) ).run();

	return responseSuccess( true );
	/*=== f2c_end user_2fa_disable ===*/
};
