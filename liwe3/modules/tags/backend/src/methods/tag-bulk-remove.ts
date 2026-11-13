/**
 * @fileoverview Bulk tag removal functionality
 */

import { LiWEApp, LiWEResponse, and, eq, inArray, responseError, responseSuccess, taggables, tags, z } from './utils';

/**
 * Schema for removing multiple tags from an object at once
 *
 * @property {string[]} tag_slugs - Array of tag slugs to remove (min 1 required)
 * @property {string} id_object - Object identifier
 * @property {string} module - Module name that owns the object
 */
const BulkUntagObjectsSchema = z.object( {
	tag_slugs: z.array( z.string() ).min( 1, 'At least one tag slug is required' ),
	id_object: z.string().min( 1, 'Object ID is required' ),
	module: z.string().min( 1, 'Module is required' ),
} );

/** Parameters for bulk removing tags from an object */
export type TagBulkRemoveParams = z.infer<typeof BulkUntagObjectsSchema>;

/** Return type for bulk tag removal */
export type TagBulkRemoveResult = { removed_count : number; message : string };

/**
 * Removes multiple tags from an object at once
 *
 * Efficiently removes multiple tag assignments from a single object.
 * Only removes tags that actually exist and are assigned to the object.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagBulkRemoveParams} params - Bulk tag removal parameters
 * @param {string[]} params.tag_slugs - Array of tag slugs to remove (min 1 required)
 * @param {string} params.id_object - Object identifier
 * @param {string} params.module - Module name that owns the object
 *
 * @returns {Promise<LiWEResponse<TagBulkRemoveResult>>} Result object with success status and removal details
 *
 * @example
 * const result = await tag_bulk_remove(app, {
 *   tag_slugs: ['outdated', 'deprecated'],
 *   id_object: 'project123',
 *   module: 'projects'
 * });
 */
export const tag_bulk_remove = async ( app : LiWEApp, params : TagBulkRemoveParams ) : Promise<LiWEResponse<TagBulkRemoveResult>> => {
	const validation = BulkUntagObjectsSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { tag_slugs, id_object, module } = validation.data;

	try {
		const target_tags = await app.db
			.select( { id: tags.id, slug: tags.slug } )
			.from( tags )
			.where( inArray( tags.slug, tag_slugs ) );

		if ( target_tags.length === 0 ) {
			return responseError( 'No valid tags found', 404, 'NO_VALID_TAGS' );
		}

		const tag_ids = target_tags.map( ( t : any ) => t.id );

		const result = await app.db.delete( taggables ).where(
			and(
				eq( taggables.module, module ),
				eq( taggables.id_object, id_object ),
				inArray( taggables.tag_id, tag_ids ),
			),
		).returning();

		return responseSuccess( {
			removed_count: result.length,
			message: `Removed ${result.length} tags from ${module}:${id_object}`,
		} );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
