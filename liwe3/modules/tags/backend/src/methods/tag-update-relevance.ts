/**
 * @fileoverview Tag relevance update functionality
 */

import { LiWEApp, LiWEResponse, and, eq, responseError, responseSuccess, taggables, tags, z } from './utils';
import type { Taggable } from '../schema';

/**
 * Schema for updating the relevance score of a tag assignment
 *
 * @property {string} tag_slug - Tag slug to identify the tag
 * @property {string} id_object - Object identifier
 * @property {string} module - Module name that owns the object
 * @property {number} relevance - New relevance score (0-1)
 * @property {string} [updated_by] - Optional user ID who made the update
 */
const UpdateTagRelevanceSchema = z.object( {
	tag_slug: z.string().min( 1, 'Tag slug is required' ),
	id_object: z.string().min( 1, 'Object ID is required' ),
	module: z.string().min( 1, 'Module is required' ),
	relevance: z.coerce.number().min( 0 ).max( 1, 'Relevance must be between 0 and 1' ),
	updated_by: z.string().optional(),
} );

/** Parameters for updating tag relevance scores */
export type UpdateTagRelevanceParams = z.infer<typeof UpdateTagRelevanceSchema>;

/** Return type for tag relevance update */
export type TagUpdateRelevanceResult = { updated : Taggable };

/**
 * Updates the relevance score of a tag assignment
 *
 * Modifies the relevance score for an existing tag-object relationship.
 * The relevance score affects how the tag appears in searches and calculations.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {UpdateTagRelevanceParams} params - Relevance update parameters
 * @param {string} params.tag_slug - Tag slug to identify the tag
 * @param {string} params.id_object - Object identifier
 * @param {string} params.module - Module name that owns the object
 * @param {number} params.relevance - New relevance score (0-1)
 * @param {string} [params.updated_by] - Optional user ID who made the update
 *
 * @returns {Promise<LiWEResponse<TagUpdateRelevanceResult>>} Result object with success status and updated assignment
 *
 * @example
 * const result = await tag_update_relevance(app, {
 *   tag_slug: 'javascript',
 *   id_object: 'project123',
 *   module: 'projects',
 *   relevance: 0.8,
 *   updated_by: 'user456'
 * });
 */
export const tag_update_relevance = async ( app : LiWEApp, params : UpdateTagRelevanceParams ) : Promise<LiWEResponse<TagUpdateRelevanceResult>> => {
	const validation = UpdateTagRelevanceSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { tag_slug, id_object, module, relevance, updated_by } = validation.data;

	try {
		const tag = await app.db.select().from( tags ).where( eq( tags.slug, tag_slug ) ).limit( 1 );

		if ( tag.length === 0 ) {
			return responseError( `Tag with slug '${tag_slug}' not found`, 404, 'TAG_NOT_FOUND' );
		}

		const result = await app.db
			.update( taggables )
			.set( {
				relevance_score: relevance,
				updated: new Date(),
				updated_by,
			} )
			.where(
				and(
					eq( taggables.tag_id, tag[0].id ),
					eq( taggables.module, module ),
					eq( taggables.id_object, id_object ),
				),
			)
			.returning();

		if ( result.length === 0 ) {
			return responseError( 'Tag assignment not found for this object', 404, 'TAG_ASSIGNMENT_NOT_FOUND' );
		}

		return responseSuccess( { updated: result[0] } );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
