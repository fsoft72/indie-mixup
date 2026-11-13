/**
 * @fileoverview Tag listing by module functionality
 */

import { LiWEApp, LiWEResponse, and, avg, count, desc, eq, inArray, responseError, responseSuccess, sql, taggables, tags, z } from './utils';

/**
 * Schema for listing objects within a module with their tag information
 *
 * @property {string} module - Module name to search within
 * @property {string[]} [tag_slugs] - Optional tag slugs to filter by
 * @property {number} [min_tag_count=0] - Minimum number of tags an object must have
 * @property {number} [max_tag_count] - Optional maximum number of tags an object can have
 * @property {number} [limit=100] - Maximum results to return (1-1000, default 100)
 * @property {number} [offset=0] - Results offset for pagination (0+, default 0)
 */
const GetObjectsByModuleSchema = z.object( {
	module: z.string().min( 1, 'Module is required' ),
	tag_slugs: z.array( z.string() ).optional(),
	min_tag_count: z.coerce.number().min( 0 ).default( 0 ),
	max_tag_count: z.coerce.number().optional(),
	limit: z.coerce.number().min( 1 ).max( 1000 ).default( 100 ),
	offset: z.coerce.number().min( 0 ).default( 0 ),
} );

/** Parameters for listing objects within a module */
export type TagListByModuleParams = z.infer<typeof GetObjectsByModuleSchema>;

/**
 * Object with aggregated tag information
 */
export interface ObjectWithTagInfo {
	id_object : string;
	tagCount : number;
	avgRelevance : string | null;
	tagList : string;
	tagSlugs : string;
}

/** Return type for module object listing */
export type TagListByModuleResult = { objects : ObjectWithTagInfo[] };

/**
 * Lists objects within a module with their tag information
 *
 * Retrieves objects from a specific module along with their tag counts,
 * average relevance scores, and tag lists. Useful for getting an overview
 * of how objects in a module are tagged.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagListByModuleParams} params - Module object listing parameters
 * @param {string} params.module - Module name to search within
 * @param {string[]} [params.tag_slugs] - Optional tag slugs to filter by
 * @param {number} [params.min_tag_count=0] - Minimum number of tags an object must have
 * @param {number} [params.max_tag_count] - Optional maximum number of tags an object can have
 * @param {number} [params.limit=100] - Maximum results to return (1-1000, default 100)
 * @param {number} [params.offset=0] - Results offset for pagination (0+, default 0)
 *
 * @returns {Promise<LiWEResponse<TagListByModuleResult>>} Result object with success status and object list
 *
 * @example
 * const result = await tag_list_by_module(app, {
 *   module: 'projects',
 *   min_tag_count: 2,
 *   limit: 50
 * });
 */
export const tag_list_by_module = async ( app : LiWEApp, params : TagListByModuleParams ) : Promise<LiWEResponse<TagListByModuleResult>> => {
	const validation = GetObjectsByModuleSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { module, tag_slugs, min_tag_count, max_tag_count, limit, offset } = validation.data;

	try {
		const conditions = [ eq( taggables.module, module ) ];

		if ( tag_slugs && tag_slugs.length > 0 ) {
			conditions.push( inArray( tags.slug, tag_slugs ) );
		}

		let query = app.db
			.select( {
				id_object: taggables.id_object,
				tagCount: count( taggables.tag_id ).as( 'tag_count' ),
				avgRelevance: avg( taggables.relevance_score ).as( 'avg_relevance' ),
				tagList: sql<string>`GROUP_CONCAT(${tags.name})`.as( 'tag_list' ),
				tagSlugs: sql<string>`GROUP_CONCAT(${tags.slug})`.as( 'tag_slugs' ),
			} )
			.from( taggables )
			.innerJoin( tags, eq( taggables.tag_id, tags.id ) )
			.where( and( ...conditions ) );

		const baseQuery = query.groupBy( taggables.id_object );

		const having_conditions = [];
		if ( min_tag_count > 0 ) {
			having_conditions.push( sql`COUNT(${taggables.tag_id}) >= ${min_tag_count}` );
		}
		if ( max_tag_count ) {
			having_conditions.push( sql`COUNT(${taggables.tag_id}) <= ${max_tag_count}` );
		}

		const finalQuery = having_conditions.length > 0
			? baseQuery.having( and( ...having_conditions ) )
			: baseQuery;

		const result = await finalQuery
			.orderBy( desc( count( taggables.tag_id ) ) )
			.limit( limit )
			.offset( offset );

		return responseSuccess( { objects: result } );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
