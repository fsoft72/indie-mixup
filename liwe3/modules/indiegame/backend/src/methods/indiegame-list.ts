import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieGameCard } from '../types';

/**
 * Schema for Public catalog, visible games only, optional search by name
 *
 * @property {[string]} q - Search text on the name
 * @property {[number]} page - Page number, from 1
 * @property {[number]} limit - Page size, 1 to 100
 */
const IndiegameListSchema = z.object( {
	q: z.string().optional(),
	page: z.coerce.number().optional().default( 1 ),
	limit: z.coerce.number().optional().default( 20 ),
} );

/** Parameters for indiegame_list */
export type IndiegameListParams = z.infer<typeof IndiegameListSchema>;

/*=== f2c_start indiegame_list_headers ===*/

import { gameList } from '../lib/games';

/*=== f2c_end indiegame_list_headers ===*/

/**
 * Public catalog, visible games only, optional search by name
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameListParams} params - Request parameters
 * @param {string} ?params.q - Search text on the name
 * @param {number} ?params.page - Page number, from 1
 * @param {number} ?params.limit - Page size, 1 to 100
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieGameCard[]>>} Result object with success status and data or error details
 */
export const indiegame_list = async ( ctx : LiWECtx, params : IndiegameListParams, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieGameCard[]>> => {
	const validation = paramsValidation<IndiegameListParams>( IndiegameListSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { q, page, limit } = validation.data;

	/*=== f2c_start indiegame_list ===*/

	return gameList( ctx, q, page, limit );
	/*=== f2c_end indiegame_list ===*/
};
