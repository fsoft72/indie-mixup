import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { SystemConfigGroup } from '../types';

/*=== f2c_start system_admin_config_fields_headers ===*/

import { systemConfigGroups } from '../config-fields';

/*=== f2c_end system_admin_config_fields_headers ===*/

/**
 * Returns the editable config groups in FormCreator format, with the current effective value of each field as its default. The list of editable keys is fixed in the backend.
 *
 * @permissions system.admin
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<SystemConfigGroup[]>>} Result object with success status and data or error details
 */
export const system_admin_config_fields = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<SystemConfigGroup[]>> => {
	/*=== f2c_start system_admin_config_fields ===*/

	// ctx.app.cfg already includes the overrides (the module middleware refreshes them)
	return responseSuccess( systemConfigGroups( ctx.app.cfg ) );

	/*=== f2c_end system_admin_config_fields ===*/
};
