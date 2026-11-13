import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { SystemConfigGroup } from '../types';

/**
 * Schema for Stores overrides for the given dotted keys (all or nothing: an unlisted key or a value of the wrong type rejects the whole request) and returns the refreshed groups.
 *
 * @property {string} values - Object with dotted config keys as keys and the new values (required)
 */
const SystemAdminConfigSetSchema = z.object( {
	values: z.any(),
} );

/** Parameters for system_admin_config_set */
export type SystemAdminConfigSetParams = z.infer<typeof SystemAdminConfigSetSchema>;

/*=== f2c_start system_admin_config_set_headers ===*/

import { systemConfigGroups, systemConfigValidate } from '../config-fields';
import { systemConfigOverridesRefresh } from '../config-overrides';
import { system_config_overrides } from '../schema';

/*=== f2c_end system_admin_config_set_headers ===*/

/**
 * Stores overrides for the given dotted keys (all or nothing: an unlisted key or a value of the wrong type rejects the whole request) and returns the refreshed groups.
 *
 * @permissions system.admin
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {SystemAdminConfigSetParams} params - Request parameters
 * @param {string} params.values - Object with dotted config keys as keys and the new values
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<SystemConfigGroup[]>>} Result object with success status and data or error details
 */
export const system_admin_config_set = async ( ctx : LiWECtx, params : SystemAdminConfigSetParams, sys? : LiWESysParams ) : Promise<LiWEResponse<SystemConfigGroup[]>> => {
	const validation = paramsValidation<SystemAdminConfigSetParams>( SystemAdminConfigSetSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { values } = validation.data;

	/*=== f2c_start system_admin_config_set ===*/

	const check = systemConfigValidate( values );
	if ( !check.ok ) return responseError( check.error, 400, 'VALIDATION_ERROR' );

	try {
		// One batch, so a failure never leaves only some of the keys saved
		const writes = Object.entries( check.values ).map( ( [ key, value ] ) =>
			ctx.app.db.insert( system_config_overrides ).values( { key, value } ).onConflictDoUpdate( { target: system_config_overrides.key, set: { value } } )
		);
		if ( writes.length > 0 ) await ctx.app.db.batch( writes as any );

		// The write is done: if the re-read fails, say so instead of answering with the old values
		if ( !await systemConfigOverridesRefresh( ctx.app, { force: true } ) )
			return responseError( 'The change was saved but could not be applied yet: it will be applied shortly', 500, 'REFRESH_ERROR' );

		return responseSuccess( systemConfigGroups( ctx.app.cfg ) );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}

	/*=== f2c_end system_admin_config_set ===*/
};
