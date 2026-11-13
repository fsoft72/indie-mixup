import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, like, or, responseError, responseSuccess, z } from './utils';

import { CommentItem } from '../types';

/**
 * Schema for Add a new comment to the system
 *
 * @property {string} module - The module name (required)
 * @property {string} id_obj - Object ID (required)
 * @property {string} comment - Comment text (required)
 * @property {[string]} id_follow_up - Follow UP ID (if any)
 */
const CommentAddSchema = z.object( {
	module: z.string(),
	id_obj: z.string(),
	comment: z.string(),
	id_follow_up: z.string().optional(),
} );

/** Parameters for comment_add */
export type CommentAddParams = z.infer<typeof CommentAddSchema>;

/*=== f2c_start comment_add_headers ===*/
import { LiWEUser, liwe_event_call, liwe_event_emit, mkid } from '@backend/liwe3';
import { comment_comments } from '../schema';
import { COMMENT_EVENT_ADD } from '../events';
import { type Comment } from '../types';
/*=== f2c_end comment_add_headers ===*/

/**
 * Add a new comment to the system
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {CommentAddParams} params - Request parameters
 * @param {string} params.module - The module name
 * @param {string} params.id_obj - Object ID
 * @param {string} params.comment - Comment text
 * @param {string} ?params.id_follow_up - Follow UP ID (if any)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<CommentItem>>} Result object with success status and data or error details
 */
export const comment_add = async ( ctx : LiWECtx, params : CommentAddParams, sys? : LiWESysParams ) : Promise<LiWEResponse<CommentItem>> => {
	const validation = CommentAddSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { module, id_obj, comment, id_follow_up } = validation.data;

	/*=== f2c_start comment_add ===*/
	const user = await ctx.user();
	if ( !user ) return responseError( 'User not authenticated', 401, 'UNAUTHORIZED' );

	const comm : Comment = {
		id: mkid( 'comm' ),
		domain: user.domain ?? '_',
		id_user: user.id,
		module,
		id_obj,
		comment,
		id_follow_up,
	};

	await ctx.app.db.insert( comment_comments ).values( comm ).run();

	const res = await ctx.app.db.select().from( comment_comments ).where( and(
		eq( comment_comments.id, comm.id ),
	) ).get();

	if ( !res ) return responseError( 'Failed to retrieve the added comment', 500, 'RETRIEVAL_ERROR' );

	const ci : CommentItem = {
		id: res.id,
		created: res.created!,
		comment: res.comment,
		user: {
			id: user.id,
			username: user.username,
		},
	};

	await liwe_event_emit( ctx, COMMENT_EVENT_ADD, {
		id: ci.id,
		domain: user.domain ?? '_',
		module,
		id_obj,
		id_user: ci.user.id,
	} );

	// Log the comment into ActivityLog
	await liwe_event_call( ctx, 'activitylog', 'event.add', {
		domain: user.domain ?? '_',
		event: 'comment.add',
		module,
		id_user: ci.user.id,
		data: {
			id_obj,
			username: ci.user.username,
		},
	} );

	return responseSuccess( ci );
	/*=== f2c_end comment_add ===*/
};
