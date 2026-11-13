/**
 * @fileoverview Tag-based object finding functionality
 */

import { LiWEApp, LiWEResponse, and, count, desc, eq, inArray, responseError, responseSuccess, sql, taggables, tags, z } from './utils';

/**
 * Schema for finding objects that have specific tags
 *
 * @property {string[]} tag_slugs - Array of tag slugs to search for (min 1 required)
 * @property {string} target_module - Module to search within
 * @property {'any'|'all'} [match_type='any'] - Whether to match 'any' or 'all' tags
 * @property {number} [min_affinity_score=0.1] - Minimum affinity score for results (0+)
 * @property {number} [limit=20] - Maximum results to return (1-100)
 * @property {string[]} [exclude_objects=[]] - Object IDs to exclude from results
 * @property {boolean} [active_tags_only=true] - Whether to consider only active tags
 */
const FindObjectsByTagsSchema = z.object( {
	tag_slugs: z.array( z.string() ).min( 1, 'At least one tag slug is required' ),
	target_module: z.string().min( 1, 'Target module is required' ),
	match_type: z.enum( [ 'any', 'all' ] ).default( 'any' ),
	min_affinity_score: z.coerce.number().min( 0 ).default( 0.1 ),
	limit: z.coerce.number().min( 1 ).max( 100 ).default( 20 ),
	exclude_objects: z.array( z.string() ).default( [] ),
	active_tags_only: z.coerce.boolean().default( true ),
} );

/** Parameters for finding objects by their tags */
export type TagFindByTagsParams = z.infer<typeof FindObjectsByTagsSchema>;

/**
 * Object found by tag search with affinity information
 */
export interface ObjectWithAffinity {
	module : string;
	id_object : string;
	affinityScore : number;
	matchingTags : number;
	tagDetails : string;
}

/** Return type for finding objects by tags */
export type TagFindByTagsResult = { objects : ObjectWithAffinity[] };

/**
 * Finds objects that have specific tags
 *
 * Searches for objects within a target module that are tagged with the specified tags.
 * Can match objects that have 'any' or 'all' of the provided tags, and calculates
 * affinity scores based on tag weights and relevance scores.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagFindByTagsParams} params - Tag-based object search parameters
 * @param {string[]} params.tag_slugs - Array of tag slugs to search for (min 1 required)
 * @param {string} params.target_module - Module to search within
 * @param {'any'|'all'} [params.match_type='any'] - Whether to match 'any' or 'all' tags
 * @param {number} [params.min_affinity_score=0.1] - Minimum affinity score for results (0+)
 * @param {number} [params.limit=20] - Maximum results to return (1-100)
 * @param {string[]} [params.exclude_objects=[]] - Object IDs to exclude from results
 * @param {boolean} [params.active_tags_only=true] - Whether to consider only active tags
 *
 * @returns {Promise<LiWEResponse<TagFindByTagsResult>>} Result object with success status and matching objects
 *
 * @example
 * const result = await tag_find_by_tags(app, {
 *   tag_slugs: ['javascript', 'react'],
 *   target_module: 'projects',
 *   match_type: 'all',
 *   min_affinity_score: 0.5,
 *   limit: 10
 * });
 */
export const tag_find_by_tags = async ( app : LiWEApp, params : TagFindByTagsParams ) : Promise<LiWEResponse<TagFindByTagsResult>> => {
	const validation = FindObjectsByTagsSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const {
		tag_slugs,
		target_module,
		match_type,
		min_affinity_score,
		limit,
		exclude_objects,
		active_tags_only,
	} = validation.data;

	try {
		const tag_conditions = active_tags_only
			? and( inArray( tags.slug, tag_slugs ), eq( tags.is_active, true ) )
			: inArray( tags.slug, tag_slugs );

		const target_tags = await app.db
			.select( { id: tags.id, slug: tags.slug, weight: tags.weight } )
			.from( tags )
			.where( tag_conditions );

		if ( target_tags.length === 0 ) {
			return responseError( 'No valid tags found', 404, 'NO_VALID_TAGS' );
		}

		const tag_ids = target_tags.map( ( t : any ) => t.id );

		const conditions = [
			eq( taggables.module, target_module ),
			inArray( taggables.tag_id, tag_ids ),
		];

		if ( exclude_objects.length > 0 ) {
			conditions.push( sql`${taggables.id_object} NOT IN (${exclude_objects.map( ( o ) => `'${o}'` ).join( ',' )})` );
		}

		const havingConditions = [];

		if ( match_type === 'all' ) {
			havingConditions.push( sql`COUNT(DISTINCT ${tags.id}) = ${target_tags.length}` );
		}

		if ( min_affinity_score > 0 ) {
			havingConditions.push( sql`affinity_score >= ${min_affinity_score}` );
		}

		const baseQuery = app.db
			.select( {
				module: taggables.module,
				id_object: taggables.id_object,
				affinityScore: sql<number>`
          SUM(${taggables.relevance_score} * ${tags.weight})
        `.as( 'affinity_score' ),
				matchingTags: count( tags.id ).as( 'matching_tags' ),
				tagDetails: sql<string>`GROUP_CONCAT(${tags.name} || ':' || ${taggables.relevance_score})`.as( 'tag_details' ),
			} )
			.from( taggables )
			.innerJoin( tags, eq( taggables.tag_id, tags.id ) )
			.where( and( ...conditions ) )
			.groupBy( taggables.id_object );

		const finalQuery = havingConditions.length > 0
			? baseQuery.having( and( ...havingConditions ) )
			: baseQuery;

		const result = await finalQuery
			.orderBy( desc( sql`affinity_score` ) )
			.limit( limit );

		return responseSuccess( { objects: result } );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
