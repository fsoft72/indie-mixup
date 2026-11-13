import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Soft delete of one of your games
 *
 * @property {string} id - Game id (required)
 */
const IndiegameDelSchema = z.object( {
	id: z.string(),
} );

/** Parameters for indiegame_del */
export type IndiegameDelParams = z.infer<typeof IndiegameDelSchema>;

/*=== f2c_start indiegame_del_headers ===*/

import { gameDelete } from '../lib/game-add';

/*=== f2c_end indiegame_del_headers ===*/

/**
 * Soft delete of one of your games
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameDelParams} params - Request parameters
 * @param {string} params.id - Game id
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const indiegame_del = async ( ctx : LiWECtx, params : IndiegameDelParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<IndiegameDelParams>( IndiegameDelSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id } = validation.data;

	/*=== f2c_start indiegame_del ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, ERR_UNAUTHORIZED );

	return gameDelete( ctx, user, id );
	/*=== f2c_end indiegame_del ===*/
};
