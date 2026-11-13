/**
 * @fileoverview Creation and edit of a game card (rules of the add endpoint).
 */

import { and, eq, sql } from 'drizzle-orm';
import {
	ERR_ALREADY_EXISTS,
	ERR_PERMISSION_DENIED,
	ERR_VALIDATION,
	type LiWECtx,
	LiWEResponse,
	type LiWEUser,
	liwe_event_call,
	liwe_event_emit,
	mkid,
	responseError,
	responseSuccess,
} from '@backend/liwe3';
import { indiegame_games } from '../schema';
import { INDIEGAME_EVENT_GAME_CREATED } from '../events';
import type { IndieGameDetail } from '../types';
import { verifyRepoOwnership } from './github';
import { domainOf, isModerator, lineageLoader, loadGame, toDetail } from './games';
import { createsCycle } from './lineage';
import { parseRepoUrl } from './repo';

/** Fields accepted by the add endpoint (all optional at schema level) */
export type GameInput = {
	id? : string;
	name? : string;
	description? : string;
	repo_url? : string;
	screenshots? : unknown;
	gallery? : unknown;
	video_urls? : unknown;
	id_remix_of? : string;
};

const MAX_NAME = 255;
const MAX_IMAGES = 20;
const MAX_VIDEOS = 10;

/** Validates a list of urls (strings). Returns null when the value is not a valid list */
const _urlList = ( value : unknown, max : number, httpOnly : boolean ) : string[] | null => {
	if ( !Array.isArray( value ) || value.length > max ) return null;

	const out : string[] = [];
	for ( const item of value ) {
		if ( typeof item !== 'string' || !item.trim() ) return null;
		if ( httpOnly && !/^https?:\/\//i.test( item.trim() ) ) return null;
		out.push( item.trim() );
	}

	return out;
};

const _invalid = ( message : string ) => responseError<IndieGameDetail>( message, 400, ERR_VALIDATION );

/** Checks that `parent` can be the original of a game: it exists in the domain and is visible */
const _parentError = async ( ctx : LiWECtx, domain : string, parent : string ) : Promise<LiWEResponse<IndieGameDetail> | null> => {
	const row = await loadGame( ctx, domain, parent );

	return row && row.status === 'visible' ? null : responseError( 'The original game does not exist or is not visible', 400, 'INVALID_REMIX_PARENT' );
};

/**
 * Publishes a new game: validates the card, checks that the repo is the personal public repo of the caller and stores it as visible.
 *
 * @param ctx - Request context
 * @param user - The logged user
 * @param input - Card fields
 * @returns The new game page
 */
export const gameCreate = async ( ctx : LiWECtx, user : LiWEUser, input : GameInput ) : Promise<LiWEResponse<IndieGameDetail>> => {
	const domain = domainOf( ctx, user );
	const name = input.name?.trim();
	const description = input.description?.trim();
	const repoUrl = input.repo_url?.trim();

	if ( !name || !description || !repoUrl ) return _invalid( 'name, description and repo_url are required' );
	if ( name.length > MAX_NAME ) return _invalid( `name is longer than ${MAX_NAME} characters` );

	const screenshots = _urlList( input.screenshots, MAX_IMAGES, false );
	if ( !screenshots?.length ) return _invalid( 'At least one screenshot is required' );

	const gallery = input.gallery === undefined ? [] : _urlList( input.gallery, MAX_IMAGES, false );
	if ( !gallery ) return _invalid( 'gallery must be a list of urls' );

	const videos = input.video_urls === undefined ? [] : _urlList( input.video_urls, MAX_VIDEOS, true );
	if ( !videos ) return _invalid( 'video_urls must be a list of http(s) urls' );

	const parent = input.id_remix_of?.trim();
	if ( parent ) {
		const error = await _parentError( ctx, domain, parent );
		if ( error ) return error;
	}

	const link = await liwe_event_call<{ provider_user_id : string }>( ctx, 'user', 'user.oauth_link', { id_user: user.id, provider: 'github', domain } );
	if ( !link.ok || !link.data ) return responseError( 'Login with GitHub is required to publish a game', 403, 'GITHUB_LOGIN_REQUIRED' );

	const token = ( ctx.app.env as unknown as Record<string, string | undefined> | undefined )?.GITHUB_API_TOKEN;
	const check = await verifyRepoOwnership( repoUrl, link.data.provider_user_id, { token } );
	if ( !check.ok ) {
		const status = check.code === 'NOT_OWNER' ? 403 : check.code === 'GITHUB_ERROR' ? 502 : 400;

		return responseError( `Repo check failed: ${check.code}`, status, check.code );
	}

	const existing = await ctx.app.db.select( { id: indiegame_games.id } ).from( indiegame_games ).where( eq( indiegame_games.repo_id, check.repo_id ) ).get();
	if ( existing ) return responseError( 'This repo is already in the catalog', 409, ERR_ALREADY_EXISTS );

	const id = mkid( 'igm' );
	try {
		await ctx.app.db.insert( indiegame_games ).values( {
			id,
			domain,
			id_user: user.id,
			name,
			description,
			repo_url: check.url,
			repo_id: check.repo_id,
			screenshots,
			gallery,
			video_urls: videos,
			id_remix_of: parent || null,
			remix_locked: false,
			status: 'visible',
		} ).run();
	} catch ( error ) {
		// The unique index on repo_id closes the race between two concurrent publications of the same repo
		if ( String( error instanceof Error ? error.message + ( error.cause instanceof Error ? error.cause.message : '' ) : error ).includes( 'UNIQUE' ) )
			return responseError( 'This repo is already in the catalog', 409, ERR_ALREADY_EXISTS );

		return responseError( 'Could not save the game', 500, 'GAME_SAVE_FAILED', 'error', { error: error instanceof Error ? error : undefined } );
	}

	await liwe_event_emit( ctx, INDIEGAME_EVENT_GAME_CREATED, { id, domain, id_user: user.id, id_remix_of: parent || null } );

	const row = await loadGame( ctx, domain, id );

	return responseSuccess( await toDetail( ctx, domain, row! ) );
};

/**
 * Edits a game of the caller (or any game, for a moderator). The repo url is frozen and a remix link accepted after a report can be changed only by a moderator.
 *
 * @param ctx - Request context
 * @param user - The logged user
 * @param input - Card fields; `input.id` is the game to edit, omitted fields stay unchanged
 * @returns The updated game page
 */
export const gameEdit = async ( ctx : LiWECtx, user : LiWEUser, input : GameInput ) : Promise<LiWEResponse<IndieGameDetail>> => {
	const domain = domainOf( ctx, user );
	const row = await loadGame( ctx, domain, input.id! );

	if ( !row || row.status === 'deleted' ) return responseError( 'Game not found', 404, 'GAME_NOT_FOUND' );

	const moderator = isModerator( user );
	if ( row.id_user !== user.id && !moderator ) return responseError( 'Only the author can edit this game', 403, ERR_PERMISSION_DENIED );

	if ( input.repo_url !== undefined ) {
		const wanted = parseRepoUrl( input.repo_url );
		const current = parseRepoUrl( row.repo_url );
		if ( !wanted || !current || wanted.url !== current.url ) return responseError( 'The repo url cannot be changed', 400, 'REPO_URL_FROZEN' );
	}

	const changes : Partial<typeof indiegame_games.$inferInsert> = {};

	if ( input.name !== undefined ) {
		const name = input.name.trim();
		if ( !name || name.length > MAX_NAME ) return _invalid( `name must be 1 to ${MAX_NAME} characters` );
		changes.name = name;
	}

	if ( input.description !== undefined ) {
		const description = input.description.trim();
		if ( !description ) return _invalid( 'description cannot be empty' );
		changes.description = description;
	}

	if ( input.screenshots !== undefined ) {
		const screenshots = _urlList( input.screenshots, MAX_IMAGES, false );
		if ( !screenshots?.length ) return _invalid( 'At least one screenshot is required' );
		changes.screenshots = screenshots;
	}

	if ( input.gallery !== undefined ) {
		const gallery = _urlList( input.gallery, MAX_IMAGES, false );
		if ( !gallery ) return _invalid( 'gallery must be a list of urls' );
		changes.gallery = gallery;
	}

	if ( input.video_urls !== undefined ) {
		const videos = _urlList( input.video_urls, MAX_VIDEOS, true );
		if ( !videos ) return _invalid( 'video_urls must be a list of http(s) urls' );
		changes.video_urls = videos;
	}

	if ( input.id_remix_of !== undefined && input.id_remix_of.trim() !== ( row.id_remix_of ?? '' ) ) {
		const next = input.id_remix_of.trim();
		if ( row.remix_locked && !moderator ) return responseError( 'The remix link was confirmed and only a moderator can change it', 403, 'REMIX_LOCKED' );

		if ( next ) {
			if ( await createsCycle( row.id, next, lineageLoader( ctx, domain ) ) )
				return responseError( 'A game cannot be a remix of itself or of one of its remixes', 400, 'REMIX_CYCLE' );

			const error = await _parentError( ctx, domain, next );
			if ( error ) return error;
		}

		changes.id_remix_of = next || null;
	}

	if ( Object.keys( changes ).length ) {
		await ctx.app.db.update( indiegame_games ).set( { ...changes, updated: sql`CURRENT_TIMESTAMP` as unknown as Date } )
			.where( and( eq( indiegame_games.domain, domain ), eq( indiegame_games.id, row.id ) ) ).run();
	}

	return responseSuccess( await toDetail( ctx, domain, ( await loadGame( ctx, domain, row.id ) )! ) );
};

/**
 * Soft-deletes a game of the caller. Remixes of it keep their link and show it as removed.
 *
 * @param ctx - Request context
 * @param user - The logged user
 * @param id - Game id
 * @returns True when deleted
 */
export const gameDelete = async ( ctx : LiWECtx, user : LiWEUser, id : string ) : Promise<LiWEResponse<boolean>> => {
	const domain = domainOf( ctx, user );
	const row = await loadGame( ctx, domain, id );

	if ( !row || row.status === 'deleted' ) return responseError( 'Game not found', 404, 'GAME_NOT_FOUND' );
	if ( row.id_user !== user.id ) return responseError( 'Only the author can delete this game', 403, ERR_PERMISSION_DENIED );

	await ctx.app.db.update( indiegame_games ).set( { status: 'deleted', updated: sql`CURRENT_TIMESTAMP` as unknown as Date } )
		.where( and( eq( indiegame_games.domain, domain ), eq( indiegame_games.id, id ) ) ).run();

	return responseSuccess( true );
};
