import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieAdminReports } from '../types';

/*=== f2c_start indiegame_admin_reports_headers ===*/

import { adminReports } from '../lib/moderation';
/*=== f2c_end indiegame_admin_reports_headers ===*/

/**
 * Open content reports and contested remix reports
 *
 * @permissions indiegame.moderate
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieAdminReports>>} Result object with success status and data or error details
 */
export const indiegame_admin_reports = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieAdminReports>> => {
	/*=== f2c_start indiegame_admin_reports ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, ERR_UNAUTHORIZED );

	return adminReports( ctx, user );
	/*=== f2c_end indiegame_admin_reports ===*/
};
