import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieGameCard } from '../types';

/*=== f2c_start indiegame_mine_headers ===*/

import { gamesOfUser } from '../lib/games';

/*=== f2c_end indiegame_mine_headers ===*/

/**
 * Games published by the caller
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieGameCard[]>>} Result object with success status and data or error details
 */
export const indiegame_mine = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieGameCard[]>> => {
	/*=== f2c_start indiegame_mine ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, ERR_UNAUTHORIZED );

	return gamesOfUser( ctx, user );
	/*=== f2c_end indiegame_mine ===*/
};
