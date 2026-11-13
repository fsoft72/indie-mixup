/**
 * @fileoverview Tag affinity-based object finding functionality
 */

import { LiWEApp, LiWEResponse, and, count, desc, ne, responseError, responseSuccess, sql, taggables, tags, z } from './utils';

/**
 * Schema for finding objects with tag affinity to a source object
 *
 * @property {string} source_id_object - Source object ID to find similar objects for
 * @property {string} source_module - Module containing the source object
 * @property {string} target_module - Module to search for similar objects in
 * @property {number} [min_affinity_score=0.3] - Minimum affinity score (0+, default 0.3)
 * @property {number} [limit=10] - Maximum results to return (1-100, default 10)
 * @property {string[]} [exclude_objects=[]] - Object IDs to exclude from results
 */
const FindObjectAffinitySchema = z.object( {
	source_id_object: z.string().min( 1, 'Source object ID is required' ),
	source_module: z.string().min( 1, 'Source module is required' ),
	target_module: z.string().min( 1, 'Target module is required' ),
	min_affinity_score: z.coerce.number().min( 0 ).default( 0.3 ),
	limit: z.coerce.number().min( 1 ).max( 100 ).default( 10 ),
	exclude_objects: z.array( z.string() ).default( [] ),
} );

/** Parameters for finding objects with tag affinity to a source object */
export type TagFindByAffinityParams = z.infer<typeof FindObjectAffinitySchema>;

/**
 * Object found by affinity search with scoring information
 */
export interface ObjectWithAffinityScore {
	module : unknown;
	id_object : unknown;
	affinityScore : number;
	matchingTags : number;
	tagDetails : string;
}

/** Return type for finding objects by affinity */
export type TagFindByAffinityResult = { objects : ObjectWithAffinityScore[] };

/**
 * Finds objects with tag affinity to a source object
 *
 * Finds objects in the target module that share tags with the source object,
 * calculating affinity scores based on shared tag relevance and weights.
 * Useful for finding similar or related objects.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagFindByAffinityParams} params - Affinity-based object search parameters
 * @param {string} params.source_id_object - Source object ID to find similar objects for
 * @param {string} params.source_module - Module containing the source object
 * @param {string} params.target_module - Module to search for similar objects in
 * @param {number} [params.min_affinity_score=0.3] - Minimum affinity score (0+, default 0.3)
 * @param {number} [params.limit=10] - Maximum results to return (1-100, default 10)
 * @param {string[]} [params.exclude_objects=[]] - Object IDs to exclude from results
 *
 * @returns {Promise<LiWEResponse<TagFindByAffinityResult>>} Result object with success status and similar objects
 *
 * @example
 * const result = await tag_find_by_affinity(app, {
 *   source_id_object: 'project123',
 *   source_module: 'projects',
 *   target_module: 'articles',
 *   min_affinity_score: 0.4,
 *   limit: 5
 * });
 */
export const tag_find_by_affinity = async ( app : LiWEApp, params : TagFindByAffinityParams ) : Promise<LiWEResponse<TagFindByAffinityResult>> => {
	const validation = FindObjectAffinitySchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const {
		source_id_object,
		source_module,
		target_module,
		min_affinity_score,
		limit,
		exclude_objects,
	} = validation.data;

	try {
		const conditions = [
			sql`target_tags.module = '${target_module}'`,
			ne( sql`target_tags.id_object`, source_id_object ),
		];

		if ( exclude_objects.length > 0 ) {
			conditions.push( sql`target_tags.id_object NOT IN (${exclude_objects.map( ( o ) => `'${o}'` ).join( ',' )})` );
		}

		const result = await app.db
			.select( {
				module: sql`target_tags.module`,
				id_object: sql`target_tags.id_object`,
				affinityScore: sql<number>`
          SUM(
            source_tags.relevance_score *
            target_tags.relevance_score *
            ${tags.weight}
          )`.as( 'affinity_score' ),
				matchingTags: count( tags.id ).as( 'matching_tags' ),
				tagDetails: sql<string>`GROUP_CONCAT(${tags.name} || ':' || target_tags.relevance_score)`.as( 'tag_details' ),
			} )
			.from( sql`${taggables} AS target_tags` )
			.innerJoin( tags, sql`target_tags.tag_id = ${tags.id}` )
			.innerJoin(
				sql`${taggables} AS source_tags`,
				and(
					sql`source_tags.module = '${source_module}'`,
					sql`source_tags.id_object = '${source_id_object}'`,
					sql`source_tags.tag_id = ${tags.id}`,
				),
			)
			.where( and( ...conditions ) )
			.groupBy( sql`target_tags.id_object` )
			.having( sql`affinity_score >= ${min_affinity_score}` )
			.orderBy( desc( sql`affinity_score` ) )
			.limit( limit );

		return responseSuccess( { objects: result } );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
