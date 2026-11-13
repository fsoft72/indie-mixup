import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, like, or, responseError, responseSuccess, z } from './utils';

import { CommentItem } from '../types';

/**
 * Schema for List all comments related to a `module` and `id_obj`
Comments are returned ordered by creation date `ASC` by default (it can be changed with parameters)

If `full` is true, then the final comment will contain a reduced version of User (id, username, and avatar)

 *
 * @property {string} module - The module name (required)
 * @property {string} id_obj - The object ID (required)
 * @property {[string]} sort - How to sort the comments (`asc` | `desc`)
 * @property {[boolean]} full - If set to T, returns also a small info for User
 */
const CommentsListSchema = z.object( {
	module: z.string(),
	id_obj: z.string(),
	sort: z.string().optional().default( 'asc' ),
	full: z.coerce.boolean().optional(),
} );

/** Parameters for comments_list */
export type CommentsListParams = z.infer<typeof CommentsListSchema>;

/*=== f2c_start comments_list_headers ===*/
import { comment_comments } from '../schema';
import { asc, desc } from './utils';
/*=== f2c_end comments_list_headers ===*/

/**
 * List all comments related to a `module` and `id_obj`
 * Comments are returned ordered by creation date `ASC` by default (it can be changed with parameters)
 *
 * If `full` is true, then the final comment will contain a reduced version of User (id, username, and avatar)
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {CommentsListParams} params - Request parameters
 * @param {string} params.module - The module name
 * @param {string} params.id_obj - The object ID
 * @param {string} ?params.sort - How to sort the comments (`asc` | `desc`)
 * @param {boolean} ?params.full - If set to T, returns also a small info for User
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<CommentItem[]>>} Result object with success status and data or error details
 */
export const comments_list = async ( ctx : LiWECtx, params : CommentsListParams, sys? : LiWESysParams ) : Promise<LiWEResponse<CommentItem[]>> => {
	const validation = CommentsListSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { module, id_obj, sort, full } = validation.data;

	/*=== f2c_start comments_list ===*/
	const oby = sort === 'asc' ? asc( comment_comments.created ) : desc( comment_comments.created );

	const rows = await ctx.app.db.select().from( comment_comments ).where(
		and(
			eq( comment_comments.module, module ),
			eq( comment_comments.id_obj, id_obj ),
		),
	).orderBy( oby );

	const res : CommentItem[] = rows.map( ( row : typeof comment_comments.$inferSelect ) => {
		return {
			id: row.id,
			user: { id: row.id_user },
			comment: row.comment,
			id_follow_up: row.id_follow_up ?? undefined,
			created: row.created!,
		};
	} );

	return responseSuccess( res );
	/*=== f2c_end comments_list ===*/
};
