/**
 * @fileoverview Shared read helpers for games: visibility rules, cards, details, lists.
 */

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { type LiWECtx, LiWEResponse, type LiWEUser, has_perms_sync, liwe_event_call, responseError, responseSuccess } from '@backend/liwe3';
import { type IndieGameDB, indiegame_events, indiegame_games } from '../schema';
import { INDIEGAME_PERM_MODERATE } from '../perms';
import type { IndieGameCard, IndieGameDetail } from '../types';
import { type LineageLoader, walkAncestors } from './lineage';

/** Largest page size accepted by list endpoints */
export const MAX_PAGE_SIZE = 100;

/** Domain of a request: the caller domain, otherwise the system domain (anonymous visitors) */
export const domainOf = ( ctx : LiWECtx, user : LiWEUser | null ) : string => user?.domain ?? ctx.app.cfg?.system?.domain ?? '_';

/** True if the user can moderate games: it has `indiegame.moderate` or the `system.admin` wildcard */
export const isModerator = ( user : LiWEUser | null ) : boolean => has_perms_sync( user, [ INDIEGAME_PERM_MODERATE ] );

/** Loads one game of a domain, or undefined */
export const loadGame = ( ctx : LiWECtx, domain : string, id : string ) : Promise<IndieGameDB | undefined> =>
	ctx.app.db.select().from( indiegame_games ).where( and( eq( indiegame_games.domain, domain ), eq( indiegame_games.id, id ) ) ).get();

/** Loader for the remix chain helpers */
export const lineageLoader = ( ctx : LiWECtx, domain : string ) : LineageLoader => async ( id ) => {
	const row = await loadGame( ctx, domain, id );

	return row ? { id: row.id, name: row.name, id_remix_of: row.id_remix_of ?? null, status: row.status as IndieGameDB['status'] & ('visible' | 'hidden' | 'deleted') } : null;
};

/** Display names of authors, by user id (name and last name, never the email) */
export const authorNames = async ( ctx : LiWECtx, ids : string[] ) : Promise<Map<string, string>> => {
	const names = new Map<string, string>();

	for ( const id of new Set( ids ) ) {
		const res = await liwe_event_call<{ username? : string; name? : string; lastname? : string }>( ctx, 'user', 'user.get', { id } );
		if ( !res.ok || !res.data ) continue;

		// For accounts created with GitHub the username is the email: it must never reach a public page
		const full = [ res.data.name, res.data.lastname ].filter( Boolean ).join( ' ' );
		const handle = res.data.username && !res.data.username.includes( '@' ) ? res.data.username : '';
		names.set( id, full || handle || 'Developer' );
	}

	return names;
};

/** Ids per query: D1 allows 100 bound parameters, and the domain takes one of them */
const COUNT_CHUNK = 50;

/** Total views and downloads per game */
export const countsFor = async ( ctx : LiWECtx, domain : string, ids : string[] ) : Promise<Map<string, { views : number; downloads : number }>> => {
	const counts = new Map<string, { views : number; downloads : number }>();

	for ( let start = 0; start < ids.length; start += COUNT_CHUNK ) {
		const rows = await ctx.app.db.select( { id_game: indiegame_events.id_game, kind: indiegame_events.kind, n: sql<number>`count(*)` } )
			.from( indiegame_events )
			.where( and( eq( indiegame_events.domain, domain ), inArray( indiegame_events.id_game, ids.slice( start, start + COUNT_CHUNK ) ) ) )
			.groupBy( indiegame_events.id_game, indiegame_events.kind )
			.all();

		for ( const row of rows ) {
			const entry = counts.get( row.id_game ) ?? { views: 0, downloads: 0 };
			if ( row.kind === 'view' ) entry.views = Number( row.n );
			if ( row.kind === 'download' ) entry.downloads = Number( row.n );
			counts.set( row.id_game, entry );
		}
	}

	return counts;
};

/** The `created` column holds the UTC text of CURRENT_TIMESTAMP (`YYYY-MM-DD HH:MM:SS`): turns it into a Date */
export const toDate = ( value : unknown ) : Date => {
	if ( value instanceof Date ) return value;
	if ( typeof value === 'number' ) return new Date( value );

	return new Date( `${String( value ).replace( ' ', 'T' )}Z` );
};

const _card = ( row : IndieGameDB, author : string | undefined, counts : { views : number; downloads : number } | undefined ) : IndieGameCard => ( {
	id: row.id,
	id_user: row.id_user,
	author_name: author,
	name: row.name,
	repo_url: row.repo_url,
	screenshots: row.screenshots ?? [],
	id_remix_of: row.id_remix_of ?? undefined,
	is_remix: !!row.id_remix_of,
	status: row.status,
	views: counts?.views ?? 0,
	downloads: counts?.downloads ?? 0,
	created: toDate( row.created ),
} );

/** Builds the list cards (author name and counters) for some rows */
export const toCards = async ( ctx : LiWECtx, domain : string, rows : IndieGameDB[] ) : Promise<IndieGameCard[]> => {
	const [ authors, counts ] = await Promise.all( [ authorNames( ctx, rows.map( ( r ) => r.id_user ) ), countsFor( ctx, domain, rows.map( ( r ) => r.id ) ) ] );

	return rows.map( ( row ) => _card( row, authors.get( row.id_user ), counts.get( row.id ) ) );
};

/** Builds the full game page: card, description, media, ancestors and direct visible remixes */
export const toDetail = async ( ctx : LiWECtx, domain : string, row : IndieGameDB ) : Promise<IndieGameDetail> => {
	const [ card ] = await toCards( ctx, domain, [ row ] );
	const lineage = await walkAncestors( row.id, lineageLoader( ctx, domain ) );
	const remixRows = await ctx.app.db.select().from( indiegame_games )
		.where( and( eq( indiegame_games.domain, domain ), eq( indiegame_games.id_remix_of, row.id ), eq( indiegame_games.status, 'visible' ) ) )
		.orderBy( asc( indiegame_games.created ) )
		.all();

	return {
		...card,
		description: row.description,
		gallery: row.gallery ?? [],
		video_urls: row.video_urls ?? [],
		remix_locked: !!row.remix_locked,
		lineage,
		remixes: await toCards( ctx, domain, remixRows ),
	};
};

/** Game page for the get endpoint: hidden games are visible only to their author and to moderators, deleted games never */
export const gameGet = async ( ctx : LiWECtx, id : string ) : Promise<LiWEResponse<IndieGameDetail>> => {
	const user = await ctx.user();
	const domain = domainOf( ctx, user );
	const row = await loadGame( ctx, domain, id );

	if ( !row || row.status === 'deleted' ) return responseError( 'Game not found', 404, 'GAME_NOT_FOUND' );
	if ( row.status === 'hidden' && !( user && ( user.id === row.id_user || isModerator( user ) ) ) ) return responseError( 'Game not found', 404, 'GAME_NOT_FOUND' );

	return responseSuccess( await toDetail( ctx, domain, row ) );
};

/** Escapes the LIKE wildcards of a user typed text */
const _escapeLike = ( text : string ) : string => text.replace( /[\\%_]/g, '\\$&' );

/** Public catalog page: visible games, newest first, optional search on the name */
export const gameList = async ( ctx : LiWECtx, q : string | undefined, page : number, limit : number ) : Promise<LiWEResponse<IndieGameCard[]>> => {
	if ( !Number.isInteger( page ) || page < 1 ) return responseError( 'page must be an integer >= 1', 400, 'INVALID_PAGE' );
	if ( !Number.isInteger( limit ) || limit < 1 || limit > MAX_PAGE_SIZE ) return responseError( `limit must be an integer between 1 and ${MAX_PAGE_SIZE}`, 400, 'INVALID_LIMIT' );

	const domain = domainOf( ctx, await ctx.user() );
	const text = q?.trim();
	const conditions = [ eq( indiegame_games.domain, domain ), eq( indiegame_games.status, 'visible' ) ];
	if ( text ) conditions.push( sql`${indiegame_games.name} LIKE ${`%${_escapeLike( text )}%`} ESCAPE '\\'` );

	const rows = await ctx.app.db.select().from( indiegame_games )
		.where( and( ...conditions ) )
		.orderBy( desc( indiegame_games.created ), asc( indiegame_games.name ) )
		.limit( limit )
		.offset( ( page - 1 ) * limit )
		.all();

	return responseSuccess( await toCards( ctx, domain, rows ) );
};

/** Games published by the user: visible and hidden ones, never the deleted ones */
export const gamesOfUser = async ( ctx : LiWECtx, user : LiWEUser ) : Promise<LiWEResponse<IndieGameCard[]>> => {
	const domain = domainOf( ctx, user );
	const rows = await ctx.app.db.select().from( indiegame_games )
		.where( and( eq( indiegame_games.domain, domain ), eq( indiegame_games.id_user, user.id ), inArray( indiegame_games.status, [ 'visible', 'hidden' ] ) ) )
		.orderBy( desc( indiegame_games.created ) )
		.all();

	return responseSuccess( await toCards( ctx, domain, rows ) );
};
