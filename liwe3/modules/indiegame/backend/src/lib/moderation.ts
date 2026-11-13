/**
 * @fileoverview Content reports ("Report" button) and moderator actions: moderation queue, hide or show a game, close a report.
 */

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import {
	ERR_ALREADY_EXISTS,
	ERR_PERMISSION_DENIED,
	ERR_VALIDATION,
	type LiWECtx,
	LiWEResponse,
	type LiWEUser,
	liwe_event_emit,
	mkid,
	responseError,
	responseSuccess,
} from '@backend/liwe3';
import { type IndieGameReportDB, indiegame_games, indiegame_remix_reports, indiegame_reports } from '../schema';
import { INDIEGAME_EVENT_GAME_HIDDEN } from '../events';
import type { IndieAdminReports, IndieGameCard, IndieGameReport } from '../types';
import { domainOf, isModerator, loadGame, toCards, toDate } from './games';
import { remixToReport } from './remix';

const MAX_REASON = 2000;
const MAX_HIDDEN_LISTED = 100;
const RANKING_CACHE_PREFIX = 'indiegame:rank:';

const _toReport = ( row : IndieGameReportDB ) : IndieGameReport => ( {
	id: row.id,
	domain: row.domain,
	id_game: row.id_game,
	id_reporter: row.id_reporter,
	reason: row.reason,
	status: row.status,
	created: toDate( row.created ),
	updated: row.updated ? toDate( row.updated ) : undefined,
} );

const _forbidden = <T>() => responseError<T>( 'Moderator permission required', 403, ERR_PERMISSION_DENIED );

/** Deletes the cached public rankings, so a hidden game leaves them at once. Without a KV binding (or its list support) there is nothing to purge */
const _purgeRankingCache = async ( ctx : LiWECtx ) : Promise<void> => {
	const kv = ctx.app.env?.KV;
	if ( !kv ) return;

	const { keys } = await kv.list( { prefix: RANKING_CACHE_PREFIX } );
	await Promise.all( keys.map( ( key : { name : string } ) => kv.delete( key.name ) ) );
};

/**
 * A logged user reports inappropriate content on a visible game. One open report per user and game.
 *
 * @param ctx - Request context
 * @param user - The reporter
 * @param idGame - Reported game
 * @param reason - Why (1 to 2000 characters)
 * @returns The new open report
 */
export const gameReport = async ( ctx : LiWECtx, user : LiWEUser, idGame : string, reason : string ) : Promise<LiWEResponse<IndieGameReport>> => {
	const text = reason.trim();
	if ( !text || text.length > MAX_REASON ) return responseError( `reason must be 1 to ${MAX_REASON} characters`, 400, ERR_VALIDATION );

	const domain = domainOf( ctx, user );
	const game = await loadGame( ctx, domain, idGame );
	if ( !game || game.status !== 'visible' ) return responseError( 'Game not found', 404, 'GAME_NOT_FOUND' );

	const open = await ctx.app.db.select( { id: indiegame_reports.id } ).from( indiegame_reports )
		.where(
			and(
				eq( indiegame_reports.domain, domain ),
				eq( indiegame_reports.id_game, idGame ),
				eq( indiegame_reports.id_reporter, user.id ),
				eq( indiegame_reports.status, 'open' ),
			),
		).get();
	if ( open ) return responseError( 'You already have an open report on this game', 409, ERR_ALREADY_EXISTS );

	const id = mkid( 'igr' );
	await ctx.app.db.insert( indiegame_reports ).values( { id, domain, id_game: idGame, id_reporter: user.id, reason: text, status: 'open' } ).run();

	return responseSuccess( _toReport( ( await ctx.app.db.select().from( indiegame_reports ).where( eq( indiegame_reports.id, id ) ).get() )! ) );
};

/**
 * Moderation queue: open content reports and open remix reports (pending or contested), oldest first, plus the hidden games, newest first.
 *
 * @param ctx - Request context
 * @param user - A moderator
 * @returns The two lists
 */
export const adminReports = async ( ctx : LiWECtx, user : LiWEUser ) : Promise<LiWEResponse<IndieAdminReports>> => {
	if ( !isModerator( user ) ) return _forbidden();

	const domain = domainOf( ctx, user );
	const [ reports, remixReports, hiddenRows ] = await Promise.all( [
		ctx.app.db.select().from( indiegame_reports ).where( and( eq( indiegame_reports.domain, domain ), eq( indiegame_reports.status, 'open' ) ) ).orderBy(
			asc( indiegame_reports.created ),
			asc( indiegame_reports.id ),
		).all(),
		ctx.app.db.select().from( indiegame_remix_reports ).where(
			and( eq( indiegame_remix_reports.domain, domain ), inArray( indiegame_remix_reports.status, [ 'pending', 'contested' ] ) ),
		).orderBy(
			asc( indiegame_remix_reports.created ),
			asc( indiegame_remix_reports.id ),
		).all(),
		ctx.app.db.select().from( indiegame_games )
			.where( and( eq( indiegame_games.domain, domain ), eq( indiegame_games.status, 'hidden' ) ) )
			.orderBy( desc( indiegame_games.created ) )
			.limit( MAX_HIDDEN_LISTED )
			.all(),
	] );

	return responseSuccess( { reports: reports.map( _toReport ), remix_reports: remixReports.map( remixToReport ), hidden_games: await toCards( ctx, domain, hiddenRows ) } );
};

/**
 * Hides a game from the catalog and the rankings, or shows it again. The deleted games cannot be touched.
 *
 * @param ctx - Request context
 * @param user - A moderator
 * @param id - Game id
 * @param hidden - True to hide, false to show
 * @returns The game card with its new status
 */
export const gameHide = async ( ctx : LiWECtx, user : LiWEUser, id : string, hidden : boolean ) : Promise<LiWEResponse<IndieGameCard>> => {
	if ( !isModerator( user ) ) return _forbidden();

	const domain = domainOf( ctx, user );
	const game = await loadGame( ctx, domain, id );
	if ( !game || game.status === 'deleted' ) return responseError( 'Game not found', 404, 'GAME_NOT_FOUND' );

	const status = hidden ? 'hidden' : 'visible';
	await ctx.app.db.update( indiegame_games ).set( { status, updated: sql`CURRENT_TIMESTAMP` as unknown as Date } )
		.where( and( eq( indiegame_games.domain, domain ), eq( indiegame_games.id, id ) ) ).run();

	await _purgeRankingCache( ctx );
	await liwe_event_emit( ctx, INDIEGAME_EVENT_GAME_HIDDEN, { id, domain, hidden, by: user.id } );

	const [ card ] = await toCards( ctx, domain, [ { ...game, status } ] );

	return responseSuccess( card );
};

/**
 * Closes a content report. Closing a closed report is not an error.
 *
 * @param ctx - Request context
 * @param user - A moderator
 * @param idReport - Report id
 * @returns The closed report
 */
export const reportClose = async ( ctx : LiWECtx, user : LiWEUser, idReport : string ) : Promise<LiWEResponse<IndieGameReport>> => {
	if ( !isModerator( user ) ) return _forbidden();

	const domain = domainOf( ctx, user );
	const find = () => ctx.app.db.select().from( indiegame_reports ).where( and( eq( indiegame_reports.domain, domain ), eq( indiegame_reports.id, idReport ) ) ).get();
	const report = await find();
	if ( !report ) return responseError( 'Report not found', 404, 'REPORT_NOT_FOUND' );

	if ( report.status !== 'closed' ) {
		await ctx.app.db.update( indiegame_reports ).set( { status: 'closed', updated: sql`CURRENT_TIMESTAMP` as unknown as Date } )
			.where( and( eq( indiegame_reports.domain, domain ), eq( indiegame_reports.id, idReport ) ) ).run();
	}

	return responseSuccess( _toReport( ( await find() )! ) );
};
