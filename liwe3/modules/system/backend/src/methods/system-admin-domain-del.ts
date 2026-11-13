import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Delete a domain from the system. You must specify the domain `code`.

1. **Determine Children:** Find all domains where `code` starts with `deleted_domain_code:`.

2. **Cascade Delete:** Delete all child domains recursively **without confirmation**.

3. **User Deletion:** Delete all users where `user.domain` equals the deleted domain code or any deleted child domain code **without confirmation**.

4. **Parent Update:**

   - Determine parent domain using `get_parent_domain_code(deleted_domain_code)`
   - If parent exists, update parent's `tiers_allocated` by subtracting the deleted domain's `total_max_tiers`

5. **Event Chain:**
  - The system `SYSTEM_EVENT_DOMAIN_DEL` event is triggered with domain full `code`
  - The standard `USER_EVENT_DELETE` event should be triggered for each user to allow other modules to clean up related data.

 *
 * @property {string} code - the domain unique code (required)
 */
const SystemAdminDomainDelSchema = z.object( {
	code: z.string(),
} );

/** Parameters for system_admin_domain_del */
export type SystemAdminDomainDelParams = z.infer<typeof SystemAdminDomainDelSchema>;

/*=== f2c_start system_admin_domain_del_headers ===*/
import { system_domains } from '../schema';
import { liwe_event_emit } from '@backend/liwe3';
import { SYSTEM_PERMISSIONS } from '../perms';
import { SYSTEM_EVENT_DOMAIN_DELETE } from '../events';

// Custom imports here
/*=== f2c_end system_admin_domain_del_headers ===*/

/**
 * Delete a domain from the system. You must specify the domain `code`.
 *
 * 1. **Determine Children:** Find all domains where `code` starts with `deleted_domain_code:`.
 *
 * 2. **Cascade Delete:** Delete all child domains recursively **without confirmation**.
 *
 * 3. **User Deletion:** Delete all users where `user.domain` equals the deleted domain code or any deleted child domain code **without confirmation**.
 *
 * 4. **Parent Update:**
 *
 *    - Determine parent domain using `get_parent_domain_code(deleted_domain_code)`
 *    - If parent exists, update parent's `tiers_allocated` by subtracting the deleted domain's `total_max_tiers`
 *
 * 5. **Event Chain:**
 *   - The system `SYSTEM_EVENT_DOMAIN_DEL` event is triggered with domain full `code`
 *   - The standard `USER_EVENT_DELETE` event should be triggered for each user to allow other modules to clean up related data.
 *
 * @permissions system.domain
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {SystemAdminDomainDelParams} params - Request parameters
 * @param {string} params.code - the domain unique code
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const system_admin_domain_del = async ( ctx : LiWECtx, params : SystemAdminDomainDelParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<SystemAdminDomainDelParams>( SystemAdminDomainDelSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { code } = validation.data;

	/*=== f2c_start system_admin_domain_del ===*/
	try {
		// authorization is on the route gate (see index.ts)

		// Check if domain exists before attempting deletion
		const existingDomain = await ctx.app.db
			.select( {
				code: system_domains.code,
			} )
			.from( system_domains )
			.where( eq( system_domains.code, code ) )
			.get();

		if ( !existingDomain ) return responseError( 'Domain not found', 404, 'DOMAIN_NOT_FOUND' );

		// Delete the domain
		const deleteResult = await ctx.app.db
			.delete( system_domains )
			.where( eq( system_domains.code, code ) );

		await liwe_event_emit( ctx, SYSTEM_EVENT_DOMAIN_DELETE, { code } );

		// Return success confirmation message
		return responseSuccess( true );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
	/*=== f2c_end system_admin_domain_del ===*/
};
