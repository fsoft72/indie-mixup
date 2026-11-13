import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User } from '../types';

/**
 * Schema for Sets or clears the password_expired flag of a user. When set, the user must choose a new password at the next login, before a session is created. Same permission and multi-tenant rules as /user/set/password.
 *
 * @property {string} id - User ID (required)
 * @property {boolean} password_expired - True to force the password change, false to clear the flag (required)
 */
const UserSetPasswordExpiredSchema = z.object( {
	id: z.string(),
	password_expired: zodBoolean,
} );

/** Parameters for user_set_password_expired */
export type UserSetPasswordExpiredParams = z.infer<typeof UserSetPasswordExpiredSchema>;

/*=== f2c_start user_set_password_expired_headers ===*/
import { users } from '../schema';
import { ERR_DB_ERROR, capabilities } from '@backend/liwe3';
/*=== f2c_end user_set_password_expired_headers ===*/

/**
 * Sets or clears the password_expired flag of a user. When set, the user must choose a new password at the next login, before a session is created. Same permission and multi-tenant rules as /user/set/password.
 *
 * @permissions user.password
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserSetPasswordExpiredParams} params - Request parameters
 * @param {string} params.id - User ID
 * @param {boolean} params.password_expired - True to force the password change, false to clear the flag
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User>>} Result object with success status and data or error details
 */
export const user_set_password_expired = async ( ctx : LiWECtx, params : UserSetPasswordExpiredParams, sys? : LiWESysParams ) : Promise<LiWEResponse<User>> => {
	const validation = paramsValidation<UserSetPasswordExpiredParams>( UserSetPasswordExpiredSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id, password_expired } = validation.data;

	/*=== f2c_start user_set_password_expired ===*/

	try {
		// authorization (user.password) is on the route gate, see index.ts
		const caller = sys?.skip_permissions_check ? null : await ctx.user();
		if ( !sys?.skip_permissions_check && !caller ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );

		const existingUser = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
		if ( !existingUser ) return responseError( 'User not found', 404, 'USER_NOT_FOUND' );

		// Multi-tenant guard: only a 'system.admin' may cross domain boundaries
		if ( !sys?.skip_permissions_check ) {
			const cap = await capabilities( ctx, { crossDomain: [ 'system.admin' ] } );
			const sameDomain = ( caller?.domain ?? null ) === ( existingUser.domain ?? null );
			if ( !cap.crossDomain && !sameDomain ) return responseError( 'Cannot change a user outside your domain', 403, ERR_PERMISSION_DENIED );
		}

		await ctx.app.db.update( users ).set( { password_expired } ).where( eq( users.id, id ) ).run();

		const updatedUser = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
		if ( !updatedUser ) return responseError( 'Failed to retrieve updated user', 500, ERR_DB_ERROR );

		updatedUser.password = null;
		updatedUser.domain = null;
		return responseSuccess( updatedUser as any );
	} catch ( error ) {
		if ( error instanceof Error ) return responseError( `Database error: ${error.message}`, 500, ERR_DB_ERROR );
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_set_password_expired ===*/
};
