import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Allows subdomain admins to assign or remove `multi-tier` user permission to a user.
If `multi-tier` is set to a user, he/she will be able to set new sub tiers.

- **1. Authorization:** Ensure `req.user` has `system.multi-tier.create-sub`
- **2. Get Target User:** Retrieve the user with `id_user`
- **3. Scope Check:** Verify that the target user's `domain` field either equals `req.user.domain` or starts with `req.user.domain:` (is in a subdomain).
- **4. Update User:** Set the target user's `perms` array: `multi-tier` maps to `["system.multi-tier.create-sub"]`, and `user` maps to an empty array `[]`
 *
 * @property {string} id_user - The user to assign role to (required)
 * @property {string} role - The user role (`multi-tier | user`) (required)
 */
const SystemDomainUserAssignRoleSchema = z.object( {
	id_user: z.string(),
	role: z.string(),
} );

/** Parameters for system_domain_user_assign_role */
export type SystemDomainUserAssignRoleParams = z.infer<typeof SystemDomainUserAssignRoleSchema>;

/*=== f2c_start system_domain_user_assign_role_headers ===*/
import { SYSTEM_PERM_MULTI_TIER_CREATE_SUB, SYSTEM_PERM_ROLE_CHANGE } from '../perms';
import { has_perms, liwe_event_emit } from '@backend/liwe3';
import { SYSTEM_EVENT_USER_PERM_ADD, SYSTEM_EVENT_USER_PERM_DEL } from '../events';
/*=== f2c_end system_domain_user_assign_role_headers ===*/

/**
 * Allows subdomain admins to assign or remove `multi-tier` user permission to a user.
 * If `multi-tier` is set to a user, he/she will be able to set new sub tiers.
 *
 * - **1. Authorization:** Ensure `req.user` has `system.multi-tier.create-sub`
 * - **2. Get Target User:** Retrieve the user with `id_user`
 * - **3. Scope Check:** Verify that the target user's `domain` field either equals `req.user.domain` or starts with `req.user.domain:` (is in a subdomain).
 * - **4. Update User:** Set the target user's `perms` array: `multi-tier` maps to `["system.multi-tier.create-sub"]`, and `user` maps to an empty array `[]`
 *
 * @permissions system.multi-tier.create-sub
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {SystemDomainUserAssignRoleParams} params - Request parameters
 * @param {string} params.id_user - The user to assign role to
 * @param {string} params.role - The user role (`multi-tier | user`)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const system_domain_user_assign_role = async ( ctx : LiWECtx, params : SystemDomainUserAssignRoleParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<SystemDomainUserAssignRoleParams>( SystemDomainUserAssignRoleSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_user, role } = validation.data;

	/*=== f2c_start system_domain_user_assign_role ===*/
	if ( await has_perms( ctx, [ SYSTEM_PERM_ROLE_CHANGE ] ) === false ) return responseError( 'You cannot change user role', 403, 'UNAUTHORIZED' );

	if ( role !== 'multi-tier' && role !== 'user' ) return responseError( 'Invalid role specified', 400, 'VALIDATION_ERROR' );

	const perm = SYSTEM_PERM_MULTI_TIER_CREATE_SUB;
	const evt = role == 'multi-tier' ? SYSTEM_EVENT_USER_PERM_ADD : SYSTEM_EVENT_USER_PERM_DEL;

	await liwe_event_emit( ctx, evt, { id_user, perm } );

	return responseSuccess( true );
	/*=== f2c_end system_domain_user_assign_role ===*/
};
