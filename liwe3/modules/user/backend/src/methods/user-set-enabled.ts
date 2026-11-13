import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User } from '../types';

/**
 * Schema for Enable or disable an user into the system
 *
 * @property {string} id - The User ID (required)
 * @property {boolean} enabled - If the user is enabled or not (required)
 */
const UserSetEnabledSchema = z.object( {
	id: z.string(),
	enabled: zodBoolean,
} );

/** Parameters for user_set_enabled */
export type UserSetEnabledParams = z.infer<typeof UserSetEnabledSchema>;

/*=== f2c_start user_set_enabled_headers ===*/

import { users } from '../schema';

import { ERR_DB_ERROR, capabilities, has_perms_sync } from '@backend/liwe3';
import { USER_PERM_ENABLE } from '../perms';
/*=== f2c_end user_set_enabled_headers ===*/

/**
 * Enable or disable an user into the system
 *
 * @permissions user.enable
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserSetEnabledParams} params - Request parameters
 * @param {string} params.id - The User ID
 * @param {boolean} params.enabled - If the user is enabled or not
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User>>} Result object with success status and data or error details
 */
export const user_set_enabled = async ( ctx : LiWECtx, params : UserSetEnabledParams, sys? : LiWESysParams ) : Promise<LiWEResponse<User>> => {
	const validation = paramsValidation<UserSetEnabledParams>( UserSetEnabledSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id, enabled } = validation.data;

	/*=== f2c_start user_set_enabled ===*/
	try {
		// authorization is on the route gate (see index.ts); `caller` is still
		// needed below for the multi-tenant / ownership check.
		const caller = sys?.skip_permissions_check ? null : await ctx.user();
		if ( !sys?.skip_permissions_check && !caller ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );

		const existingUser = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
		if ( !existingUser ) {
			return responseError( 'User not found', 404, 'USER_NOT_FOUND' );
		}

		// Multi-tenant guard. Only a 'system.admin' may cross domain boundaries.
		// Everyone else may enable/disable only a user of their own domain, and
		// only when they own the account or actually hold 'user.enable'
		// (defense in depth: the route gate already enforces the latter here).
		if ( !sys?.skip_permissions_check ) {
			const cap = await capabilities( ctx, { crossDomain: [ 'system.admin' ] } );

			if ( !cap.crossDomain ) {
				const isOwner = caller?.id === existingUser.id;
				const sameDomain = ( caller?.domain ?? null ) === ( existingUser.domain ?? null );

				if ( !sameDomain ) return responseError( 'Cannot change the enabled state of a user outside your domain', 403, ERR_PERMISSION_DENIED );
				if ( !isOwner && !has_perms_sync( caller, [ USER_PERM_ENABLE ] ) )
					return responseError( 'Not allowed to change this user enabled state', 403, ERR_PERMISSION_DENIED );
			}
		}

		await ctx.app.db
			.update( users )
			.set( {
				enabled,
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
	/*=== f2c_end user_set_enabled ===*/
};
