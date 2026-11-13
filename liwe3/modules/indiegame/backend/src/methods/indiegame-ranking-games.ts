import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { IndieGameRankingEntry } from '../types';

/**
 * Schema for Most viewed or downloaded games
 *
 * @property {string} kind - views or downloads (required)
 * @property {string} window - all, 30d, 7d or 1d (required)
 * @property {[number]} limit - Max rows, 1 to 100
 */
const IndiegameRankingGamesSchema = z.object( {
	kind: z.string(),
	window: z.string(),
	limit: z.coerce.number().optional().default( 20 ),
} );

/** Parameters for indiegame_ranking_games */
export type IndiegameRankingGamesParams = z.infer<typeof IndiegameRankingGamesSchema>;

/*=== f2c_start indiegame_ranking_games_headers ===*/

import { RANKING_TTL_SECONDS, cachedRanking, isRankError, parseRankParams, rankGames } from '../lib/ranking';
import { domainOf } from '../lib/games';

/*=== f2c_end indiegame_ranking_games_headers ===*/

/**
 * Most viewed or downloaded games
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {IndiegameRankingGamesParams} params - Request parameters
 * @param {string} params.kind - views or downloads
 * @param {string} params.window - all, 30d, 7d or 1d
 * @param {number} ?params.limit - Max rows, 1 to 100
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<IndieGameRankingEntry[]>>} Result object with success status and data or error details
 */
export const indiegame_ranking_games = async ( ctx : LiWECtx, params : IndiegameRankingGamesParams, sys? : LiWESysParams ) : Promise<LiWEResponse<IndieGameRankingEntry[]>> => {
	const validation = paramsValidation<IndiegameRankingGamesParams>( IndiegameRankingGamesSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { kind, window, limit } = validation.data;

	/*=== f2c_start indiegame_ranking_games ===*/

	const parsed = parseRankParams( [ 'views', 'downloads' ] as const, kind, window, limit );
	if ( isRankError( parsed ) ) return parsed;

	const domain = domainOf( ctx, await ctx.user() );
	const key = `indiegame:rank:${domain}:games:${parsed.kind}:${parsed.window}:${parsed.limit}`;

	return responseSuccess( await cachedRanking( ctx, key, RANKING_TTL_SECONDS, () => rankGames( ctx, domain, parsed.kind, parsed.window, parsed.limit ) ) );
	/*=== f2c_end indiegame_ranking_games ===*/
};
