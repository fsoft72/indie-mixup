import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieGameDetail } from '../types';

/**
 * Schema for Creates a game (no id) or edits one of your games (id)
 *
 * @property {[string]} id - Game id, omitted to create
 * @property {[string]} name - Game name
 * @property {[string]} description - Description
 * @property {[string]} repo_url - Public GitHub repo url (create only)
 * @property {[string]} screenshots - Screenshot urls
 * @property {[string]} gallery - Gallery image urls
 * @property {[string]} video_urls - Gameplay video urls
 * @property {[string]} id_remix_of - Game this is a remix of
 */
const IndiegameAddSchema = z.object( {
	id: z.string().optional(),
	name: z.string().optional(),
	description: z.string().optional(),
	repo_url: z.string().optional(),
	screenshots: z.any().optional(),
	gallery: z.any().optional(),
	video_urls: z.any().optional(),
	id_remix_of: z.string().optional(),
} );

/** Parameters for indiegame_add */
export type IndiegameAddParams = z.infer<typeof IndiegameAddSchema>;

/*=== f2c_start indiegame_add_headers ===*/

import { gameCreate, gameEdit } from '../lib/game-add';

/*=== f2c_end indiegame_add_headers ===*/

/**
 * Creates a game (no id) or edits one of your games (id)
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameAddParams} params - Request parameters
 * @param {string} ?params.id - Game id, omitted to create
 * @param {string} ?params.name - Game name
 * @param {string} ?params.description - Description
 * @param {string} ?params.repo_url - Public GitHub repo url (create only)
 * @param {string} ?params.screenshots - Screenshot urls
 * @param {string} ?params.gallery - Gallery image urls
 * @param {string} ?params.video_urls - Gameplay video urls
 * @param {string} ?params.id_remix_of - Game this is a remix of
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieGameDetail>>} Result object with success status and data or error details
 */
export const indiegame_add = async ( ctx : LiWECtx, params : IndiegameAddParams, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieGameDetail>> => {
	const validation = paramsValidation<IndiegameAddParams>( IndiegameAddSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id, name, description, repo_url, screenshots, gallery, video_urls, id_remix_of } = validation.data;

	/*=== f2c_start indiegame_add ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, ERR_UNAUTHORIZED );

	return validation.data.id ? gameEdit( ctx, user, validation.data ) : gameCreate( ctx, user, validation.data );
	/*=== f2c_end indiegame_add ===*/
};
