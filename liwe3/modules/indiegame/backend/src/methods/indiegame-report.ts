import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieGameReport } from '../types';

/**
 * Schema for Report inappropriate content
 *
 * @property {string} id_game - Game id (required)
 * @property {string} reason - Reason (required)
 */
const IndiegameReportSchema = z.object( {
	id_game: z.string(),
	reason: z.string(),
} );

/** Parameters for indiegame_report */
export type IndiegameReportParams = z.infer<typeof IndiegameReportSchema>;

/*=== f2c_start indiegame_report_headers ===*/

import { gameReport } from '../lib/moderation';

/*=== f2c_end indiegame_report_headers ===*/

/**
 * Report inappropriate content
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameReportParams} params - Request parameters
 * @param {string} params.id_game - Game id
 * @param {string} params.reason - Reason
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieGameReport>>} Result object with success status and data or error details
 */
export const indiegame_report = async ( ctx : LiWECtx, params : IndiegameReportParams, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieGameReport>> => {
	const validation = paramsValidation<IndiegameReportParams>( IndiegameReportSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_game, reason } = validation.data;

	/*=== f2c_start indiegame_report ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, ERR_UNAUTHORIZED );

	return gameReport( ctx, user, id_game, reason );
	/*=== f2c_end indiegame_report ===*/
};
