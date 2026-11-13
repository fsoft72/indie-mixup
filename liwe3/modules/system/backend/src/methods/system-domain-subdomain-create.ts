import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { SystemDomain } from '../types';

/**
 * Schema for - **1. Authentication:** Check for `domain.multi-tier.create_sub` in `req.user.perms`.
- **2. Get Parent Domain:** Parent domain is `req.user.domain`.
- **3. Tier Validation:** Validate that `tiers_allocated <= (parent.total_max_tiers - parent.tiers_allocated)`.
- **4. Domain Creation:** Generate unique code segment:
  - form `new_domain_code` as `req.user.domain:generated_code`
  - insert new domain with `total_max_tiers: tiers_allocated`, `tiers_allocated: 0`, `name: name`
- **5. Update Parent:** Update parent domain's `tiers_allocated += tiers_allocated`.
- **6. User Auto-Provisioning:** Create new user:
  - Username: `${new_domain_code}-admin`
  - Email: `${new_domain_code}-admin@example.com`
  - Domain: `new_domain_code`
  - Permissions: `["domain.multi-tier.create-sub"]`
  - Password: `sha512(mkid('pwd'))`
  - Enabled: `true`
  - Language: `req.user.language`
 *
 * @property {string} name - Sub domain name (required)
 * @property {number} tiers_allocated - Number of tiers that can be allocated (required)
 */
const SystemDomainSubdomainCreateSchema = z.object( {
	name: z.string(),
	tiers_allocated: z.coerce.number(),
} );

/** Parameters for system_domain_subdomain_create */
export type SystemDomainSubdomainCreateParams = z.infer<typeof SystemDomainSubdomainCreateSchema>;

/*=== f2c_start system_domain_subdomain_create_headers ===*/
import { type LiWEUser, mkid } from '@backend/liwe3';
import { system_domains } from '../schema';
import { SYSTEM_PERM_MULTI_TIER_CREATE_SUB } from '../perms';
import { generate_domain_segment_code } from './utils';
import { liwe_event_emit } from '@backend/liwe3';
import { SYSTEM_EVENT_SUBDOMAIN_CREATE } from '../events';
/*=== f2c_end system_domain_subdomain_create_headers ===*/

/**
 * - **1. Authentication:** Check for `domain.multi-tier.create_sub` in `req.user.perms`.
 * - **2. Get Parent Domain:** Parent domain is `req.user.domain`.
 * - **3. Tier Validation:** Validate that `tiers_allocated <= (parent.total_max_tiers - parent.tiers_allocated)`.
 * - **4. Domain Creation:** Generate unique code segment:
 *   - form `new_domain_code` as `req.user.domain:generated_code`
 *   - insert new domain with `total_max_tiers: tiers_allocated`, `tiers_allocated: 0`, `name: name`
 * - **5. Update Parent:** Update parent domain's `tiers_allocated += tiers_allocated`.
 * - **6. User Auto-Provisioning:** Create new user:
 *   - Username: `${new_domain_code}-admin`
 *   - Email: `${new_domain_code}-admin@example.com`
 *   - Domain: `new_domain_code`
 *   - Permissions: `["domain.multi-tier.create-sub"]`
 *   - Password: `sha512(mkid('pwd'))`
 *   - Enabled: `true`
 *   - Language: `req.user.language`
 *
 * @permissions system.multi-tier.create-sub
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {SystemDomainSubdomainCreateParams} params - Request parameters
 * @param {string} params.name - Sub domain name
 * @param {number} params.tiers_allocated - Number of tiers that can be allocated
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<SystemDomain>>} Result object with success status and data or error details
 */
export const system_domain_subdomain_create = async ( ctx : LiWECtx, params : SystemDomainSubdomainCreateParams, sys? : LiWESysParams ) : Promise<LiWEResponse<SystemDomain>> => {
	const validation = paramsValidation<SystemDomainSubdomainCreateParams>( SystemDomainSubdomainCreateSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { name, tiers_allocated } = validation.data;

	/*=== f2c_start system_domain_subdomain_create ===*/
	let parent_domain_code = '';
	let user : LiWEUser = {} as LiWEUser;
	const systemDomain = ctx.app.cfg?.system?.domain ?? '_';

	if ( !sys?.skip_permissions_check ) {
		// authorization is on the route gate (see index.ts)

		// get the current user domain (the parent domain for the new one being created)
		user = ( await ctx.user() ) as LiWEUser;
		if ( !user ) return responseError( 'User not authenticated', 401, 'NOT_AUTHENTICATED' );
	}

	if ( !sys?.domain ) {
		user = ( await ctx.user() ) as LiWEUser;
		if ( !user ) return responseError( 'User not authenticated', 401, 'NOT_AUTHENTICATED' );
		parent_domain_code = user.domain || '_no_domain';
	} else {
		parent_domain_code = sys.domain;
	}

	const parent_domain : SystemDomain | undefined = await ctx.app.db
		.select( {
			code: system_domains.code,
			name: system_domains.name,
			visible: system_domains.visible,
			total_max_tiers: system_domains.total_max_tiers,
			tiers_allocated: system_domains.tiers_allocated,
		} )
		.from( system_domains )
		.where( eq( system_domains.code, parent_domain_code ) )
		.get();

	if ( !parent_domain ) return responseError( 'Parent domain not found', 404, 'PARENT_DOMAIN_NOT_FOUND' );

	// 3. Tier Validation (only if it is not the system domain, which has unlimited tiers)
	if ( ( parent_domain.code != systemDomain ) && tiers_allocated > ( parent_domain.total_max_tiers - parent_domain.tiers_allocated ) )
		return responseError( 'Not enough available tiers in parent domain', 400, 'TIERS_ALLOCATION_EXCEEDED' );

	// 4. Domain Creation
	const new_domain_code = await generate_domain_segment_code( ctx.app, user, parent_domain.code );
	const newDomain : SystemDomain = {
		code: new_domain_code,
		name,
		total_max_tiers: tiers_allocated,
		tiers_allocated: 0,
		visible: true,
	};

	const insert_result = await ctx.app.db.insert( system_domains ).values( newDomain as any ).returning();

	if ( insert_result.length === 0 ) return responseError( 'Failed to create sub-domain', 500, 'INSERT_FAILED' );

	// 5. Update Parent
	const updated_tiers_allocated = parent_domain.tiers_allocated + tiers_allocated;
	await ctx.app.db.update( system_domains )
		.set( { tiers_allocated: updated_tiers_allocated } )
		.where( eq( system_domains.code, parent_domain.code ) );

	// 6. User Auto-Provisioning
	const new_user = {
		username: `${new_domain_code}-admin`,
		email: `${new_domain_code}-admin@example.com`,
		domain: new_domain_code,
		perms: [ SYSTEM_PERM_MULTI_TIER_CREATE_SUB ],
		password: `sha512(${mkid( 'pwd' )})`,
		enabled: false,
		language: 'en_US',
		email_verified: false,
	} as any; // Adjust type as needed

	// user creation will be done via event listeners or other mechanisms
	await liwe_event_emit( ctx, 'user.call.user.add', { domain: newDomain, user: new_user } );

	// let the other modules prepare the new domain (e.g. kanban creates its default workspace)
	await liwe_event_emit( ctx, SYSTEM_EVENT_SUBDOMAIN_CREATE, { code: new_domain_code } );

	return responseSuccess( newDomain );
	/*=== f2c_end system_domain_subdomain_create ===*/
};
