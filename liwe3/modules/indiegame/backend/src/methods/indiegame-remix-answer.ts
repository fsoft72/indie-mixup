import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieRemixReport } from '../types';

/**
 * Schema for The author of the reported game accepts or contests
 *
 * @property {string} id_report - Report id (required)
 * @property {boolean} accept - True to accept, false to contest (required)
 */
const IndiegameRemixAnswerSchema = z.object( {
	id_report: z.string(),
	accept: zodBoolean,
} );

/** Parameters for indiegame_remix_answer */
export type IndiegameRemixAnswerParams = z.infer<typeof IndiegameRemixAnswerSchema>;

/*=== f2c_start indiegame_remix_answer_headers ===*/

import { ERR_VALIDATION } from '@backend/liwe3';
import { remixAnswer } from '../lib/remix';

/*=== f2c_end indiegame_remix_answer_headers ===*/

/**
 * The author of the reported game accepts or contests
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameRemixAnswerParams} params - Request parameters
 * @param {string} params.id_report - Report id
 * @param {boolean} params.accept - True to accept, false to contest
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieRemixReport>>} Result object with success status and data or error details
 */
export const indiegame_remix_answer = async ( ctx : LiWECtx, params : IndiegameRemixAnswerParams, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieRemixReport>> => {
	const validation = paramsValidation<IndiegameRemixAnswerParams>( IndiegameRemixAnswerSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_report, accept } = validation.data;

	/*=== f2c_start indiegame_remix_answer ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, ERR_UNAUTHORIZED );
	if ( accept === null ) return responseError( 'accept is required', 400, ERR_VALIDATION );

	return remixAnswer( ctx, user, id_report, accept );
	/*=== f2c_end indiegame_remix_answer ===*/
};
