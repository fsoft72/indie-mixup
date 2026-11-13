import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User } from '../types';

/**
 * Schema for Assigns a role to a user. Sets users.id_role and unions (additively) the role's perms into the user's existing perms - no permission already on the user is removed. Returns 404 if the user or role does not exist, 400 if the role belongs to a different domain than the target user.
 *
 * @property {string} id_user - ID user to assign role to (required)
 * @property {string} id_role - ID Role to assign (required)
 */
const UserRoleAssignSchema = z.object( {
	id_user: z.string(),
	id_role: z.string(),
} );

/** Parameters for user_role_assign */
export type UserRoleAssignParams = z.infer<typeof UserRoleAssignSchema>;

/*=== f2c_start user_role_assign_headers ===*/

import { user_roles, users } from '../schema';

import { union_perms } from './utils';
/*=== f2c_end user_role_assign_headers ===*/

/**
 * Assigns a role to a user. Sets users.id_role and unions (additively) the role's perms into the user's existing perms - no permission already on the user is removed. Returns 404 if the user or role does not exist, 400 if the role belongs to a different domain than the target user.
 *
 * @permissions user.perms
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserRoleAssignParams} params - Request parameters
 * @param {string} params.id_user - ID user to assign role to
 * @param {string} params.id_role - ID Role to assign
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User>>} Result object with success status and data or error details
 */
export const user_role_assign = async ( ctx : LiWECtx, params : UserRoleAssignParams, sys? : LiWESysParams ) : Promise<LiWEResponse<User>> => {
	const validation = paramsValidation<UserRoleAssignParams>( UserRoleAssignSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_user, id_role } = validation.data;

	/*=== f2c_start user_role_assign ===*/

	if ( !sys?.skip_permissions_check ) {
		const user = await ctx.user();
		if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );
		// authorization is on the route gate (see index.ts)
	}

	try {
		const targetUser = await ctx.app.db.select().from( users ).where( eq( users.id, id_user ) ).get();
		if ( !targetUser ) return responseError( 'User not found', 404, 'USER_NOT_FOUND' );

		const role = await ctx.app.db.select().from( user_roles ).where( eq( user_roles.id, id_role ) ).get();
		if ( !role ) return responseError( 'Role not found', 404, 'ROLE_NOT_FOUND' );

		if ( role.domain !== targetUser.domain ) return responseError( 'Role belongs to a different domain', 400, 'ROLE_DOMAIN_MISMATCH' );

		const mergedPerms = union_perms( targetUser.perms, role.perms );

		await ctx.app.db.update( users ).set( {
			id_role,
			perms: mergedPerms,
		} ).where( eq( users.id, id_user ) ).run();

		const updatedUser = await ctx.app.db.select().from( users ).where( eq( users.id, id_user ) ).get();
		if ( !updatedUser ) return responseError( 'Failed to retrieve updated user', 500 );

		updatedUser.password = null;
		updatedUser.domain = null;

		return responseSuccess( updatedUser as any );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Database error: ${error.message}`, 500, 'DATABASE_ERROR' );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_role_assign ===*/
};
