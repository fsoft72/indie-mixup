/**
 * @fileoverview Tag object assignment functionality
 */

import { LiWEApp, LiWEResponse, eq, responseError, responseSuccess, taggables, tags, z } from './utils';
import type { Taggable } from '../schema';

/**
 * Schema for tagging objects with specific tags
 *
 * @property {string} tag_slug - Required tag slug to identify the tag
 * @property {string} id_object - Required object identifier
 * @property {string} module - Required module name that owns the object
 * @property {number} [relevance=1.0] - Relevance score between 0 and 1 (default 1.0)
 * @property {string} [updated_by] - Optional user ID who created the tag assignment
 * @property {boolean} [auto_tagged=false] - Whether tag was auto-assigned (default false)
 */
const TagObjectSchema = z.object( {
	tag_slug: z.string().min( 1, 'Tag slug is required' ),
	id_object: z.string().min( 1, 'Object ID is required' ),
	module: z.string().min( 1, 'Module is required' ),
	relevance: z.coerce.number().min( 0 ).max( 1 ).default( 1.0 ),
	updated_by: z.string().optional(),
	auto_tagged: z.coerce.boolean().default( false ),
} );

/** Parameters for assigning a tag to an object */
export type TagObjectParams = z.infer<typeof TagObjectSchema>;

/** Return type for tag assignment */
export type TagObjectResult = { taggable : Taggable };

/**
 * Assigns a tag to an object
 *
 * Creates a tag assignment relationship between a tag (identified by slug)
 * and an object (identified by module and object ID). The assignment includes
 * a relevance score and metadata about who created it and when.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagObjectParams} params - Tag assignment parameters
 * @param {string} params.tag_slug - Required tag slug to identify the tag
 * @param {string} params.id_object - Required object identifier
 * @param {string} params.module - Required module name that owns the object
 * @param {number} [params.relevance=1.0] - Relevance score between 0 and 1 (default 1.0)
 * @param {string} [params.updated_by] - Optional user ID who created the assignment
 * @param {boolean} [params.auto_tagged=false] - Whether tag was auto-assigned (default false)
 *
 * @returns {Promise<LiWEResponse<TagObjectResult>>} Result object with success status and assignment data or error details
 *
 * @example
 * const result = await tag_object(app, {
 *   tag_slug: 'javascript',
 *   id_object: 'project123',
 *   module: 'projects',
 *   relevance: 0.9,
 *   updated_by: 'user456'
 * });
 */
export const tag_object = async ( app : LiWEApp, params : TagObjectParams ) : Promise<LiWEResponse<TagObjectResult>> => {
	const validation = TagObjectSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { tag_slug, id_object, module, relevance, updated_by, auto_tagged } = validation.data;

	const tag = await app.db.select().from( tags ).where( eq( tags.slug, tag_slug ) ).limit( 1 );

	if ( tag.length === 0 ) {
		return responseError( `Tag with slug '${tag_slug}' not found`, 404, 'TAG_NOT_FOUND' );
	}

	try {
		const result = await app.db.insert( taggables ).values( {
			tag_id: tag[0].id,
			module,
			id_object,
			relevance_score: relevance,
			updated_by,
			auto_tagged,
		} ).returning();

		return responseSuccess( { taggable: result[0] } );
	} catch ( error : any ) {
		if ( error.code === 'SQLITE_CONSTRAINT_UNIQUE' ) {
			return responseError( 'Object already has this tag', 400, 'DUPLICATE_TAG_ASSIGNMENT' );
		}
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
