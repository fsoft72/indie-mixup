/**
 * @fileoverview Common utilities for comment module methods
 */

// Core imports
export { LiWEApp, LiWEResponse, LiWESysParams, responseError, responseSuccess } from '@backend/liwe3';
export type { LiWECtx } from '@backend/liwe3';

// Database operation imports
export { eq, and, ne, desc, asc, count, avg, sql, inArray, or, like, isNull } from 'drizzle-orm';

// Schema imports
// TODO: Import your schema tables here

// Zod for validation
export { z } from 'zod';

/*=== f2c_start utils ===*/
import { type LiWECtx, LiWEResponse, drizzleGetRecursiveRelatedIds, responseSuccess } from '@backend/liwe3';
import { type CommentDB, comment_comments } from '../schema';
import { and, eq, inArray } from 'drizzle-orm';

type getAllByUserType = {
	id_user : string;
	module? : string;
};
/**
 * Returns all comment rows written by the given user.
 *
 * Returns raw table rows (`CommentDB`), not the API `Comment` shape: the caller
 * (user-deletion cleanup) needs the ids, not a validated payload.
 *
 * @param {string} params.id_user - The user id
 * @param {string} params?.module - The module user commented on (optional)
 */
export const comments_get_all_by_user = async ( ctx : LiWECtx, params : getAllByUserType ) : Promise<LiWEResponse<CommentDB[]>> => {
	const conds = [
		eq( comment_comments.id_user, params.id_user ),
	];

	if ( params.module ) conds.push( eq( comment_comments.module, params.module ) );

	const comments : CommentDB[] = await ctx.app.db.select().from( comment_comments ).where( and( ...conds ) ).all();

	return responseSuccess( comments );
};

/**
 * This function recursively delete a group of comments and all comments that are a follow_up for that comment
 */
export const comments_delete_all = async ( ctx : LiWECtx, id_comments : string[] ) : Promise<LiWEResponse<boolean>> => {
	const ids : string[] = await drizzleGetRecursiveRelatedIds(
		ctx.app.db,
		comment_comments,
		comment_comments.id,
		comment_comments.id_follow_up,
		id_comments,
	);

	if ( ids.length === 0 ) return responseSuccess( true );

	await ctx.app.db.delete( comment_comments ).where( inArray( comment_comments.id, ids ) ).run();

	return responseSuccess( true );
};
/*=== f2c_end utils ===*/
