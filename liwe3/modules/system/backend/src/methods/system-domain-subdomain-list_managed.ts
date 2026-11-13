import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { SystemDomainAdmin } from '../types';

/**
 * Schema for List all managed subdomains for the current user.
It is not possible to specify a subdomain, since it is taken by the user domain

- **1. Context:** Use the current user's domain: `user_domain_code = req.user.domain`
- **2. Database Query:** Query `COLL_SYSTEM_DOMAINS` for all records where:
  - (a) `code` equals `user_domain_code` (own domain), OR (b) `code` starts with `${user_domain_code}:` (direct and nested children). If `deep=false`, only return domains where `code` matches `${user_domain_code}:[^:]+$` (direct children only, no nested).
- **3. Return:** The list of matching domain objects.
 *
 * @property {[boolean]} deep - If list should return all codes
 */
const SystemDomainSubdomainListManagedSchema = z.object( {
	deep: zodBoolean.optional(),
} );

/** Parameters for system_domain_subdomain_list_managed */
export type SystemDomainSubdomainListManagedParams = z.infer<typeof SystemDomainSubdomainListManagedSchema>;

/*=== f2c_start system_domain_subdomain_list_managed_headers ===*/
import { system_domains } from '../schema';
/*=== f2c_end system_domain_subdomain_list_managed_headers ===*/

/**
 * List all managed subdomains for the current user.
 * It is not possible to specify a subdomain, since it is taken by the user domain
 *
 * - **1. Context:** Use the current user's domain: `user_domain_code = req.user.domain`
 * - **2. Database Query:** Query `COLL_SYSTEM_DOMAINS` for all records where:
 *   - (a) `code` equals `user_domain_code` (own domain), OR (b) `code` starts with `${user_domain_code}:` (direct and nested children). If `deep=false`, only return domains where `code` matches `${user_domain_code}:[^:]+$` (direct children only, no nested).
 * - **3. Return:** The list of matching domain objects.
 *
 * @permissions system.multi-tier
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {SystemDomainSubdomainListManagedParams} params - Request parameters
 * @param {boolean} ?params.deep - If list should return all codes
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<SystemDomainAdmin[]>>} Result object with success status and data or error details
 */
export const system_domain_subdomain_list_managed = async (
	ctx : LiWECtx,
	params : SystemDomainSubdomainListManagedParams,
	sys? : LiWESysParams,
) : Promise<LiWEResponse<SystemDomainAdmin[]>> => {
	const validation = paramsValidation<SystemDomainSubdomainListManagedParams>( SystemDomainSubdomainListManagedSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { deep } = validation.data;

	/*=== f2c_start system_domain_subdomain_list_managed ===*/
	const user = await ctx.user();

	if ( !user ) return responseError( 'User not authenticated', 401, 'NOT_AUTHENTICATED' );

	try {
		// Build query conditions
		const domains : SystemDomainAdmin[] = await ctx.app.db
			.select( {
				code: system_domains.code,
				name: system_domains.name,
				visible: system_domains.visible,
				total_max_tiers: system_domains.total_max_tiers,
				tiers_allocated: system_domains.tiers_allocated,
			} )
			.from( system_domains )
			.where(
				or(
					eq( system_domains.code, user.domain ?? '_no_dom' ),
					like( system_domains.code, user.domain ?? '_no_dom' + ':%' ),
				),
			);

		if ( !domains || domains.length === 0 ) return responseSuccess( [] );

		// TODO: Filter based on `deep` parameter

		return responseSuccess( domains );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
	/*=== f2c_end system_domain_subdomain_list_managed ===*/
};
