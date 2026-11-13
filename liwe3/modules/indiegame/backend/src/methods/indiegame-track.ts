import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieGameTrackResult } from '../types';

/**
 * Schema for Records one view or download per visitor, game, kind and UTC day
 *
 * @property {string} id_game - Game id (required)
 * @property {string} kind - view or download (required)
 */
const IndiegameTrackSchema = z.object( {
	id_game: z.string(),
	kind: z.string(),
} );

/** Parameters for indiegame_track */
export type IndiegameTrackParams = z.infer<typeof IndiegameTrackSchema>;

/*=== f2c_start indiegame_track_headers ===*/

import { trackGame } from '../lib/track';

/*=== f2c_end indiegame_track_headers ===*/

/**
 * Records one view or download per visitor, game, kind and UTC day
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameTrackParams} params - Request parameters
 * @param {string} params.id_game - Game id
 * @param {string} params.kind - view or download
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieGameTrackResult>>} Result object with success status and data or error details
 */
export const indiegame_track = async ( ctx : LiWECtx, params : IndiegameTrackParams, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieGameTrackResult>> => {
	const validation = paramsValidation<IndiegameTrackParams>( IndiegameTrackSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_game, kind } = validation.data;

	/*=== f2c_start indiegame_track ===*/

	return trackGame( ctx, id_game, kind );
	/*=== f2c_end indiegame_track ===*/
};
