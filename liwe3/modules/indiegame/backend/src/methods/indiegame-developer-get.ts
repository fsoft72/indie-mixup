import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieDeveloper } from '../types';

/**
 * Schema for Counts and visible games of a developer
 *
 * @property {string} id_user - User id (required)
 */
const IndiegameDeveloperGetSchema = z.object( {
	id_user: z.string(),
} );

/** Parameters for indiegame_developer_get */
export type IndiegameDeveloperGetParams = z.infer<typeof IndiegameDeveloperGetSchema>;

/*=== f2c_start indiegame_developer_get_headers ===*/

import { developerProfile } from '../lib/ranking';

/*=== f2c_end indiegame_developer_get_headers ===*/

/**
 * Counts and visible games of a developer
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameDeveloperGetParams} params - Request parameters
 * @param {string} params.id_user - User id
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieDeveloper>>} Result object with success status and data or error details
 */
export const indiegame_developer_get = async ( ctx : LiWECtx, params : IndiegameDeveloperGetParams, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieDeveloper>> => {
	const validation = paramsValidation<IndiegameDeveloperGetParams>( IndiegameDeveloperGetSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_user } = validation.data;

	/*=== f2c_start indiegame_developer_get ===*/

	return developerProfile( ctx, id_user );
	/*=== f2c_end indiegame_developer_get ===*/
};
