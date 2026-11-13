/**
 * @fileoverview Tag listing by object functionality
 */

import { LiWEApp, LiWEResponse, and, desc, eq, responseError, responseSuccess, taggables, tags, z } from './utils';

/**
 * Schema for retrieving all tags assigned to an object
 *
 * @property {string} id_object - Required object identifier
 * @property {string} module - Required module name that owns the object
 * @property {boolean} [active_only=true] - Whether to include only active tags (default true)
 */
const GetObjectTagsSchema = z.object( {
	id_object: z.string().min( 1, 'Object ID is required' ),
	module: z.string().min( 1, 'Module is required' ),
	active_only: z.coerce.boolean().default( true ),
} );

/** Parameters for listing tags assigned to an object */
export type TagListByObjectParams = z.infer<typeof GetObjectTagsSchema>;

/**
 * Tag information with assignment metadata
 */
export interface TagWithAssignmentInfo {
	tagId : number;
	tagName : string;
	tagSlug : string;
	category : string | null;
	color : string | null;
	weight : number | null;
	relevanceScore : number | null;
	created : Date | null;
	updated : Date | null;
	updated_by : string | null;
	auto_tagged : boolean | null;
}

/** Return type for object tag listing */
export type TagListByObjectResult = { tags : TagWithAssignmentInfo[] };

/**
 * Retrieves all tags assigned to a specific object
 *
 * Returns a list of all tags associated with an object, including tag details
 * and assignment metadata like relevance scores and creation timestamps.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagListByObjectParams} params - Object tag listing parameters
 * @param {string} params.id_object - Required object identifier
 * @param {string} params.module - Required module name that owns the object
 * @param {boolean} [params.active_only=true] - Whether to include only active tags (default true)
 *
 * @returns {Promise<LiWEResponse<TagListByObjectResult>>} Result object with success status and tag list
 *
 * @example
 * const result = await tag_list_by_object(app, {
 *   id_object: 'project123',
 *   module: 'projects',
 *   active_only: true
 * });
 *
 * if (result.ok) {
 *   result.data.tags.forEach(tag => {
 *     console.log(`${tag.tagName} (${tag.relevanceScore})`);
 *   });
 * }
 */
export const tag_list_by_object = async ( app : LiWEApp, params : TagListByObjectParams ) : Promise<LiWEResponse<TagListByObjectResult>> => {
	const validation = GetObjectTagsSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { id_object, module, active_only } = validation.data;

	try {
		const conditions = [
			eq( taggables.module, module ),
			eq( taggables.id_object, id_object ),
		];

		if ( active_only ) {
			conditions.push( eq( tags.is_active, true ) );
		}

		const result = await app.db
			.select( {
				tagId: tags.id,
				tagName: tags.name,
				tagSlug: tags.slug,
				category: tags.category,
				color: tags.color,
				weight: tags.weight,
				relevanceScore: taggables.relevance_score,
				created: taggables.created,
				updated: taggables.updated,
				updated_by: taggables.updated_by,
				auto_tagged: taggables.auto_tagged,
			} )
			.from( taggables )
			.innerJoin( tags, eq( taggables.tag_id, tags.id ) )
			.where( and( ...conditions ) )
			.orderBy( desc( taggables.relevance_score ) );

		return responseSuccess( { tags: result } );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
