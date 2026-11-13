import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { SystemConfigGroup } from '../types';

/**
 * Schema for Removes the overrides of the given keys, so their value falls back to config.json, and returns the refreshed groups.
 *
 * @property {string[]} keys - Dotted config keys to reset (required)
 */
const SystemAdminConfigResetSchema = z.object( {
	keys: z.string().array(),
} );

/** Parameters for system_admin_config_reset */
export type SystemAdminConfigResetParams = z.infer<typeof SystemAdminConfigResetSchema>;

/*=== f2c_start system_admin_config_reset_headers ===*/

import { inArray } from 'drizzle-orm';
import { systemConfigGroups } from '../config-fields';
import { systemConfigOverridesRefresh } from '../config-overrides';
import { system_config_overrides } from '../schema';

/*=== f2c_end system_admin_config_reset_headers ===*/

/**
 * Removes the overrides of the given keys, so their value falls back to config.json, and returns the refreshed groups.
 *
 * @permissions system.admin
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {SystemAdminConfigResetParams} params - Request parameters
 * @param {string[]} params.keys - Dotted config keys to reset
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<SystemConfigGroup[]>>} Result object with success status and data or error details
 */
export const system_admin_config_reset = async ( ctx : LiWECtx, params : SystemAdminConfigResetParams, sys? : LiWESysParams ) : Promise<LiWEResponse<SystemConfigGroup[]>> => {
	const validation = paramsValidation<SystemAdminConfigResetParams>( SystemAdminConfigResetSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { keys } = validation.data;

	/*=== f2c_start system_admin_config_reset ===*/

	try {
		if ( keys.length > 0 ) await ctx.app.db.delete( system_config_overrides ).where( inArray( system_config_overrides.key, keys ) );

		// The write is done: if the re-read fails, say so instead of answering with the old values
		if ( !await systemConfigOverridesRefresh( ctx.app, { force: true } ) )
			return responseError( 'The reset was done but could not be applied yet: it will be applied shortly', 500, 'REFRESH_ERROR' );

		return responseSuccess( systemConfigGroups( ctx.app.cfg ) );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}

	/*=== f2c_end system_admin_config_reset ===*/
};
