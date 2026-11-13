/**
 * @fileoverview Recording of game views and downloads, one per anonymous visitor, game, kind and UTC day.
 */

import { and, eq } from 'drizzle-orm';
import { ERR_VALIDATION, type LiWECtx, LiWEResponse, responseError, responseSuccess } from '@backend/liwe3';
import { indiegame_events, indiegame_games } from '../schema';
import type { IndieGameTrackResult } from '../types';
import { domainOf } from './games';
import { dayOf } from './time';
import { eventId, visitorHash } from './visitor';

/** Name of the cookie that holds the random id of an anonymous visitor */
export const VISITOR_COOKIE = 'ig_vid';

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
const KINDS = [ 'view', 'download' ] as const;

const _readCookie = ( header : string | undefined, name : string ) : string | null => {
	for ( const part of ( header ?? '' ).split( ';' ) ) {
		const [ key, ...rest ] = part.trim().split( '=' );
		if ( key === name && rest.length ) return rest.join( '=' ) || null;
	}

	return null;
};

/**
 * Records a view or a download of a visible game, at most once per visitor, game, kind and UTC day.
 * The visitor is the random cookie id (set here when missing), or the IP as fallback, hashed with a server secret.
 *
 * @param ctx - Request context (anonymous callers are fine)
 * @param idGame - Game id
 * @param kind - `view` or `download`
 * @returns `counted` (false when already counted today) and the repo url of the game
 */
export const trackGame = async ( ctx : LiWECtx, idGame : string, kind : string ) : Promise<LiWEResponse<IndieGameTrackResult>> => {
	if ( !( KINDS as readonly string[] ).includes( kind ) ) return responseError( 'kind must be view or download', 400, ERR_VALIDATION );

	const env = ctx.app.env as unknown as Record<string, string | undefined> | undefined;
	const salt = env?.VISITOR_SALT ?? env?.SITE_SECRET;
	if ( !salt ) return responseError( 'VISITOR_SALT is not configured', 500, 'VISITOR_SALT_MISSING' );

	const domain = domainOf( ctx, await ctx.user() );
	const game = await ctx.app.db.select().from( indiegame_games )
		.where( and( eq( indiegame_games.domain, domain ), eq( indiegame_games.id, idGame ), eq( indiegame_games.status, 'visible' ) ) ).get();
	if ( !game ) return responseError( 'Game not found', 404, 'GAME_NOT_FOUND' );

	const cookie = _readCookie( ctx.c?.req.header( 'cookie' ), VISITOR_COOKIE );

	// Without cookie the visitor is identified by the IP (or a shared bucket): a client that never keeps cookies cannot inflate the counters
	const visitor = await visitorHash( cookie, ctx.c?.req.header( 'cf-connecting-ip' ) ?? null, salt );

	if ( !cookie ) {
		const secure = ctx.c?.req.url?.startsWith( 'https:' ) ? '; Secure' : '';
		ctx.c?.header( 'Set-Cookie', `${VISITOR_COOKIE}=${crypto.randomUUID()}; Max-Age=${COOKIE_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure}` );
	}

	const kindOk = kind as (typeof KINDS)[number];
	const id = await eventId( game.id, kindOk, visitor, dayOf( new Date() ) );

	const seen = await ctx.app.db.select( { id: indiegame_events.id } ).from( indiegame_events ).where( eq( indiegame_events.id, id ) ).get();
	if ( seen ) return responseSuccess( { counted: false, repo_url: game.repo_url } );

	await ctx.app.db.insert( indiegame_events ).values( { id, domain, id_game: game.id, kind: kindOk, day: dayOf( new Date() ), visitor } ).onConflictDoNothing().run();

	return responseSuccess( { counted: true, repo_url: game.repo_url } );
};
