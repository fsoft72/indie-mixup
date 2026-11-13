import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieGameReport } from '../types';

/**
 * Schema for Mark a content report as closed
 *
 * @property {string} id_report - Report id (required)
 */
const IndiegameAdminReportCloseSchema = z.object( {
	id_report: z.string(),
} );

/** Parameters for indiegame_admin_report_close */
export type IndiegameAdminReportCloseParams = z.infer<typeof IndiegameAdminReportCloseSchema>;

/*=== f2c_start indiegame_admin_report_close_headers ===*/

import { reportClose } from '../lib/moderation';

/*=== f2c_end indiegame_admin_report_close_headers ===*/

/**
 * Mark a content report as closed
 *
 * @permissions indiegame.moderate
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameAdminReportCloseParams} params - Request parameters
 * @param {string} params.id_report - Report id
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieGameReport>>} Result object with success status and data or error details
 */
export const indiegame_admin_report_close = async ( ctx : LiWECtx, params : IndiegameAdminReportCloseParams, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieGameReport>> => {
	const validation = paramsValidation<IndiegameAdminReportCloseParams>( IndiegameAdminReportCloseSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_report } = validation.data;

	/*=== f2c_start indiegame_admin_report_close ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, ERR_UNAUTHORIZED );

	return reportClose( ctx, user, id_report );
	/*=== f2c_end indiegame_admin_report_close ===*/
};
