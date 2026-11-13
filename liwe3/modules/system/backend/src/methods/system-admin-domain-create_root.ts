import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { SystemDomainAdmin } from '../types';

/**
 * Schema for Generate a new root multi-tier. Only the users with `system.admin` and domain set to `system` can create a root multi-tier.
The root multi-tier is a new tier code without any prefix.

1. Generate complete domain `code` using `generate_domain_segment_code()`.
2. Insert the domain with `tiers_allocated: 0`, and the provided `total_max_tiers`.
3. Must use the `system.admin` permission check and also check that current user domain is only `system`.
 *
 * @property {string} name - The new multi-tier name (required)
 * @property {number} total_max_tiers - How many sub-tiers this domain can create (required)
 * @property {string} code - The domain base code (required)
 */
const SystemAdminDomainCreateRootSchema = z.object( {
	name: z.string(),
	total_max_tiers: z.coerce.number().default( 0 ),
	code: z.string(),
} );

/** Parameters for system_admin_domain_create_root */
export type SystemAdminDomainCreateRootParams = z.infer<typeof SystemAdminDomainCreateRootSchema>;

/*=== f2c_start system_admin_domain_create_root_headers ===*/
import { SystemDomain } from '../types';
import { LiWEUser, liwe_event_emit, mkid, sha512 } from '@backend/liwe3';
import { system_domains } from '../schema';
import { SYSTEM_PERM_ADMIN } from '../perms';
import { SYSTEM_CALL_USER_ADD, SYSTEM_EVENT_DOMAIN_CREATE } from '../events';
/*=== f2c_end system_admin_domain_create_root_headers ===*/

/**
 * Generate a new root multi-tier. Only the users with `system.admin` and domain set to `system` can create a root multi-tier.
 * The root multi-tier is a new tier code without any prefix.
 *
 * 1. Generate complete domain `code` using `generate_domain_segment_code()`.
 * 2. Insert the domain with `tiers_allocated: 0`, and the provided `total_max_tiers`.
 * 3. Must use the `system.admin` permission check and also check that current user domain is only `system`.
 *
 * @permissions system.admin
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {SystemAdminDomainCreateRootParams} params - Request parameters
 * @param {string} params.name - The new multi-tier name
 * @param {number} params.total_max_tiers - How many sub-tiers this domain can create
 * @param {string} params.code - The domain base code
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<SystemDomainAdmin>>} Result object with success status and data or error details
 */
export const system_admin_domain_create_root = async (
	ctx : LiWECtx,
	params : SystemAdminDomainCreateRootParams,
	sys? : LiWESysParams,
) : Promise<LiWEResponse<SystemDomainAdmin>> => {
	const validation = paramsValidation<SystemAdminDomainCreateRootParams>( SystemAdminDomainCreateRootSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { name, total_max_tiers, code } = validation.data;

	/*=== f2c_start system_admin_domain_create_root ===*/
	if ( !sys?.skip_permissions_check ) {
		const user = await ctx.user();
		if ( !user ) return responseError( 'User not authenticated.', 401, 'NOT_AUTHENTICATED' );
		// the user *MUST* be in the `system` domain and have the `system.admin` permission
		if ( user.domain !== 'system' ) return responseError( "You don't have enough permissions to create root multi-tiers.", 403, 'FORBIDDEN' );

		// authorization is on the route gate (see index.ts)
	}

	// check if the provided code already exists
	const existing_domain = await ctx.app.db.select().from( system_domains ).where(
		eq( system_domains.code, code ),
	).limit( 1 );

	if ( existing_domain.length > 0 ) {
		if ( sys?.params?.returnExistingDomain ) return responseSuccess( existing_domain[0] as SystemDomainAdmin );
		return responseError( 'The provided domain code already exists.', 409, 'DOMAIN_EXISTS' );
	}

	const dom : SystemDomain = {
		code,
		name,
		tiers_allocated: 0,
		total_max_tiers,
		visible: true,
	};

	const insert_result = await ctx.app.db.insert( system_domains ).values( dom as any ).returning();

	if ( insert_result.length === 0 ) return responseError( 'Failed to create the new root multi-tier.', 500, 'INSERT_FAILED' );

	const u : any = {
		id: mkid( 'user' ),
		username: `admin@${code}`,
		email: `admin@${code}`,
		password: await sha512( mkid( 'pass' ) ),
		enabled: true,
		name: `admin@${code}`,
		lastname: `admin@${code}`,
		domain: code,
		perms: [ SYSTEM_PERM_ADMIN ],
	};

	await liwe_event_emit( ctx, 'user.call.user.add', { user: u } );

	// let the other modules prepare the new domain (e.g. kanban creates its default workspace)
	await liwe_event_emit( ctx, SYSTEM_EVENT_DOMAIN_CREATE, { code } );

	return responseSuccess( insert_result[0] as SystemDomainAdmin );
	/*=== f2c_end system_admin_domain_create_root ===*/
};
