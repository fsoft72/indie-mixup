/**
 * @fileoverview Tag statistics functionality
 */

import { LiWEApp, LiWEResponse, and, avg, count, desc, eq, responseError, responseSuccess, sql, taggables, tags, z } from './utils';

/**
 * Schema for retrieving tag usage statistics
 *
 * @property {string} [tag_slug] - Optional specific tag slug to get stats for
 * @property {string} [category] - Optional category filter
 * @property {string} [module] - Optional module filter
 * @property {boolean} [include_inactive=false] - Whether to include inactive tags
 * @property {number} [limit=20] - Maximum results to return (1-100, default 20)
 */
const GetTagStatsSchema = z.object( {
	tag_slug: z.string().optional(),
	category: z.string().optional(),
	module: z.string().optional(),
	include_inactive: z.coerce.boolean().default( false ),
	limit: z.coerce.number().min( 1 ).max( 100 ).default( 20 ),
} );

/** Parameters for retrieving tag statistics */
export type TagStatsParams = z.infer<typeof GetTagStatsSchema>;

/**
 * Tag usage statistics
 */
export interface TagUsageStats {
	tagId : number;
	tagName : string;
	tagSlug : string;
	category : string | null;
	weight : number | null;
	totalUsage : number;
	avgRelevance : string | null;
	moduleBreakdown : string;
	autoTaggedCount : number;
	manualTaggedCount : number;
	lastUsed : number;
}

/** Return type for tag statistics */
export type TagStatsResult = { stats : TagUsageStats[] };

/**
 * Retrieves comprehensive tag usage statistics
 *
 * Provides detailed statistics about tag usage including total usage counts,
 * average relevance scores, module breakdown, and auto vs manual tagging ratios.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagStatsParams} [params={}] - Statistics query parameters
 * @param {string} [params.tag_slug] - Optional specific tag slug to get stats for
 * @param {string} [params.category] - Optional category filter
 * @param {string} [params.module] - Optional module filter
 * @param {boolean} [params.include_inactive=false] - Whether to include inactive tags
 * @param {number} [params.limit=20] - Maximum results to return (1-100, default 20)
 *
 * @returns {Promise<LiWEResponse<TagStatsResult>>} Result object with success status and statistics
 *
 * @example
 * const result = await tag_stats(app, {
 *   category: 'programming',
 *   include_inactive: false,
 *   limit: 50
 * });
 *
 * if (result.ok) {
 *   result.data.stats.forEach(stat => {
 *     console.log(`${stat.tagName}: ${stat.totalUsage} uses, avg relevance ${stat.avgRelevance}`);
 *   });
 * }
 */
export const tag_stats = async ( app : LiWEApp, params : TagStatsParams = {} as TagStatsParams ) : Promise<LiWEResponse<TagStatsResult>> => {
	const validation = GetTagStatsSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { tag_slug, category, module, include_inactive, limit } = validation.data;

	try {
		const conditions = [];

		if ( !include_inactive ) {
			conditions.push( eq( tags.is_active, true ) );
		}

		if ( category ) {
			conditions.push( eq( tags.category, category ) );
		}

		if ( tag_slug ) {
			conditions.push( eq( tags.slug, tag_slug ) );
		}

		const baseQuery = app.db
			.select( {
				tagId: tags.id,
				tagName: tags.name,
				tagSlug: tags.slug,
				category: tags.category,
				weight: tags.weight,
				totalUsage: count( taggables.id ).as( 'total_usage' ),
				avgRelevance: avg( taggables.relevance_score ).as( 'avg_relevance' ),
				moduleBreakdown: sql<string>`GROUP_CONCAT(${taggables.module} || ':' || COUNT(*))`.as( 'module_breakdown' ),
				autoTaggedCount: sql<number>`SUM(CASE WHEN ${taggables.auto_tagged} = 1 THEN 1 ELSE 0 END)`.as( 'auto_tagged_count' ),
				manualTaggedCount: sql<number>`SUM(CASE WHEN ${taggables.auto_tagged} = 0 THEN 1 ELSE 0 END)`.as( 'manual_tagged_count' ),
				lastUsed: sql<number>`MAX(${taggables.created})`.as( 'last_used' ),
			} )
			.from( tags );

		const conditionsQuery = conditions.length > 0
			? baseQuery.where( and( ...conditions ) )
			: baseQuery;

		const joinQuery = conditionsQuery.leftJoin(
			taggables,
			module
				? and(
					eq( tags.id, taggables.tag_id ),
					eq( taggables.module, module ),
				)
				: eq( tags.id, taggables.tag_id ),
		);

		const result = await joinQuery
			.groupBy( tags.id )
			.orderBy( desc( count( taggables.id ) ) )
			.limit( limit );

		return responseSuccess( { stats: result } );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
