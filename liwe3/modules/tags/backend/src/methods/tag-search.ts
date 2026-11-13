/**
 * @fileoverview Tag search functionality
 */

import { LiWEApp, LiWEResponse, and, asc, eq, like, or, responseError, responseSuccess, tags, z } from './utils';
import type { Tag } from '../schema';

/**
 * Schema for searching tags by name, slug, or description
 *
 * @property {string} [query] - Optional search query (searches name, slug, description)
 * @property {string} [category] - Optional category filter
 * @property {boolean} [active_only=true] - Whether to include only active tags
 * @property {number} [limit=20] - Maximum results to return (1-100, default 20)
 * @property {number} [offset=0] - Results offset for pagination (0+, default 0)
 */
const SearchTagsSchema = z.object( {
	query: z.string().optional(),
	category: z.string().optional(),
	active_only: z.coerce.boolean().default( true ),
	limit: z.coerce.number().min( 1 ).max( 100 ).default( 20 ),
	offset: z.coerce.number().min( 0 ).default( 0 ),
} );

/** Parameters for searching tags */
export type TagSearchParams = z.infer<typeof SearchTagsSchema>;

/** Return type for tag search */
export type TagSearchResult = { tags : Tag[] };

/**
 * Searches for tags by name, slug, or description
 *
 * Performs a text search across tag names, slugs, and descriptions.
 * Results can be filtered by category and active status, with pagination support.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagSearchParams} params - Tag search parameters
 * @param {string} [params.query] - Optional search query (searches name, slug, description)
 * @param {string} [params.category] - Optional category filter
 * @param {boolean} [params.active_only=true] - Whether to include only active tags
 * @param {number} [params.limit=20] - Maximum results to return (1-100, default 20)
 * @param {number} [params.offset=0] - Results offset for pagination (0+, default 0)
 *
 * @returns {Promise<LiWEResponse<TagSearchResult>>} Result object with success status and matching tags
 *
 * @example
 * const result = await tag_search(app, {
 *   query: 'javascript',
 *   category: 'programming',
 *   active_only: true,
 *   limit: 10
 * });
 */
export const tag_search = async ( app : LiWEApp, params : TagSearchParams ) : Promise<LiWEResponse<TagSearchResult>> => {
	const validation = SearchTagsSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { query, category, active_only, limit, offset } = validation.data;

	try {
		const conditions = [];

		if ( active_only ) {
			conditions.push( eq( tags.is_active, true ) );
		}

		if ( category ) {
			conditions.push( eq( tags.category, category ) );
		}

		if ( query ) {
			conditions.push(
				or(
					like( tags.name, `%${query}%` ),
					like( tags.slug, `%${query}%` ),
					like( tags.description, `%${query}%` ),
				),
			);
		}

		const result = await app.db
			.select( {
				id: tags.id,
				name: tags.name,
				slug: tags.slug,
				description: tags.description,
				color: tags.color,
				category: tags.category,
				weight: tags.weight,
				is_active: tags.is_active,
				created: tags.created,
				updated: tags.updated,
				updated_by: tags.updated_by,
			} )
			.from( tags )
			.where( conditions.length > 0 ? and( ...conditions ) : undefined )
			.orderBy( asc( tags.name ) )
			.limit( limit )
			.offset( offset );

		return responseSuccess( { tags: result } );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
