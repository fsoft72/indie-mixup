import { z } from 'zod';

/*=== f2c_start __types ===*/

// Add custom imports or types here
/*=== f2c_end __types ===*/

/**
 * Schema for Comment
 *
 * @property {str} id - Comment main ID (required, max 64 chars)
 * @property {str} id_user - User ID who wrote the comment (required, max 64 chars)
 * @property {str} module - The module being commented (required, max 64 chars)
 * @property {str} id_obj - The object id being commented (required, max 64 chars)
 * @property {str} comment - The text of the comment (required)
 * @property {[str]} id_follow_up - Follow up ID (if this is the comment of another comment) (max 64 chars)
 * @property {str} domain - Domain code (required, max 128 chars)
 */
const ZComment = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	module: z.string().max( 64, 'Module must be at most 64 characters' ),
	id_obj: z.string().max( 64, 'Id_obj must be at most 64 characters' ),
	comment: z.string(),
	id_follow_up: z.string().max( 64, 'Id_follow_up must be at most 64 characters' ).optional(),
	domain: z.string().max( 128, 'Domain must be at most 128 characters' ),
} );

export type Comment = z.infer<typeof ZComment>;
export { ZComment };

/**
 * Schema for CommentItem
 *
 * @property {str} id - Comment main ID (required, max 64 chars)
 * @property {datetime} created - Date of comment creation (required)
 * @property {CommentMiniUser} user - User creating the comment (required)
 * @property {str} comment - Comment text (required)
 * @property {[str]} id_follow_up - Follow UP id (if any)
 */
const ZCommentItem = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	created: z.coerce.date(),
	user: z.any(),
	comment: z.string(),
	id_follow_up: z.string().optional(),
} );

export type CommentItem = z.infer<typeof ZCommentItem>;
export { ZCommentItem };

/**
 * Schema for CommentMiniUser
 *
 * @property {str} id - CommentMiniUser main ID (required, max 64 chars)
 * @property {str} username - username field (required)
 * @property {[str]} avatar - avatar field
 */
const ZCommentMiniUser = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	username: z.string(),
	avatar: z.string().optional(),
} );

export type CommentMiniUser = z.infer<typeof ZCommentMiniUser>;
export { ZCommentMiniUser };
