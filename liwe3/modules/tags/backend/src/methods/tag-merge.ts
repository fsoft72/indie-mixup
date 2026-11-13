/**
 * @fileoverview Tag merging functionality
 */

import { LiWEApp, LiWEResponse, eq, responseError, responseSuccess, taggables, tags, z } from './utils';

/**
 * Schema for merging two tags (moving all assignments from source to target)
 *
 * @property {string} source_tag_slug - Tag slug to merge from (will be deactivated)
 * @property {string} target_tag_slug - Tag slug to merge to (receives all assignments)
 * @property {string} [updated_by] - Optional user ID who performed the merge
 */
const MergeTagsSchema = z.object( {
	source_tag_slug: z.string().min( 1, 'Source tag slug is required' ),
	target_tag_slug: z.string().min( 1, 'Target tag slug is required' ),
	updated_by: z.string().optional(),
} );

/** Parameters for merging two tags */
export type TagMergeParams = z.infer<typeof MergeTagsSchema>;

/** Return type for tag merging */
export type TagMergeResult = { merged_count : number; skipped_count : number; message : string };

/**
 * Merges two tags by moving all assignments from source to target
 *
 * Consolidates two tags by moving all object assignments from the source tag
 * to the target tag, then deactivating the source tag. Handles duplicate
 * assignments gracefully by removing them instead of failing.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagMergeParams} params - Tag merge parameters
 * @param {string} params.source_tag_slug - Tag slug to merge from (will be deactivated)
 * @param {string} params.target_tag_slug - Tag slug to merge to (receives all assignments)
 * @param {string} [params.updated_by] - Optional user ID who performed the merge
 *
 * @returns {Promise<LiWEResponse<TagMergeResult>>} Result object with success status and merge details
 *
 * @example
 * const result = await tag_merge(app, {
 *   source_tag_slug: 'js',
 *   target_tag_slug: 'javascript',
 *   updated_by: 'admin123'
 * });
 *
 * if (result.ok) {
 *   console.log(`Merged ${result.data.merged_count} assignments, skipped ${result.data.skipped_count} duplicates`);
 * }
 */
export const tag_merge = async ( app : LiWEApp, params : TagMergeParams ) : Promise<LiWEResponse<TagMergeResult>> => {
	const validation = MergeTagsSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { source_tag_slug, target_tag_slug, updated_by } = validation.data;

	if ( source_tag_slug === target_tag_slug ) {
		return responseError( 'Source and target tags cannot be the same', 400, 'INVALID_MERGE_REQUEST' );
	}

	try {
		const [ source_tag, target_tag ] = await Promise.all( [
			app.db.select().from( tags ).where( eq( tags.slug, source_tag_slug ) ).limit( 1 ),
			app.db.select().from( tags ).where( eq( tags.slug, target_tag_slug ) ).limit( 1 ),
		] );

		if ( source_tag.length === 0 ) {
			return responseError( `Source tag '${source_tag_slug}' not found`, 404, 'SOURCE_TAG_NOT_FOUND' );
		}
		if ( target_tag.length === 0 ) {
			return responseError( `Target tag '${target_tag_slug}' not found`, 404, 'TARGET_TAG_NOT_FOUND' );
		}

		const source_assignments = await app.db
			.select()
			.from( taggables )
			.where( eq( taggables.tag_id, source_tag[0].id ) );

		let merged_count = 0;
		let skipped_count = 0;

		for ( const assignment of source_assignments ) {
			try {
				await app.db
					.update( taggables )
					.set( {
						tag_id: target_tag[0].id,
						updated: new Date(),
						updated_by,
					} )
					.where( eq( taggables.id, assignment.id ) );

				merged_count++;
			} catch ( error : any ) {
				if ( error.code === 'SQLITE_CONSTRAINT_UNIQUE' ) {
					await app.db.delete( taggables ).where( eq( taggables.id, assignment.id ) );
					skipped_count++;
				} else {
					throw error;
				}
			}
		}

		await app.db
			.update( tags )
			.set( {
				is_active: false,
				updated: new Date(),
				updated_by,
			} )
			.where( eq( tags.id, source_tag[0].id ) );

		return responseSuccess( {
			merged_count,
			skipped_count,
			message: `Merged ${merged_count} assignments, skipped ${skipped_count} duplicates. Source tag deactivated.`,
		} );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
};
