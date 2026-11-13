import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { SystemDomain } from '../types';

/*=== f2c_start system_domains_list_headers ===*/
import { system_domains } from '../schema';
/*=== f2c_end system_domains_list_headers ===*/

/**
 * List all visible domains
 *
 * @permissions system.domain
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<SystemDomain[]>>} Result object with success status and data or error details
 */
export const system_domains_list = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<SystemDomain[]>> => {
	/*=== f2c_start system_domains_list ===*/
	try {
		// Get all visible domains
		const result : SystemDomain[] = await ctx.app.db
			.select( {
				code: system_domains.code,
				name: system_domains.name,
				visible: system_domains.visible,
				total_max_tiers: system_domains.total_max_tiers,
				tiers_allocated: system_domains.tiers_allocated,
			} )
			.from( system_domains )
			.where( eq( system_domains.visible, true ) );

		return responseSuccess( result );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
	/*=== f2c_end system_domains_list ===*/
};
