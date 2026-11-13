/**
 * @fileoverview Tag object removal functionality
 */

import { LiWEApp, LiWEResponse, and, eq, responseError, responseSuccess, taggables, tags, z } from './utils';

/**
 * Schema for removing tags from objects
 *
 * @property {string} tag_slug - Required tag slug to identify the tag to remove
 * @property {string} id_object - Required object identifier
 * @property {string} module - Required module name that owns the object
 */
const UntagObjectSchema = z.object( {
	tag_slug: z.string().min( 1, 'Tag slug is required' ),
	id_object: z.string().min( 1, 'Object ID is required' ),
	module: z.string().min( 1, 'Module is required' ),
} );

/** Parameters for removing a tag from an object */
export type TagRemoveParams = z.infer<typeof UntagObjectSchema>;

/** Return type for tag removal */
export type TagRemoveResult = { removed : boolean; message : string };

/**
 * Removes a tag assignment from an object
 *
 * Deletes the relationship between a tag and an object, effectively
 * "untagging" the object. The tag itself remains in the system.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagRemoveParams} params - Tag removal parameters
 * @param {string} params.tag_slug - Required tag slug to identify the tag to remove
 * @param {string} params.id_object - Required object identifier
 * @param {string} params.module - Required module name that owns the object
 *
 * @returns {Promise<LiWEResponse<TagRemoveResult>>} Result object with success status and removal details
 *
 * @example
 * const result = await tag_remove_object(app, {
 *   tag_slug: 'javascript',
 *   id_object: 'project123',
 *   module: 'projects'
 * });
 */
export const tag_remove_object = async ( app : LiWEApp, params : TagRemoveParams ) : Promise<LiWEResponse<TagRemoveResult>> => {
	const validation = UntagObjectSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { tag_slug, id_object, module } = validation.data;

	const tag = await app.db.select().from( tags ).where( eq( tags.slug, tag_slug ) ).limit( 1 );

	if ( tag.length === 0 ) {
		return responseError( `Tag with slug '${tag_slug}' not found`, 404, 'TAG_NOT_FOUND' );
	}

	try {
		const result = await app.db.delete( taggables ).where(
			and(
				eq( taggables.tag_id, tag[0].id ),
				eq( taggables.module, module ),
				eq( taggables.id_object, id_object ),
			),
		).returning();

		return responseSuccess( {
			removed: result.length > 0,
			message: result.length > 0 ? 'Tag removed successfully' : 'Tag was not assigned to this object',
		} );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
