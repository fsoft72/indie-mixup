import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieGameDetail } from '../types';

/**
 * Schema for Game page with ancestors and direct remixes
 *
 * @property {string} id - Game id (required)
 */
const IndiegameGetSchema = z.object( {
	id: z.string(),
} );

/** Parameters for indiegame_get */
export type IndiegameGetParams = z.infer<typeof IndiegameGetSchema>;

/*=== f2c_start indiegame_get_headers ===*/

import { gameGet } from '../lib/games';

/*=== f2c_end indiegame_get_headers ===*/

/**
 * Game page with ancestors and direct remixes
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameGetParams} params - Request parameters
 * @param {string} params.id - Game id
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieGameDetail>>} Result object with success status and data or error details
 */
export const indiegame_get = async ( ctx : LiWECtx, params : IndiegameGetParams, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieGameDetail>> => {
	const validation = paramsValidation<IndiegameGetParams>( IndiegameGetSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id } = validation.data;

	/*=== f2c_start indiegame_get ===*/

	return gameGet( ctx, id );
	/*=== f2c_end indiegame_get ===*/
};
