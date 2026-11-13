/**
 * @fileoverview Rankings of games and developers, developer profile and the KV cache of the public rankings.
 */

import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { ERR_VALIDATION, type LiWECtx, LiWEResponse, responseError, responseSuccess } from '@backend/liwe3';
import { indiegame_events, indiegame_games } from '../schema';
import type { IndieDevRankingEntry, IndieDeveloper, IndieGameRankingEntry } from '../types';
import { MAX_PAGE_SIZE, authorNames, domainOf, toCards } from './games';
import { type RankWindow, isRankWindow, windowStartDay } from './time';

/** Seconds a public ranking stays in the KV cache */
export const RANKING_TTL_SECONDS = 300;

/** Kinds of game ranking */
export type GameRankKind = 'views' | 'downloads';

/** Kinds of developer ranking */
export type DevRankKind = 'originals' | 'remixes';

/**
 * Ranking of visible games by views or downloads inside a window, with ties ordered by name. Games with no events are not listed.
 *
 * @param ctx - Request context
 * @param domain - Domain of the ranking
 * @param kind - `views` or `downloads`
 * @param window - Ranking window
 * @param limit - Max rows
 * @param now - Current date (tests)
 * @returns Rows ordered by score, highest first
 */
export const rankGames = async (
	ctx : LiWECtx,
	domain : string,
	kind : GameRankKind,
	window : RankWindow,
	limit : number,
	now : Date = new Date(),
) : Promise<IndieGameRankingEntry[]> => {
	const start = windowStartDay( window, now );
	const total = sql<number>`count(${indiegame_events.id})`;

	const rows = await ctx.app.db.select( { id: indiegame_games.id, name: indiegame_games.name, count: total } )
		.from( indiegame_events )
		.innerJoin( indiegame_games, eq( indiegame_events.id_game, indiegame_games.id ) )
		.where( and(
			eq( indiegame_events.domain, domain ),
			eq( indiegame_games.domain, domain ),
			eq( indiegame_games.status, 'visible' ),
			eq( indiegame_events.kind, kind === 'views' ? 'view' : 'download' ),
			start ? sql`${indiegame_events.day} >= ${start}` : undefined,
		) )
		.groupBy( indiegame_games.id, indiegame_games.name )
		.orderBy( desc( total ), asc( indiegame_games.name ) )
		.limit( limit )
		.all();

	return rows.map( ( row ) => ( { id: row.id, name: row.name, count: Number( row.count ) } ) );
};

/**
 * Ranking of developers by number of visible original games or remixes published inside a window (by game publication date). Ties are ordered by user id.
 *
 * @param ctx - Request context
 * @param domain - Domain of the ranking
 * @param kind - `originals` (games with no `id_remix_of`) or `remixes`
 * @param window - Ranking window
 * @param limit - Max rows
 * @param now - Current date (tests)
 * @returns Rows ordered by score, highest first
 */
export const rankDevelopers = async (
	ctx : LiWECtx,
	domain : string,
	kind : DevRankKind,
	window : RankWindow,
	limit : number,
	now : Date = new Date(),
) : Promise<IndieDevRankingEntry[]> => {
	const start = windowStartDay( window, now );
	const total = sql<number>`count(*)`;

	const rows = await ctx.app.db.select( { id_user: indiegame_games.id_user, count: total } )
		.from( indiegame_games )
		.where( and(
			eq( indiegame_games.domain, domain ),
			eq( indiegame_games.status, 'visible' ),
			kind === 'originals' ? isNull( indiegame_games.id_remix_of ) : isNotNull( indiegame_games.id_remix_of ),
			start ? sql`${indiegame_games.created} >= ${start}` : undefined,
		) )
		.groupBy( indiegame_games.id_user )
		.orderBy( desc( total ), asc( indiegame_games.id_user ) )
		.limit( limit )
		.all();

	const names = await authorNames( ctx, rows.map( ( row ) => row.id_user ) );

	return rows.map( ( row ) => ( { id_user: row.id_user, author_name: names.get( row.id_user ), count: Number( row.count ) } ) );
};

/**
 * Returns a cached value from KV, or computes and stores it. Without a KV binding it just computes.
 *
 * @param ctx - Request context
 * @param key - Cache key
 * @param ttlSeconds - Time to live
 * @param compute - Computes the value on a miss
 * @returns The value
 */
export const cachedRanking = async <T>( ctx : LiWECtx, key : string, ttlSeconds : number, compute : () => Promise<T> ) : Promise<T> => {
	const kv = ctx.app.env?.KV;
	if ( !kv ) return compute();

	const hit = await kv.get( key );
	if ( hit ) return JSON.parse( hit ) as T;

	const value = await compute();
	await kv.put( key, JSON.stringify( value ), { expirationTtl: ttlSeconds } );

	return value;
};

type RankParams<K extends string> = { kind : K; window : RankWindow; limit : number };

/** Validates kind, window and limit of a ranking request */
export const parseRankParams = <K extends string>( kinds : readonly K[], kind : string, window : string, limit : number ) : RankParams<K> | LiWEResponse<never> => {
	if ( !( kinds as readonly string[] ).includes( kind ) ) return responseError( `kind must be one of: ${kinds.join( ', ' )}`, 400, ERR_VALIDATION );
	if ( !isRankWindow( window ) ) return responseError( 'window must be one of: all, 30d, 7d, 1d', 400, ERR_VALIDATION );
	if ( !Number.isInteger( limit ) || limit < 1 || limit > MAX_PAGE_SIZE ) return responseError( `limit must be an integer between 1 and ${MAX_PAGE_SIZE}`, 400, ERR_VALIDATION );

	return { kind: kind as K, window, limit };
};

/** True when the result of {@link parseRankParams} is an error response */
export const isRankError = ( value : unknown ) : value is LiWEResponse<never> => typeof value === 'object' && value !== null && 'ok' in value;

/**
 * Public profile of a developer: counts of visible originals and remixes and the visible games.
 *
 * @param ctx - Request context
 * @param idUser - Developer user id
 * @returns The profile, or 404 when the user does not exist
 */
export const developerProfile = async ( ctx : LiWECtx, idUser : string ) : Promise<LiWEResponse<IndieDeveloper>> => {
	const domain = domainOf( ctx, await ctx.user() );
	const names = await authorNames( ctx, [ idUser ] );
	if ( !names.has( idUser ) ) return responseError( 'Developer not found', 404, 'DEVELOPER_NOT_FOUND' );

	const rows = await ctx.app.db.select().from( indiegame_games )
		.where( and( eq( indiegame_games.domain, domain ), eq( indiegame_games.id_user, idUser ), eq( indiegame_games.status, 'visible' ) ) )
		.orderBy( desc( indiegame_games.created ) )
		.all();

	return responseSuccess( {
		id_user: idUser,
		author_name: names.get( idUser ),
		originals: rows.filter( ( row ) => !row.id_remix_of ).length,
		remixes: rows.filter( ( row ) => !!row.id_remix_of ).length,
		games: await toCards( ctx, domain, rows ),
	} );
};
