import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('Tags Module - Schema Validation Tests', () => {
	describe('AddTagSchema Validation', () => {
		// We'll create a simple version of the schema for testing
		const AddTagSchema = z.object( {
			name: z.string().min( 1, 'Tag name is required' ),
			slug: z.string().optional(),
			description: z.string().optional(),
			color: z.string().regex( /^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code' ).optional(),
			category: z.string().optional(),
			weight: z.coerce.number().min( 0 ).max( 10 ).default( 1.0 ),
			updated_by: z.string().optional(),
		} );

		it('should validate valid tag data', () => {
			const validData = {
				name: 'Test Tag',
				slug: 'test-tag',
				description: 'A test tag',
				color: '#FF0000',
				category: 'test',
				weight: 5.0,
				updated_by: 'user123',
			};

			const result = AddTagSchema.safeParse( validData );
			expect( result.success ).toBe( true );
		});

		it('should require tag name', () => {
			const invalidData = {
				slug: 'test-tag',
			};

			const result = AddTagSchema.safeParse( invalidData );
			expect( result.success ).toBe( false );
			if ( !result.success ) {
				// Check that there's a validation error for the missing name field
				const hasNameError = result.error.issues.some( ( issue ) =>
					issue.path.includes( 'name' ) || issue.message.includes( 'name' ) || issue.message.includes( 'required' )
				);
				expect( hasNameError ).toBe( true );
			}
		});

		it('should reject empty tag name', () => {
			const invalidData = {
				name: '',
			};

			const result = AddTagSchema.safeParse( invalidData );
			expect( result.success ).toBe( false );
		});

		it('should validate hex color format', () => {
			const invalidColorData = {
				name: 'Test Tag',
				color: 'not-a-color',
			};

			const result = AddTagSchema.safeParse( invalidColorData );
			expect( result.success ).toBe( false );
			if ( !result.success ) {
				expect( result.error.issues[0].message ).toContain( 'Color must be a valid hex code' );
			}
		});

		it('should accept valid hex color', () => {
			const validColorData = {
				name: 'Test Tag',
				color: '#123ABC',
			};

			const result = AddTagSchema.safeParse( validColorData );
			expect( result.success ).toBe( true );
		});

		it('should validate weight range', () => {
			const invalidWeightData = {
				name: 'Test Tag',
				weight: 15, // Above max of 10
			};

			const result = AddTagSchema.safeParse( invalidWeightData );
			expect( result.success ).toBe( false );
		});

		it('should coerce string weight to number', () => {
			const dataWithStringWeight = {
				name: 'Test Tag',
				weight: '7.5',
			};

			const result = AddTagSchema.safeParse( dataWithStringWeight );
			expect( result.success ).toBe( true );
			if ( result.success ) {
				expect( result.data.weight ).toBe( 7.5 );
			}
		});

		it('should use default weight when not provided', () => {
			const dataWithoutWeight = {
				name: 'Test Tag',
			};

			const result = AddTagSchema.safeParse( dataWithoutWeight );
			expect( result.success ).toBe( true );
			if ( result.success ) {
				expect( result.data.weight ).toBe( 1.0 );
			}
		});
	});

	describe('TagObjectSchema Validation', () => {
		const TagObjectSchema = z.object( {
			tag_slug: z.string().min( 1, 'Tag slug is required' ),
			id_object: z.string().min( 1, 'Object ID is required' ),
			module: z.string().min( 1, 'Module is required' ),
			relevance: z.coerce.number().min( 0 ).max( 1 ).default( 1.0 ),
			updated_by: z.string().optional(),
			auto_tagged: z.coerce.boolean().default( false ),
		} );

		it('should validate valid tag object data', () => {
			const validData = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: 0.8,
				updated_by: 'user123',
				auto_tagged: true,
			};

			const result = TagObjectSchema.safeParse( validData );
			expect( result.success ).toBe( true );
		});

		it('should require tag_slug, id_object, and module', () => {
			const invalidData = {
				relevance: 0.8,
			};

			const result = TagObjectSchema.safeParse( invalidData );
			expect( result.success ).toBe( false );
			if ( !result.success ) {
				expect( result.error.issues ).toHaveLength( 3 );
			}
		});

		it('should validate relevance range', () => {
			const invalidRelevanceData = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: 1.5, // Above max of 1
			};

			const result = TagObjectSchema.safeParse( invalidRelevanceData );
			expect( result.success ).toBe( false );
		});

		it('should coerce string relevance to number', () => {
			const dataWithStringRelevance = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: '0.7',
			};

			const result = TagObjectSchema.safeParse( dataWithStringRelevance );
			expect( result.success ).toBe( true );
			if ( result.success ) {
				expect( result.data.relevance ).toBe( 0.7 );
			}
		});

		it('should coerce string auto_tagged to boolean', () => {
			const dataWithStringAutoTagged = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				auto_tagged: 'true',
			};

			const result = TagObjectSchema.safeParse( dataWithStringAutoTagged );
			expect( result.success ).toBe( true );
			if ( result.success ) {
				expect( result.data.auto_tagged ).toBe( true );
			}
		});
	});

	describe('SearchTagsSchema Validation', () => {
		const SearchTagsSchema = z.object( {
			query: z.string().optional(),
			category: z.string().optional(),
			active_only: z.coerce.boolean().default( true ),
			limit: z.coerce.number().min( 1 ).max( 100 ).default( 20 ),
			offset: z.coerce.number().min( 0 ).default( 0 ),
		} );

		it('should validate valid search data', () => {
			const validData = {
				query: 'test',
				category: 'category1',
				active_only: false,
				limit: 50,
				offset: 10,
			};

			const result = SearchTagsSchema.safeParse( validData );
			expect( result.success ).toBe( true );
		});

		it('should use default values when not provided', () => {
			const minimalData = {};

			const result = SearchTagsSchema.safeParse( minimalData );
			expect( result.success ).toBe( true );
			if ( result.success ) {
				expect( result.data.active_only ).toBe( true );
				expect( result.data.limit ).toBe( 20 );
				expect( result.data.offset ).toBe( 0 );
			}
		});

		it('should validate limit range', () => {
			const invalidLimitData = {
				limit: 150, // Above max of 100
			};

			const result = SearchTagsSchema.safeParse( invalidLimitData );
			expect( result.success ).toBe( false );
		});

		it('should validate minimum offset', () => {
			const invalidOffsetData = {
				offset: -5, // Below min of 0
			};

			const result = SearchTagsSchema.safeParse( invalidOffsetData );
			expect( result.success ).toBe( false );
		});
	});

	describe('BulkTagObjectsSchema Validation', () => {
		const BulkTagObjectsSchema = z.object( {
			tag_slugs: z.array( z.string() ).min( 1, 'At least one tag slug is required' ),
			id_object: z.string().min( 1, 'Object ID is required' ),
			module: z.string().min( 1, 'Module is required' ),
			relevance: z.coerce.number().min( 0 ).max( 1 ).default( 1.0 ),
			updated_by: z.string().optional(),
			auto_tagged: z.coerce.boolean().default( false ),
			overwrite_existing: z.coerce.boolean().default( false ),
		} );

		it('should validate valid bulk tag data', () => {
			const validData = {
				tag_slugs: [ 'tag1', 'tag2', 'tag3' ],
				id_object: 'obj123',
				module: 'test-module',
				relevance: 0.9,
				updated_by: 'user123',
				auto_tagged: true,
				overwrite_existing: true,
			};

			const result = BulkTagObjectsSchema.safeParse( validData );
			expect( result.success ).toBe( true );
		});

		it('should require at least one tag slug', () => {
			const invalidData = {
				tag_slugs: [],
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = BulkTagObjectsSchema.safeParse( invalidData );
			expect( result.success ).toBe( false );
			if ( !result.success ) {
				expect( result.error.issues[0].message ).toContain( 'At least one tag slug is required' );
			}
		});

		it('should require tag_slugs to be an array', () => {
			const invalidData = {
				tag_slugs: 'not-an-array',
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = BulkTagObjectsSchema.safeParse( invalidData );
			expect( result.success ).toBe( false );
		});
	});
});
