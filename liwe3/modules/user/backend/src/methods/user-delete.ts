import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Delete a user from the system
 *
 * @property {string} id - User id to be deleted (required)
 */
const UserDeleteSchema = z.object( {
	id: z.string(),
} );

/** Parameters for user_delete */
export type UserDeleteParams = z.infer<typeof UserDeleteSchema>;

/*=== f2c_start user_delete_headers ===*/
import { users } from '../schema';
import { liwe_event_emit } from '@backend/liwe3';

import { ERR_DB_ERROR, capabilities, has_perms_sync } from '@backend/liwe3';
import { USER_PERM_DELETE } from '../perms';
/*=== f2c_end user_delete_headers ===*/

/**
 * Delete a user from the system
 *
 * @permissions user.delete
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserDeleteParams} params - Request parameters
 * @param {string} params.id - User id to be deleted
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const user_delete = async ( ctx : LiWECtx, params : UserDeleteParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<UserDeleteParams>( UserDeleteSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id } = validation.data;

	/*=== f2c_start user_delete ===*/
	// authorization is on the route gate (see index.ts); `caller` is still
	// needed below for the multi-tenant / ownership check.
	const caller = sys?.skip_permissions_check ? null : await ctx.user();
	if ( !sys?.skip_permissions_check && !caller ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );

	try {
		const existingUser = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
		if ( !existingUser ) return responseError( 'User not found', 404, 'USER_NOT_FOUND' );

		// Multi-tenant guard. Only a 'system.admin' may cross domain boundaries.
		// Everyone else may delete only a user of their own domain, and only when
		// they own the account or actually hold 'user.delete' (defense in depth:
		// the route gate already enforces the latter here).
		if ( !sys?.skip_permissions_check ) {
			const cap = await capabilities( ctx, { crossDomain: [ 'system.admin' ] } );

			if ( !cap.crossDomain ) {
				const isOwner = caller?.id === existingUser.id;
				const sameDomain = ( caller?.domain ?? null ) === ( existingUser.domain ?? null );

				if ( !sameDomain ) return responseError( 'Cannot delete a user outside your domain', 403, ERR_PERMISSION_DENIED );
				if ( !isOwner && !has_perms_sync( caller, [ USER_PERM_DELETE ] ) ) return responseError( 'Not allowed to delete this user', 403, ERR_PERMISSION_DENIED );
			}
		}

		// Delete user from database
		await ctx.app.db.delete( users ).where( eq( users.id, id ) ).run();

		// check if any rows were deleted
		const deletedUser = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
		if ( deletedUser ) return responseError( 'User deletion failed', 500, ERR_DB_ERROR );

		await liwe_event_emit( ctx, 'user.delete', { id_user: id } );

		return responseSuccess( true );
	} catch ( error ) {
		return responseError( 'Failed to delete user', 500, ERR_DB_ERROR );
	}
	/*=== f2c_end user_delete ===*/
};
