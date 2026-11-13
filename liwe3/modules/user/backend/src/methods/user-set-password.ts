import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User } from '../types';

/**
 * Schema for Reset user password
 *
 * @property {string} id - User ID (required)
 * @property {string} password - The new user password (required)
 */
const UserSetPasswordSchema = z.object( {
	id: z.string(),
	password: z.string(),
} );

/** Parameters for user_set_password */
export type UserSetPasswordParams = z.infer<typeof UserSetPasswordSchema>;

/*=== f2c_start user_set_password_headers ===*/

import { users } from '../schema';

import { ERR_DB_ERROR, capabilities, has_perms_sync } from '@backend/liwe3';
import { hashPassword } from '@backend/liwe3/src/crypto';
import { USER_PERM_PASSWORD } from '../perms';
/*=== f2c_end user_set_password_headers ===*/

/**
 * Reset user password
 *
 * @permissions user.password
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserSetPasswordParams} params - Request parameters
 * @param {string} params.id - User ID
 * @param {string} params.password - The new user password
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User>>} Result object with success status and data or error details
 */
export const user_set_password = async ( ctx : LiWECtx, params : UserSetPasswordParams, sys? : LiWESysParams ) : Promise<LiWEResponse<User>> => {
	const validation = paramsValidation<UserSetPasswordParams>( UserSetPasswordSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id, password } = validation.data;

	/*=== f2c_start user_set_password ===*/
	try {
		// authorization is on the route gate (see index.ts); `caller` is still
		// needed below for the multi-tenant / ownership check.
		const caller = sys?.skip_permissions_check ? null : await ctx.user();
		if ( !sys?.skip_permissions_check && !caller ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );

		if ( password.length < 8 ) {
			return responseError( 'Password must be at least 8 characters long', 400, 'PASSWORD_TOO_SHORT' );
		}

		const existingUser = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
		if ( !existingUser ) {
			return responseError( 'User not found', 404, 'USER_NOT_FOUND' );
		}

		// Multi-tenant guard. Only a 'system.admin' may cross domain boundaries.
		// Everyone else may reset a password only for a user of their own domain,
		// and only when they own the account or actually hold 'user.password'
		// (defense in depth: the route gate already enforces the latter here).
		if ( !sys?.skip_permissions_check ) {
			const cap = await capabilities( ctx, { crossDomain: [ 'system.admin' ] } );

			if ( !cap.crossDomain ) {
				const isOwner = caller?.id === existingUser.id;
				const sameDomain = ( caller?.domain ?? null ) === ( existingUser.domain ?? null );

				if ( !sameDomain ) return responseError( 'Cannot reset the password of a user outside your domain', 403, ERR_PERMISSION_DENIED );
				if ( !isOwner && !has_perms_sync( caller, [ USER_PERM_PASSWORD ] ) ) return responseError( 'Not allowed to reset this user password', 403, ERR_PERMISSION_DENIED );
			}
		}

		const hashedPassword = await hashPassword( password );

		// The owner choosing a new password satisfies a forced change. An admin reset
		// does not: the user must still pick a password only they know.
		const isOwner = caller?.id === existingUser.id;

		await ctx.app.db
			.update( users )
			.set( {
				password: hashedPassword,
				password_changed_at: Date.now(),
				...( isOwner ? { password_expired: false } : {} ),
			} )
			.where( eq( users.id, id ) )
			.run();

		const updatedUser = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
		if ( !updatedUser ) return responseError( 'Failed to retrieve updated user', 500, ERR_DB_ERROR );

		updatedUser.password = null;
		updatedUser.domain = null;
		return responseSuccess( updatedUser as any );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Database error: ${error.message}`, 500, 'DATABASE_ERROR' );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_set_password ===*/
};
