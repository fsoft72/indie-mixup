import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UserRole } from '../types';

/**
 * Schema for Add or updates a user role. If the id is specified, the role is updated (fields omitted in the request keep their current stored value - PATCH semantics, not full replace). If id is missing, a new role is created in the caller's domain. Rejects a duplicate name within the same domain. On update, any permission newly added to the role is unioned (additively) into perms of every user currently assigned to that role via id_role; permissions removed from the role are never retroactively removed from already-assigned users.
 *
 * @property {string} name - role name (required)
 * @property {[string]} id - id role
 * @property {[string]} description - Role description
 * @property {[string[]]} perms - Role permissions
 */
const UserRoleAddSchema = z.object( {
	name: z.string(),
	id: z.string().optional(),
	description: z.string().optional(),
	perms: z.string().array().optional(),
} );

/** Parameters for user_role_add */
export type UserRoleAddParams = z.infer<typeof UserRoleAddSchema>;

/*=== f2c_start user_role_add_headers ===*/

import { user_roles, users } from '../schema';

import { mkid } from '@backend/liwe3';
import { union_perms } from './utils';
/*=== f2c_end user_role_add_headers ===*/

/**
 * Add or updates a user role. If the id is specified, the role is updated (fields omitted in the request keep their current stored value - PATCH semantics, not full replace). If id is missing, a new role is created in the caller's domain. Rejects a duplicate name within the same domain. On update, any permission newly added to the role is unioned (additively) into perms of every user currently assigned to that role via id_role; permissions removed from the role are never retroactively removed from already-assigned users.
 *
 * @permissions user.role.manage
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserRoleAddParams} params - Request parameters
 * @param {string} params.name - role name
 * @param {string} ?params.id - id role
 * @param {string} ?params.description - Role description
 * @param {string[]} ?params.perms - Role permissions
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UserRole>>} Result object with success status and data or error details
 */
export const user_role_add = async ( ctx : LiWECtx, params : UserRoleAddParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UserRole>> => {
	const validation = paramsValidation<UserRoleAddParams>( UserRoleAddSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { name, id, description, perms } = validation.data;

	/*=== f2c_start user_role_add ===*/

	if ( !sys?.skip_permissions_check ) {
		const user = await ctx.user();
		if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );
		// authorization is on the route gate (see index.ts)
	}

	try {
		const domain = sys?.domain || ( await ctx.user() )?.domain || '__no_domain';

		// internal / system calls (skip_permissions_check) may address a role in any domain,
		// regular callers can only touch roles belonging to their own domain
		const existingRole = id
			? await ctx.app.db.select().from( user_roles ).where(
				sys?.skip_permissions_check
					? eq( user_roles.id, id )
					: and( eq( user_roles.id, id ), eq( user_roles.domain, domain ) ),
			).get()
			: undefined;

		if ( id && !existingRole ) return responseError( 'Role not found', 404, 'ROLE_NOT_FOUND' );

		const duplicate = await ctx.app.db.select( { id: user_roles.id } ).from( user_roles ).where( and(
			eq( user_roles.domain, domain ),
			eq( user_roles.name, name ),
		) ).get();

		if ( duplicate && duplicate.id !== id ) return responseError( 'Role name already exists in the system for the specified domain', 400 );

		const rolePerms = perms !== undefined ? perms : ( existingRole?.perms ?? [] );
		const roleDescription = description !== undefined ? description : ( existingRole?.description ?? null );

		if ( existingRole ) {
			await ctx.app.db.update( user_roles ).set( {
				name,
				description: roleDescription,
				perms: rolePerms,
			} ).where( eq( user_roles.id, existingRole.id! ) ).run();

			const addedPerms = rolePerms.filter( ( p ) => !( existingRole.perms ?? [] ).includes( p ) );

			if ( addedPerms.length > 0 ) {
				const assignedUsers = await ctx.app.db.select().from( users ).where( eq( users.id_role, existingRole.id! ) ).all();

				for ( const assignedUser of assignedUsers ) {
					await ctx.app.db.update( users ).set( {
						perms: union_perms( assignedUser.perms, addedPerms ),
					} ).where( eq( users.id, assignedUser.id! ) ).run();
				}
			}
		} else {
			await ctx.app.db.insert( user_roles ).values( {
				id: mkid( 'urol' ),
				domain,
				name,
				description: roleDescription,
				perms: rolePerms,
			} ).run();
		}

		const savedRole = await ctx.app.db.select().from( user_roles ).where( and(
			eq( user_roles.domain, domain ),
			eq( user_roles.name, name ),
		) ).get();

		if ( !savedRole ) return responseError( 'Role creation failed', 500 );

		return responseSuccess( savedRole as any );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Database error: ${error.message}`, 500, 'DATABASE_ERROR' );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_role_add ===*/
};
