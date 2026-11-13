import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UserRole } from '../types';

/**
 * Schema for Lists all roles defined for the current user's domain, with the same pagination behavior as user_list (offset/limit). Domain filter is bypassed only for a system.admin user in the system domain.
 *
 * @property {[number]} offset - Pagination row start
 * @property {[number]} limit - Pagination rows
 */
const UserRoleListSchema = z.object( {
	offset: z.coerce.number().optional(),
	limit: z.coerce.number().optional(),
} );

/** Parameters for user_role_list */
export type UserRoleListParams = z.infer<typeof UserRoleListSchema>;

/*=== f2c_start user_role_list_headers ===*/
import { user_roles } from '../schema';
/*=== f2c_end user_role_list_headers ===*/

/**
 * Lists all roles defined for the current user's domain, with the same pagination behavior as user_list (offset/limit). Domain filter is bypassed only for a system.admin user in the system domain.
 *
 * @permissions user.role.manage
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserRoleListParams} params - Request parameters
 * @param {number} ?params.offset - Pagination row start
 * @param {number} ?params.limit - Pagination rows
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UserRole[]>>} Result object with success status and data or error details
 */
export const user_role_list = async ( ctx : LiWECtx, params : UserRoleListParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UserRole[]>> => {
	const validation = paramsValidation<UserRoleListParams>( UserRoleListSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { offset, limit } = validation.data;

	/*=== f2c_start user_role_list ===*/
	const u = await ctx.user();

	if ( !sys?.skip_permissions_check ) {
		if ( !u ) return responseError( 'User not authenticated', 401, ERR_UNAUTHORIZED );
		// authorization is on the route gate (see index.ts)
	}

	try {
		let query = ctx.app.db.select().from( user_roles );

		// the domain filter is bypassed only for a system.admin user in the system domain
		const domain = sys?.domain || u?.domain;
		const is_system_admin = u?.domain === 'system' && !!u?.perms?.includes( 'system.admin' );

		if ( !is_system_admin ) query = query.where( eq( user_roles.domain, domain ?? '--' ) ) as any;

		if ( offset !== undefined ) query = query.offset( offset ) as any;
		if ( limit !== undefined ) query = query.limit( limit ) as any;

		const roles = await query.all();

		return responseSuccess( roles as any );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Database error: ${error.message}`, 500, 'DATABASE_ERROR' );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_role_list ===*/
};
