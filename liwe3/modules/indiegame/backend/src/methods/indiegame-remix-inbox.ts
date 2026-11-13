import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieRemixReport } from '../types';

/*=== f2c_start indiegame_remix_inbox_headers ===*/

import { remixInbox } from '../lib/remix';
/*=== f2c_end indiegame_remix_inbox_headers ===*/

/**
 * Remix reports about the games of the caller
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieRemixReport[]>>} Result object with success status and data or error details
 */
export const indiegame_remix_inbox = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieRemixReport[]>> => {
	/*=== f2c_start indiegame_remix_inbox ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, ERR_UNAUTHORIZED );

	return remixInbox( ctx, user );
	/*=== f2c_end indiegame_remix_inbox ===*/
};
