import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Deletes a user role by id. Users currently assigned to the role are unlinked (id_role set to null); their existing perms are left untouched. Returns 404 if the role does not exist.
 *
 * @property {string} id - id role to delete (required)
 */
const UserRoleDelSchema = z.object( {
	id: z.string(),
} );

/** Parameters for user_role_del */
export type UserRoleDelParams = z.infer<typeof UserRoleDelSchema>;

/*=== f2c_start user_role_del_headers ===*/

import { user_roles, users } from '../schema';
/*=== f2c_end user_role_del_headers ===*/

/**
 * Deletes a user role by id. Users currently assigned to the role are unlinked (id_role set to null); their existing perms are left untouched. Returns 404 if the role does not exist.
 *
 * @permissions user.role.manage
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserRoleDelParams} params - Request parameters
 * @param {string} params.id - id role to delete
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const user_role_del = async ( ctx : LiWECtx, params : UserRoleDelParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<UserRoleDelParams>( UserRoleDelSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id } = validation.data;

	/*=== f2c_start user_role_del ===*/

	if ( !sys?.skip_permissions_check ) {
		const user = await ctx.user();
		if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );
		// authorization is on the route gate (see index.ts)
	}

	try {
		const domain = sys?.domain || ( await ctx.user() )?.domain || '__no_domain';

		// internal / system calls (skip_permissions_check) may address a role in any domain,
		// regular callers can only delete roles belonging to their own domain
		const existingRole = await ctx.app.db.select().from( user_roles ).where(
			sys?.skip_permissions_check
				? eq( user_roles.id, id )
				: and( eq( user_roles.id, id ), eq( user_roles.domain, domain ) ),
		).get();

		if ( !existingRole ) return responseError( 'Role not found', 404, 'ROLE_NOT_FOUND' );

		await ctx.app.db.update( users ).set( { id_role: null } ).where( eq( users.id_role, id ) ).run();
		await ctx.app.db.delete( user_roles ).where( eq( user_roles.id, id ) ).run();

		return responseSuccess( true );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Database error: ${error.message}`, 500, 'DATABASE_ERROR' );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_role_del ===*/
};
