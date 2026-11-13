import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieRemixReport } from '../types';

/**
 * Schema for The author of a game reports another game as an undeclared remix
 *
 * @property {string} id_game - Reported game (required)
 * @property {string} id_original - Your original game (required)
 */
const IndiegameRemixReportSchema = z.object( {
	id_game: z.string(),
	id_original: z.string(),
} );

/** Parameters for indiegame_remix_report */
export type IndiegameRemixReportParams = z.infer<typeof IndiegameRemixReportSchema>;

/*=== f2c_start indiegame_remix_report_headers ===*/

import { remixReport } from '../lib/remix';
/*=== f2c_end indiegame_remix_report_headers ===*/

/**
 * The author of a game reports another game as an undeclared remix
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameRemixReportParams} params - Request parameters
 * @param {string} params.id_game - Reported game
 * @param {string} params.id_original - Your original game
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieRemixReport>>} Result object with success status and data or error details
 */
export const indiegame_remix_report = async ( ctx : LiWECtx, params : IndiegameRemixReportParams, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieRemixReport>> => {
	const validation = paramsValidation<IndiegameRemixReportParams>( IndiegameRemixReportSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_game, id_original } = validation.data;

	/*=== f2c_start indiegame_remix_report ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, ERR_UNAUTHORIZED );

	return remixReport( ctx, user, id_game, id_original );
	/*=== f2c_end indiegame_remix_report ===*/
};
