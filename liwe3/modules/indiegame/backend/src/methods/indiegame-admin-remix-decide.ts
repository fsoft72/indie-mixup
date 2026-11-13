import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieRemixReport } from '../types';

/**
 * Schema for Confirm or reject a contested remix report
 *
 * @property {string} id_report - Report id (required)
 * @property {boolean} confirm - True to confirm the remix (required)
 */
const IndiegameAdminRemixDecideSchema = z.object( {
	id_report: z.string(),
	confirm: zodBoolean,
} );

/** Parameters for indiegame_admin_remix_decide */
export type IndiegameAdminRemixDecideParams = z.infer<typeof IndiegameAdminRemixDecideSchema>;

/*=== f2c_start indiegame_admin_remix_decide_headers ===*/

import { ERR_VALIDATION } from '@backend/liwe3';
import { remixDecide } from '../lib/remix';
/*=== f2c_end indiegame_admin_remix_decide_headers ===*/

/**
 * Confirm or reject a contested remix report
 *
 * @permissions indiegame.moderate
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameAdminRemixDecideParams} params - Request parameters
 * @param {string} params.id_report - Report id
 * @param {boolean} params.confirm - True to confirm the remix
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieRemixReport>>} Result object with success status and data or error details
 */
export const indiegame_admin_remix_decide = async ( ctx : LiWECtx, params : IndiegameAdminRemixDecideParams, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieRemixReport>> => {
	const validation = paramsValidation<IndiegameAdminRemixDecideParams>( IndiegameAdminRemixDecideSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_report, confirm } = validation.data;

	/*=== f2c_start indiegame_admin_remix_decide ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, ERR_UNAUTHORIZED );
	if ( confirm === null ) return responseError( 'confirm is required', 400, ERR_VALIDATION );

	return remixDecide( ctx, user, id_report, confirm );
	/*=== f2c_end indiegame_admin_remix_decide ===*/
};
