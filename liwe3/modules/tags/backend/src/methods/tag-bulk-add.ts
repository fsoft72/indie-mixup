/**
 * @fileoverview Bulk tag addition functionality
 */

import { LiWEApp, LiWEResponse, and, eq, inArray, responseError, responseSuccess, taggables, tags, z } from './utils';

/**
 * Schema for adding multiple tags to an object at once
 *
 * @property {string[]} tag_slugs - Array of tag slugs to add (min 1 required)
 * @property {string} id_object - Object identifier
 * @property {string} module - Module name that owns the object
 * @property {number} [relevance=1.0] - Relevance score for all tags (0-1, default 1.0)
 * @property {string} [updated_by] - Optional user ID who made the assignment
 * @property {boolean} [auto_tagged=false] - Whether tags were auto-assigned
 * @property {boolean} [overwrite_existing=false] - Whether to remove existing tags first
 */
const BulkTagObjectsSchema = z.object( {
	tag_slugs: z.array( z.string() ).min( 1, 'At least one tag slug is required' ),
	id_object: z.string().min( 1, 'Object ID is required' ),
	module: z.string().min( 1, 'Module is required' ),
	relevance: z.coerce.number().min( 0 ).max( 1 ).default( 1.0 ),
	updated_by: z.string().optional(),
	auto_tagged: z.coerce.boolean().default( false ),
	overwrite_existing: z.coerce.boolean().default( false ),
} );

/** Parameters for bulk adding tags to an object */
export type TagBulkAddParams = z.infer<typeof BulkTagObjectsSchema>;

/**
 * Single tag assignment result
 */
export interface TaggedObject {
	tag_slug : string;
	result : {
		id : number;
		tag_id : number;
		module : string;
		id_object : string;
		relevance_score : number | null;
		created : Date | null;
		updated : Date | null;
		updated_by : string | null;
		auto_tagged : boolean | null;
	};
}

/**
 * Tag assignment error
 */
export interface TagError {
	tag_slug : string;
	error : string;
}

/** Return type for bulk tag addition */
export type TagBulkAddResult = { tagged : TaggedObject[]; errors : TagError[]; summary : string };

/**
 * Adds multiple tags to an object at once
 *
 * Efficiently assigns multiple tags to a single object in a single operation.
 * Can optionally overwrite existing tag assignments and provides detailed
 * results about successes and failures.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagBulkAddParams} params - Bulk tag assignment parameters
 * @param {string[]} params.tag_slugs - Array of tag slugs to add (min 1 required)
 * @param {string} params.id_object - Object identifier
 * @param {string} params.module - Module name that owns the object
 * @param {number} [params.relevance=1.0] - Relevance score for all tags (0-1, default 1.0)
 * @param {string} [params.updated_by] - Optional user ID who made the assignment
 * @param {boolean} [params.auto_tagged=false] - Whether tags were auto-assigned
 * @param {boolean} [params.overwrite_existing=false] - Whether to remove existing tags first
 *
 * @returns {Promise<LiWEResponse<TagBulkAddResult>>} Result object with success status and detailed results
 *
 * @example
 * const result = await tag_bulk_add(app, {
 *   tag_slugs: ['javascript', 'react', 'frontend'],
 *   id_object: 'project123',
 *   module: 'projects',
 *   relevance: 0.9,
 *   overwrite_existing: true
 * });
 */
export const tag_bulk_add = async ( app : LiWEApp, params : TagBulkAddParams ) : Promise<LiWEResponse<TagBulkAddResult>> => {
	const validation = BulkTagObjectsSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { tag_slugs, id_object, module, relevance, updated_by, auto_tagged, overwrite_existing } = validation.data;

	try {
		const target_tags = await app.db
			.select( { id: tags.id, slug: tags.slug, name: tags.name } )
			.from( tags )
			.where( inArray( tags.slug, tag_slugs ) );

		if ( target_tags.length !== tag_slugs.length ) {
			const found_slugs = target_tags.map( ( t : any ) => t.slug );
			const missing_slugs = tag_slugs.filter( ( slug ) => !found_slugs.includes( slug ) );
			return responseError( `Tags not found: ${missing_slugs.join( ', ' )}`, 404, 'TAGS_NOT_FOUND' );
		}

		if ( overwrite_existing ) {
			await app.db.delete( taggables ).where(
				and(
					eq( taggables.module, module ),
					eq( taggables.id_object, id_object ),
				),
			);
		}

		const results = [];
		const errors = [];

		for ( const tag of target_tags ) {
			try {
				const result = await app.db.insert( taggables ).values( {
					tag_id: tag.id,
					module,
					id_object,
					relevance_score: relevance,
					updated_by,
					auto_tagged,
				} ).returning();

				results.push( { tag_slug: tag.slug, result: result[0] } );
			} catch ( error : any ) {
				if ( error.code === 'SQLITE_CONSTRAINT_UNIQUE' ) {
					errors.push( { tag_slug: tag.slug, error: 'Already tagged' } );
				} else {
					errors.push( { tag_slug: tag.slug, error: error.message } );
				}
			}
		}

		return responseSuccess( {
			tagged: results,
			errors: errors,
			summary: `${results.length} tags added, ${errors.length} errors`,
		} );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
