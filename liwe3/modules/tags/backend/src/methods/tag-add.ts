/**
 * @fileoverview Tag addition functionality
 */

import { slugify } from '@backend/liwe3';
import { LiWEApp, LiWEResponse, responseError, responseSuccess, tags, z } from './utils';
import type { Tag } from '../schema';

/**
 * Schema for adding new tags to the system
 *
 * @property {string} name - Required tag name (min 1 character)
 * @property {string} [slug] - Optional URL-friendly slug (auto-generated if not provided)
 * @property {string} [description] - Optional tag description
 * @property {string} [color] - Optional hex color code (must be valid 6-digit hex)
 * @property {string} [category] - Optional tag category for organization
 * @property {number} [weight=1.0] - Tag weight for relevance calculations (0-10, default 1.0)
 * @property {string} [updated_by] - Optional user ID who created/updated the tag
 */
const AddTagSchema = z.object( {
	name: z.string().min( 1, 'Tag name is required' ),
	slug: z.string().optional(),
	description: z.string().optional(),
	color: z.string().regex( /^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code' ).optional(),
	category: z.string().optional(),
	weight: z.coerce.number().min( 0 ).max( 10 ).default( 1.0 ),
	updated_by: z.string().optional(),
} );

/** Parameters for adding a new tag */
export type TagAddParams = z.infer<typeof AddTagSchema>;

/** Return type for tag creation */
export type TagAddResult = { tag : Tag };

/**
 * Adds a new tag to the system
 *
 * Creates a new tag with the provided information. If no slug is provided,
 * it will be auto-generated from the tag name by converting to lowercase,
 * replacing spaces with dashes, and removing non-alphanumeric characters.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {TagAddParams} params - Tag creation parameters
 * @param {string} params.name - Required tag name (min 1 character)
 * @param {string} [params.slug] - Optional URL-friendly slug (auto-generated if not provided)
 * @param {string} [params.description] - Optional tag description
 * @param {string} [params.color] - Optional hex color code (must be valid 6-digit hex)
 * @param {string} [params.category] - Optional tag category for organization
 * @param {number} [params.weight=1.0] - Tag weight for relevance calculations (0-10, default 1.0)
 * @param {string} [params.updated_by] - Optional user ID who created the tag
 *
 * @returns {Promise<LiWEResponse<TagAddResult>>} Result object with success status and tag data or error details
 *
 * @example
 * const result = await tag_add(app, {
 *   name: 'JavaScript',
 *   description: 'Programming language tag',
 *   color: '#F7DF1E',
 *   category: 'programming',
 *   weight: 5.0
 * });
 *
 * if (result.ok) {
 *   console.log('Created tag:', result.data.tag);
 * } else {
 *   console.error('Failed to create tag:', result.message);
 * }
 */
export const tag_add = async ( app : LiWEApp, params : TagAddParams ) : Promise<LiWEResponse<TagAddResult>> => {
	const validation = AddTagSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { name, slug, description, color, category, weight, updated_by } = validation.data;
	const finalSlug = slug || slugify( name );

	try {
		const result = await app.db.insert( tags ).values( {
			name,
			slug: finalSlug,
			description,
			color,
			category,
			weight,
			updated_by,
		} ).returning();

		return responseSuccess( { tag: result[0] } );
	} catch ( error : any ) {
		if ( error.code === 'SQLITE_CONSTRAINT_UNIQUE' ) {
			return responseError( 'Tag name or slug already exists', 400, 'DUPLICATE_TAG' );
		}
		return responseError( 'Database error', 500, 'DATABASE_ERROR' );
	}
};
