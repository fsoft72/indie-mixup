import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/*=== f2c_start system_admin_permissions_list_headers ===*/
import { permissions_list_full } from '@backend/liwe3';
/*=== f2c_end system_admin_permissions_list_headers ===*/

/**
 * Returns all the permissions available in the System.
 * The list depends also on the user's permissions:
 * - If the user has `system.admin`, the endpoint will return **all permissions** available
 * - if the user doesn't have `system.admin` the endpoint will return **only the permissions the user already has**.
 *
 * Permissions are returned in an object with: `module name` as key and a string list of permissions available for that module.
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<any>>} Result object with success status and data or error details
 */
export const system_admin_permissions_list = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<any>> => {
	/*=== f2c_start system_admin_permissions_list ===*/
	return responseSuccess( permissions_list_full() );
	/*=== f2c_end system_admin_permissions_list ===*/
};
