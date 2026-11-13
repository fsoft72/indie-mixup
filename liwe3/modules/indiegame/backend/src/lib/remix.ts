/**
 * @fileoverview Remix reports: "Is this a remix of your game?", the answer of the owner and the decision of a moderator.
 */

import { and, desc, eq, sql } from 'drizzle-orm';
import {
	ERR_ALREADY_EXISTS,
	ERR_PERMISSION_DENIED,
	type LiWECtx,
	LiWEResponse,
	type LiWEUser,
	liwe_event_call,
	liwe_event_emit,
	responseError,
	responseSuccess,
} from '@backend/liwe3';
import { type IndieRemixReportDB, indiegame_games, indiegame_remix_reports } from '../schema';
import { INDIEGAME_EVENT_REMIX_REPORTED } from '../events';
import type { IndieRemixReport } from '../types';
import { domainOf, isModerator, lineageLoader, loadGame, toDate } from './games';
import { createsCycle } from './lineage';
import { remixReportId } from './visitor';

export const remixToReport = ( row : IndieRemixReportDB ) : IndieRemixReport => ( {
	id: row.id,
	domain: row.domain,
	id_game: row.id_game,
	id_original: row.id_original,
	id_reporter: row.id_reporter,
	id_owner: row.id_owner,
	status: row.status,
	decided_by: row.decided_by ?? undefined,
	created: toDate( row.created ),
	updated: row.updated ? toDate( row.updated ) : undefined,
} );

const _loadReport = ( ctx : LiWECtx, domain : string, id : string ) : Promise<IndieRemixReportDB | undefined> =>
	ctx.app.db.select().from( indiegame_remix_reports ).where( and( eq( indiegame_remix_reports.domain, domain ), eq( indiegame_remix_reports.id, id ) ) ).get();

const _setStatus = ( ctx : LiWECtx, domain : string, id : string, status : string, decidedBy? : string ) =>
	ctx.app.db.update( indiegame_remix_reports ).set( { status, ...( decidedBy ? { decided_by: decidedBy } : {} ), updated: sql`CURRENT_TIMESTAMP` as unknown as Date } )
		.where( and( eq( indiegame_remix_reports.domain, domain ), eq( indiegame_remix_reports.id, id ) ) ).run();

/**
 * Makes the reported game a locked remix of the original. Fails with 409 when the game is gone, already a remix of another game, or the link would create a cycle.
 *
 * @returns An error response, or null when the link was applied
 */
const _applyLink = async ( ctx : LiWECtx, domain : string, report : IndieRemixReportDB ) : Promise<LiWEResponse<IndieRemixReport> | null> => {
	const game = await loadGame( ctx, domain, report.id_game );
	if ( !game || game.status === 'deleted' ) return responseError( 'The reported game is no longer available', 409, 'GAME_NOT_AVAILABLE' );
	if ( game.id_remix_of && game.id_remix_of !== report.id_original ) return responseError( 'The game is already a remix of another game', 409, 'ALREADY_REMIX' );
	if ( await createsCycle( game.id, report.id_original, lineageLoader( ctx, domain ) ) ) return responseError( 'The link would create a remix cycle', 409, 'REMIX_CYCLE' );

	await ctx.app.db.update( indiegame_games ).set( { id_remix_of: report.id_original, remix_locked: true, updated: sql`CURRENT_TIMESTAMP` as unknown as Date } )
		.where( and( eq( indiegame_games.domain, domain ), eq( indiegame_games.id, game.id ) ) ).run();

	return null;
};

/**
 * The author of a game reports another game as an undeclared remix of it. The owner of the reported game is notified.
 *
 * @param ctx - Request context
 * @param user - The reporter
 * @param idGame - The reported game
 * @param idOriginal - A visible game of the reporter, published before the reported one
 * @returns The new pending report
 */
export const remixReport = async ( ctx : LiWECtx, user : LiWEUser, idGame : string, idOriginal : string ) : Promise<LiWEResponse<IndieRemixReport>> => {
	const domain = domainOf( ctx, user );
	const [ game, original ] = await Promise.all( [ loadGame( ctx, domain, idGame ), loadGame( ctx, domain, idOriginal ) ] );

	if ( !game || game.status !== 'visible' ) return responseError( 'Reported game not found', 404, 'GAME_NOT_FOUND' );
	if ( !original || original.status !== 'visible' ) return responseError( 'Original game not found', 404, 'GAME_NOT_FOUND' );
	if ( original.id_user !== user.id ) return responseError( 'The original must be one of your games', 403, 'NOT_YOUR_GAME' );
	if ( game.id_user === user.id ) return responseError( 'You cannot report your own game', 400, 'OWN_GAME' );
	if ( game.id_remix_of ) return responseError( 'The game already declares a remix', 400, 'ALREADY_REMIX' );
	if ( !( toDate( original.created ) < toDate( game.created ) ) ) return responseError( 'The original must be published before the reported game', 400, 'ORIGINAL_NOT_OLDER' );
	if ( await createsCycle( game.id, original.id, lineageLoader( ctx, domain ) ) ) return responseError( 'The link would create a remix cycle', 400, 'REMIX_CYCLE' );

	const id = await remixReportId( game.id, original.id );
	const existing = await _loadReport( ctx, domain, id );
	if ( existing )
		return existing.status === 'rejected'
			? responseError( 'This report was rejected and cannot be reopened', 409, 'REPORT_REJECTED' )
			: responseError( 'This report already exists', 409, ERR_ALREADY_EXISTS );

	await ctx.app.db.insert( indiegame_remix_reports ).values( {
		id,
		domain,
		id_game: game.id,
		id_original: original.id,
		id_reporter: user.id,
		id_owner: game.id_user,
		status: 'pending',
	} ).run();

	// The notification and the event are best effort: the report exists even when they fail
	await liwe_event_call( ctx, 'notifier', 'create', {
		id_user: game.id_user,
		domain,
		event_type: INDIEGAME_EVENT_REMIX_REPORTED,
		title: 'Is your game a remix?',
		message: `The author of "${original.name}" says that "${game.name}" is a remix of their game.`,
		notification_type: 'info',
		data: { id_report: id, id_game: game.id, id_original: original.id },
	} );
	await liwe_event_emit( ctx, INDIEGAME_EVENT_REMIX_REPORTED, { id, domain, id_game: game.id, id_original: original.id } );

	return responseSuccess( remixToReport( ( await _loadReport( ctx, domain, id ) )! ) );
};

/**
 * Remix reports about the games of the caller, newest first.
 *
 * @param ctx - Request context
 * @param user - The logged user
 * @returns The reports where the caller owns the reported game
 */
export const remixInbox = async ( ctx : LiWECtx, user : LiWEUser ) : Promise<LiWEResponse<IndieRemixReport[]>> => {
	const domain = domainOf( ctx, user );
	const rows = await ctx.app.db.select().from( indiegame_remix_reports )
		.where( and( eq( indiegame_remix_reports.domain, domain ), eq( indiegame_remix_reports.id_owner, user.id ) ) )
		.orderBy( desc( indiegame_remix_reports.created ) )
		.all();

	return responseSuccess( rows.map( remixToReport ) );
};

/**
 * The owner of the reported game accepts (the game becomes a locked remix) or contests (a moderator decides).
 *
 * @param ctx - Request context
 * @param user - The logged user, must own the reported game
 * @param idReport - Report id, must be pending
 * @param accept - True to accept, false to contest
 * @returns The updated report
 */
export const remixAnswer = async ( ctx : LiWECtx, user : LiWEUser, idReport : string, accept : boolean ) : Promise<LiWEResponse<IndieRemixReport>> => {
	const domain = domainOf( ctx, user );
	const report = await _loadReport( ctx, domain, idReport );

	if ( !report ) return responseError( 'Report not found', 404, 'REPORT_NOT_FOUND' );
	if ( report.id_owner !== user.id ) return responseError( 'Only the owner of the reported game can answer', 403, ERR_PERMISSION_DENIED );
	if ( report.status !== 'pending' ) return responseError( 'The report was already answered', 409, 'REPORT_NOT_PENDING' );

	if ( accept ) {
		const error = await _applyLink( ctx, domain, report );
		if ( error ) return error;
	}

	await _setStatus( ctx, domain, idReport, accept ? 'accepted' : 'contested' );

	return responseSuccess( remixToReport( ( await _loadReport( ctx, domain, idReport ) )! ) );
};

/**
 * A moderator confirms or rejects a contested report.
 *
 * @param ctx - Request context
 * @param user - The moderator
 * @param idReport - Report id, must be contested
 * @param confirm - True to make the game a remix of the original, false to reject the report
 * @returns The updated report
 */
export const remixDecide = async ( ctx : LiWECtx, user : LiWEUser, idReport : string, confirm : boolean ) : Promise<LiWEResponse<IndieRemixReport>> => {
	if ( !isModerator( user ) ) return responseError( 'Moderator permission required', 403, ERR_PERMISSION_DENIED );

	const domain = domainOf( ctx, user );
	const report = await _loadReport( ctx, domain, idReport );

	if ( !report ) return responseError( 'Report not found', 404, 'REPORT_NOT_FOUND' );
	if ( report.status !== 'contested' ) return responseError( 'Only a contested report can be decided', 409, 'REPORT_NOT_CONTESTED' );

	if ( confirm ) {
		const error = await _applyLink( ctx, domain, report );
		if ( error ) return error;
	}

	await _setStatus( ctx, domain, idReport, confirm ? 'confirmed' : 'rejected', user.id );

	return responseSuccess( remixToReport( ( await _loadReport( ctx, domain, idReport ) )! ) );
};
