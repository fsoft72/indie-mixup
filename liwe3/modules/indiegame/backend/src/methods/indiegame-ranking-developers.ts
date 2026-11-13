import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieDevRankingEntry } from '../types';

/**
 * Schema for Developers with most original games or most remixes
 *
 * @property {string} kind - originals or remixes (required)
 * @property {string} window - all, 30d, 7d or 1d (required)
 * @property {[number]} limit - Max rows, 1 to 100
 */
const IndiegameRankingDevelopersSchema = z.object( {
	kind: z.string(),
	window: z.string(),
	limit: z.coerce.number().optional().default( 20 ),
} );

/** Parameters for indiegame_ranking_developers */
export type IndiegameRankingDevelopersParams = z.infer<typeof IndiegameRankingDevelopersSchema>;

/*=== f2c_start indiegame_ranking_developers_headers ===*/

import { RANKING_TTL_SECONDS, cachedRanking, isRankError, parseRankParams, rankDevelopers } from '../lib/ranking';
import { domainOf } from '../lib/games';
/*=== f2c_end indiegame_ranking_developers_headers ===*/

/**
 * Developers with most original games or most remixes
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameRankingDevelopersParams} params - Request parameters
 * @param {string} params.kind - originals or remixes
 * @param {string} params.window - all, 30d, 7d or 1d
 * @param {number} ?params.limit - Max rows, 1 to 100
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieDevRankingEntry[]>>} Result object with success status and data or error details
 */
export const indiegame_ranking_developers = async (
	ctx : LiWECtx,
	params : IndiegameRankingDevelopersParams,
	sys? : LiWESysParams,
) : Promise<LiWEResponse<IndieDevRankingEntry[]>> => {
	const validation = paramsValidation<IndiegameRankingDevelopersParams>( IndiegameRankingDevelopersSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { kind, window, limit } = validation.data;

	/*=== f2c_start indiegame_ranking_developers ===*/

	const parsed = parseRankParams( [ 'originals', 'remixes' ] as const, kind, window, limit );
	if ( isRankError( parsed ) ) return parsed;

	const domain = domainOf( ctx, await ctx.user() );
	const key = `indiegame:rank:${domain}:developers:${parsed.kind}:${parsed.window}:${parsed.limit}`;

	return responseSuccess( await cachedRanking( ctx, key, RANKING_TTL_SECONDS, () => rankDevelopers( ctx, domain, parsed.kind, parsed.window, parsed.limit ) ) );
	/*=== f2c_end indiegame_ranking_developers ===*/
};
