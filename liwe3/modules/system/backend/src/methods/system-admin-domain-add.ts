import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { SystemDomain } from '../types';

/**
 * Schema for Adds a new domain to the System.
 *
 * @property {string} code - the domain unique code (required)
 * @property {string} name - the domain name (required)
 * @property {[boolean]} visible - if the domain is visible or not [default: true]
 */
const SystemAdminDomainAddSchema = z.object( {
	code: z.string(),
	name: z.string(),
	visible: zodBoolean.optional(),
} );

/** Parameters for system_admin_domain_add */
export type SystemAdminDomainAddParams = z.infer<typeof SystemAdminDomainAddSchema>;

/*=== f2c_start system_admin_domain_add_headers ===*/
import { system_domains } from '../schema';
// Custom imports here
/*=== f2c_end system_admin_domain_add_headers ===*/

/**
 * Adds a new domain to the System.
 *
 * @permissions system.domain
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {SystemAdminDomainAddParams} params - Request parameters
 * @param {string} params.code - the domain unique code
 * @param {string} params.name - the domain name
 * @param {boolean} ?params.visible - if the domain is visible or not [default: true]
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<SystemDomain>>} Result object with success status and data or error details
 */
export const system_admin_domain_add = async ( ctx : LiWECtx, params : SystemAdminDomainAddParams, sys? : LiWESysParams ) : Promise<LiWEResponse<SystemDomain>> => {
	const validation = paramsValidation<SystemAdminDomainAddParams>( SystemAdminDomainAddSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { code, name, visible } = validation.data;

	/*=== f2c_start system_admin_domain_add ===*/

	try {
		// Generate a default code if not provided
		const domainCode = code || name?.toLowerCase().replace( /[^a-z0-9]/g, '-' ) || 'default';

		// Generate a default name if not provided
		const domainName = name || code || 'Default Domain';

		// Check if domain with this code already exists
		const existingDomain = await ctx.app.db
			.select( {
				code: system_domains.code,
			} )
			.from( system_domains )
			.where( eq( system_domains.code, domainCode ) )
			.get();

		if ( existingDomain ) {
			return responseError( 'Domain with this code already exists', 409, 'DOMAIN_EXISTS' );
		}

		// Insert the new domain
		const newDomain : SystemDomain = {
			code: domainCode,
			name: domainName,
			visible: visible ?? true,
			tiers_allocated: 0,
			total_max_tiers: 0,
		};

		await ctx.app.db.insert( system_domains ).values( newDomain as any );

		// Retrieve the created domain
		const createdDomain : SystemDomain | undefined = await ctx.app.db
			.select( {
				code: system_domains.code,
				name: system_domains.name,
				visible: system_domains.visible,
				tiers_allocated: system_domains.tiers_allocated,
				total_max_tiers: system_domains.total_max_tiers,
			} )
			.from( system_domains )
			.where( eq( system_domains.code, domainCode ) )
			.get();

		if ( !createdDomain ) return responseError( 'Failed to create domain', 500, 'CREATION_FAILED' );

		return responseSuccess( createdDomain );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
	/*=== f2c_end system_admin_domain_add ===*/
};
