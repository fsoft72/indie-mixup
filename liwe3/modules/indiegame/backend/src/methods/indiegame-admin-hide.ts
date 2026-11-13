import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieGameCard } from '../types';

/**
 * Schema for Moderators hide a game from catalog and rankings
 *
 * @property {string} id - Game id (required)
 * @property {boolean} hidden - True to hide, false to show (required)
 */
const IndiegameAdminHideSchema = z.object( {
	id: z.string(),
	hidden: zodBoolean,
} );

/** Parameters for indiegame_admin_hide */
export type IndiegameAdminHideParams = z.infer<typeof IndiegameAdminHideSchema>;

/*=== f2c_start indiegame_admin_hide_headers ===*/

import { ERR_VALIDATION } from '@backend/liwe3';
import { gameHide } from '../lib/moderation';
/*=== f2c_end indiegame_admin_hide_headers ===*/

/**
 * Moderators hide a game from catalog and rankings
 *
 * @permissions indiegame.moderate
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameAdminHideParams} params - Request parameters
 * @param {string} params.id - Game id
 * @param {boolean} params.hidden - True to hide, false to show
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieGameCard>>} Result object with success status and data or error details
 */
export const indiegame_admin_hide = async ( ctx : LiWECtx, params : IndiegameAdminHideParams, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieGameCard>> => {
	const validation = paramsValidation<IndiegameAdminHideParams>( IndiegameAdminHideSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id, hidden } = validation.data;

	/*=== f2c_start indiegame_admin_hide ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, ERR_UNAUTHORIZED );
	if ( hidden === null ) return responseError( 'hidden is required', 400, ERR_VALIDATION );

	return gameHide( ctx, user, id, hidden );
	/*=== f2c_end indiegame_admin_hide ===*/
};
