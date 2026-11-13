import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UserLogin } from '../types';

/**
 * Schema for Completes a login blocked by an expired password. Takes the pending_token returned by /user/login (or /user/2fa/verify) and the new password, stores it, clears the expired flag and returns the full login. Unauthenticated, so it is rate limited per IP (RL_AUTH).
 *
 * @property {string} pending_token - Brief JWT returned by the login when requires_password_change is true (required)
 * @property {string} password - The new password (min 8 characters, different from the current one) (required)
 */
const UserPasswordChangeExpiredSchema = z.object( {
	pending_token: z.string(),
	password: z.string(),
} );

/** Parameters for user_password_change_expired */
export type UserPasswordChangeExpiredParams = z.infer<typeof UserPasswordChangeExpiredSchema>;

/*=== f2c_start user_password_change_expired_headers ===*/
import { users } from '../schema';
import { ERR_DB_ERROR } from '@backend/liwe3';
import { hashPassword, jwtVerify, verifyPassword } from '@backend/liwe3/src/crypto';
import { PASSWORD_CHANGE_PURPOSE, user_create_user_login, user_password_change_reason } from './user-login';

const MIN_PASSWORD_LENGTH = 8;
/*=== f2c_end user_password_change_expired_headers ===*/

/**
 * Completes a login blocked by an expired password. Takes the pending_token returned by /user/login (or /user/2fa/verify) and the new password, stores it, clears the expired flag and returns the full login. Unauthenticated, so it is rate limited per IP (RL_AUTH).
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserPasswordChangeExpiredParams} params - Request parameters
 * @param {string} params.pending_token - Brief JWT returned by the login when requires_password_change is true
 * @param {string} params.password - The new password (min 8 characters, different from the current one)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UserLogin>>} Result object with success status and data or error details
 */
export const user_password_change_expired = async ( ctx : LiWECtx, params : UserPasswordChangeExpiredParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UserLogin>> => {
	const validation = paramsValidation<UserPasswordChangeExpiredParams>( UserPasswordChangeExpiredSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { pending_token, password } = validation.data;

	/*=== f2c_start user_password_change_expired ===*/

	try {
		// The token only exists after the credentials (and the 2FA code) were verified
		const payload = await jwtVerify( pending_token, ctx.app.cfg.jwt.secret );
		if ( !payload || payload.purpose !== PASSWORD_CHANGE_PURPOSE || !payload.id_user ) return responseError( 'Invalid or expired pending token', 401, ERR_UNAUTHORIZED );

		if ( password.length < MIN_PASSWORD_LENGTH ) return responseError( `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`, 400, 'PASSWORD_TOO_SHORT' );

		const user = await ctx.app.db.select().from( users ).where( eq( users.id, payload.id_user ) ).get();
		if ( !user ) return responseError( 'Invalid or expired pending token', 401, ERR_UNAUTHORIZED );

		// State can change during the 5 minutes the token lives
		if ( !user.enabled ) return responseError( 'This account has been disabled. Contact an administrator for assistance.', 403, 'ACCOUNT_DISABLED' );

		// The token is not single use by itself: this check is what makes it so.
		// Once the password is changed the reason is gone, and the same token is useless.
		if ( !user_password_change_reason( ctx, user as any ) ) return responseError( 'A password change is not required', 400, 'PASSWORD_CHANGE_NOT_REQUIRED' );

		if ( await verifyPassword( password, user.password ?? '' ) ) return responseError( 'The new password must be different from the current one', 400, 'PASSWORD_UNCHANGED' );

		// Sessions of the old password (other devices) die with the token_version bump
		const token_version = ( user.token_version ?? 0 ) + 1;

		await ctx.app.db
			.update( users )
			.set( {
				password: await hashPassword( password ),
				password_expired: false,
				password_changed_at: Date.now(),
				token_version,
			} )
			.where( eq( users.id, user.id! ) )
			.run();

		return responseSuccess( await user_create_user_login( ctx, { ...user, token_version } as any ) );
	} catch ( error ) {
		if ( error instanceof Error ) return responseError( `Database error: ${error.message}`, 500, ERR_DB_ERROR );
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_password_change_expired ===*/
};
