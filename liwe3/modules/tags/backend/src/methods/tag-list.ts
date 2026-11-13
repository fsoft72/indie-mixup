/**
 * @fileoverview Tag listing functionality with pagination
 */

import { LiWEApp, LiWEResponse, and, asc, count, desc, eq, responseError, responseSuccess, tags, z } from './utils';
import type { Tag } from '../schema';

/**
 * Schema for listing tags with pagination support
 *
 * @property {number} [limit=20] - Maximum number of tags to return (1-100, default 20)
 * @property {number} [offset=0] - Starting row for pagination (0+, default 0)
 * @property {string} [category] - Optional category filter
 * @property {boolean} [active_only=true] - Whether to include only active tags
 * @property {'name'|'created'|'updated'|'weight'} [order_by='name'] - Field to order by
 * @property {'asc'|'desc'} [order_direction='asc'] - Sort direction
 */
const ListTagsSchema = z.object( {
	limit: z.coerce.number().min( 1 ).max( 100 ).default( 20 ),
	offset: z.coerce.number().min( 0 ).default( 0 ),
	category: z.string().optional(),
	active_only: z.coerce.boolean().default( true ),
	order_by: z.enum( [ 'name', 'created', 'updated', 'weight' ] ).default( 'name' ),
	order_direction: z.enum( [ 'asc', 'desc' ] ).default( 'asc' ),
} );

/** Parameters for listing tags */
export type TagListParams = z.input<typeof ListTagsSchema>;

/** Return type for tag listing */
export type TagListResult = { tags : Tag[]; total : number };

/**
 * Lists tags with pagination and filtering support
 *
 * Retrieves a paginated list of tags from the database. Results can be filtered
 * by category and active status, and ordered by various fields.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagListParams} params - Tag listing parameters
 * @param {number} [params.limit=20] - Maximum number of tags to return (1-100, default 20)
 * @param {number} [params.offset=0] - Starting row for pagination (0+, default 0)
 * @param {string} [params.category] - Optional category filter
 * @param {boolean} [params.active_only=true] - Whether to include only active tags
 * @param {'name'|'created'|'updated'|'weight'} [params.order_by='name'] - Field to order by
 * @param {'asc'|'desc'} [params.order_direction='asc'] - Sort direction
 *
 * @returns {Promise<LiWEResponse<TagListResult>>} Result object with success status, tags array, and total count
 *
 * @example
 * const result = await tag_list(app, {
 *   limit: 10,
 *   offset: 0,
 *   category: 'programming',
 *   active_only: true,
 *   order_by: 'name',
 *   order_direction: 'asc'
 * });
 *
 * if (result.ok) {
 *   console.log(`Found ${result.data.total} tags, showing ${result.data.tags.length}`);
 *   result.data.tags.forEach(tag => console.log(tag.name));
 * }
 */
export const tag_list = async ( app : LiWEApp, params : TagListParams ) : Promise<LiWEResponse<TagListResult>> => {
	const validation = ListTagsSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { limit, offset, category, active_only, order_by, order_direction } = validation.data;

	try {
		// Build filter conditions
		const conditions = [];

		if ( active_only ) {
			conditions.push( eq( tags.is_active, true ) );
		}

		if ( category ) {
			conditions.push( eq( tags.category, category ) );
		}

		const whereClause = conditions.length > 0 ? and( ...conditions ) : undefined;

		// Get total count for pagination
		const [ countResult ] = await app.db
			.select( { count: count() } )
			.from( tags )
			.where( whereClause );

		const total = countResult?.count || 0;

		// Determine sort order
		let orderByClause;
		const orderFn = order_direction === 'desc' ? desc : asc;

		switch ( order_by ) {
			case 'created':
				orderByClause = orderFn( tags.created );
				break;
			case 'updated':
				orderByClause = orderFn( tags.updated );
				break;
			case 'weight':
				orderByClause = orderFn( tags.weight );
				break;
			case 'name':
			default:
				orderByClause = orderFn( tags.name );
				break;
		}

		// Get paginated results
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
			.where( whereClause )
			.orderBy( orderByClause )
			.limit( limit )
			.offset( offset );

		return responseSuccess( { tags: result, total } );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
