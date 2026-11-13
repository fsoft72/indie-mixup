import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, comments_delete_all, eq, like, or, responseError, responseSuccess, z } from './utils';

/**
 * Schema for Delete a comment from the system
If there are follow ups related to this comment, follow ups are deleted as well

Users can only delete their comments.
Admins can delete all comments.
 *
 * @property {string} id - Comment ID (required)
 */
const CommentDelSchema = z.object( {
	id: z.string(),
} );

/** Parameters for comment_del */
export type CommentDelParams = z.infer<typeof CommentDelSchema>;

/*=== f2c_start comment_del_headers ===*/
import { comment_comments } from '../schema';
import { ERR_PERMISSION_DENIED, can_act_on, liwe_event_emit } from '@backend/liwe3';
import { COMMENT_PERM_DEL } from '../perms';
import { COMMENT_EVENT_DEL } from '../events';
/*=== f2c_end comment_del_headers ===*/

/**
 * Delete a comment from the system
 * If there are follow ups related to this comment, follow ups are deleted as well
 *
 * Users can only delete their comments.
 * Admins can delete all comments.
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {CommentDelParams} params - Request parameters
 * @param {string} params.id - Comment ID
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const comment_del = async ( ctx : LiWECtx, params : CommentDelParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = CommentDelSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { id } = validation.data;

	/*=== f2c_start comment_del ===*/
	const user = await ctx.user();

	if ( !user ) return responseError( 'User not authenticated', 401, 'AUTHENTICATION_ERROR' );

	const comm = await ctx.app.db.select().from( comment_comments ).where( and(
		eq( comment_comments.id, id ),
		eq( comment_comments.domain, user.domain ?? '_' ),
	) ).get();

	if ( !comm ) return responseSuccess( true );

	// permission OR owner: the route gate is only LOGGED, the fine check is here
	if ( !await can_act_on( ctx, [ COMMENT_PERM_DEL ], comm.id_user ) ) return responseError( 'Permission denied', 403, ERR_PERMISSION_DENIED );

	await comments_delete_all( ctx, [ comm.id ] );
	await liwe_event_emit( ctx, COMMENT_EVENT_DEL, { id } );

	return responseSuccess( true );
	/*=== f2c_end comment_del ===*/
};
