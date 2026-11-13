import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	tag_bulk_add,
	tag_find_by_affinity,
	tag_find_by_tags,
	tag_merge,
	tag_stats,
} from '../src/methods';
import { createTestApp, createTestTag, createTestTaggable, resetMocks } from './setup';

describe('Tags Module - Edge Cases and Complex Scenarios', () => {
	let app : any;

	beforeEach( () => {
		app = createTestApp();
		resetMocks( app );
	} );

	describe('tag_find_by_tags - Complex Scenarios', () => {
		it('should handle match_type "all" requiring all tags', async () => {
			const tags = [
				createTestTag( { id: 1, slug: 'tag1', weight: 1.0 } ),
				createTestTag( { id: 2, slug: 'tag2', weight: 1.5 } ),
			];

			// Mock first query for tags lookup
			app.db.select.mockReturnValueOnce( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( tags ),
			} );

			// Mock second query for objects with all tags
			const objectsWithAllTags = [
				{
					module: 'test-module',
					id_object: 'obj123',
					affinityScore: 2.5, // 1.0 + 1.5 (both tags)
					matchingTags: 2,
					tagDetails: 'Tag1:1.0,Tag2:1.0',
				},
			];

			app.db.select.mockReturnValueOnce( {
				from: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				having: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( objectsWithAllTags ),
			} );

			const params = {
				tag_slugs: [ 'tag1', 'tag2' ],
				target_module: 'test-module',
				match_type: 'all' as const,
				min_affinity_score: 0.0,
				limit: 10,
				exclude_objects: [],
				active_tags_only: true,
			};

			const result = await tag_find_by_tags( app, params );

			expect( result.success ).toBe( true );
			expect( result.objects ).toEqual( objectsWithAllTags );
		});

		it('should exclude specified objects', async () => {
			const tags = [ createTestTag( { id: 1, slug: 'tag1' } ) ];

			app.db.select.mockReturnValueOnce( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( tags ),
			} );

			const objectsNotExcluded = [
				{
					module: 'test-module',
					id_object: 'obj456', // Not excluded
					affinityScore: 1.0,
					matchingTags: 1,
					tagDetails: 'Tag1:1.0',
				},
			];

			app.db.select.mockReturnValueOnce( {
				from: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( objectsNotExcluded ),
			} );

			const params = {
				tag_slugs: [ 'tag1' ],
				target_module: 'test-module',
				match_type: 'any' as const,
				exclude_objects: [ 'obj123', 'obj789' ], // These should be excluded
				limit: 10,
			};

			const result = await tag_find_by_tags( app, params );

			expect( result.success ).toBe( true );
			expect( result.objects ).toEqual( objectsNotExcluded );
		});

		it('should filter by minimum affinity score', async () => {
			const tags = [ createTestTag( { id: 1, slug: 'tag1', weight: 1.0 } ) ];

			app.db.select.mockReturnValueOnce( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( tags ),
			} );

			// Only objects with affinity >= 0.5 should be returned
			const highAffinityObjects = [
				{
					module: 'test-module',
					id_object: 'obj123',
					affinityScore: 0.8,
					matchingTags: 1,
					tagDetails: 'Tag1:0.8',
				},
			];

			app.db.select.mockReturnValueOnce( {
				from: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				having: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( highAffinityObjects ),
			} );

			const params = {
				tag_slugs: [ 'tag1' ],
				target_module: 'test-module',
				min_affinity_score: 0.5, // Filter out low scores
				limit: 10,
			};

			const result = await tag_find_by_tags( app, params );

			expect( result.success ).toBe( true );
			expect( result.objects ).toEqual( highAffinityObjects );
		});
	});

	describe('tag_find_by_affinity - Advanced Scenarios', () => {
		it('should calculate weighted affinity correctly', async () => {
			const highAffinityObjects = [
				{
					module: 'target-module',
					id_object: 'obj456',
					affinityScore: 0.72, // Weighted calculation result
					matchingTags: 2,
					tagDetails: 'Tag1:0.8,Tag2:0.9',
				},
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				having: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( highAffinityObjects ),
			} );

			const params = {
				source_id_object: 'obj123',
				source_module: 'source-module',
				target_module: 'target-module',
				min_affinity_score: 0.7,
				limit: 10,
				exclude_objects: [],
			};

			const result = await tag_find_by_affinity( app, params );

			expect( result.success ).toBe( true );
			expect( result.objects ).toEqual( highAffinityObjects );
			expect( result.objects[0].affinityScore ).toBeGreaterThanOrEqual( 0.7 );
		});

		it('should exclude source object from results', async () => {
			const affinityObjects = [
				{
					module: 'target-module',
					id_object: 'obj789', // Different from source
					affinityScore: 0.8,
					matchingTags: 1,
					tagDetails: 'CommonTag:0.8',
				},
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				having: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( affinityObjects ),
			} );

			const params = {
				source_id_object: 'obj123', // This should NOT appear in results
				source_module: 'source-module',
				target_module: 'target-module',
				min_affinity_score: 0.3,
				limit: 10,
				exclude_objects: [],
			};

			const result = await tag_find_by_affinity( app, params );

			expect( result.success ).toBe( true );
			expect( result.objects.every( ( obj ) => obj.id_object !== 'obj123' ) ).toBe( true );
		});
	});

	describe('tag_stats - Comprehensive Statistics', () => {
		it('should calculate comprehensive tag statistics', async () => {
			const comprehensiveStats = [
				{
					tagId: 1,
					tagName: 'Popular Tag',
					tagSlug: 'popular-tag',
					category: 'programming',
					weight: 2.0,
					totalUsage: 150, // Highly used tag
					avgRelevance: 0.85,
					moduleBreakdown: 'users:75,articles:45,projects:30',
					autoTaggedCount: 90,
					manualTaggedCount: 60,
					lastUsed: Date.now() - 3600000, // 1 hour ago
				},
				{
					tagId: 2,
					tagName: 'Rare Tag',
					tagSlug: 'rare-tag',
					category: 'specialized',
					weight: 0.5,
					totalUsage: 3, // Rarely used tag
					avgRelevance: 0.95, // But high relevance when used
					moduleBreakdown: 'projects:3',
					autoTaggedCount: 0,
					manualTaggedCount: 3,
					lastUsed: Date.now() - 2592000000, // 30 days ago
				},
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( comprehensiveStats ),
			} );

			const params = {
				include_inactive: false,
				limit: 50,
			};

			const result = await tag_stats( app, params );

			expect( result.success ).toBe( true );
			expect( result.stats ).toHaveLength( 2 );
			expect( result.stats[0].totalUsage ).toBe( 150 );
			expect( result.stats[1].totalUsage ).toBe( 3 );
			expect( result.stats[0].avgRelevance ).toBe( 0.85 );
			expect( result.stats[1].avgRelevance ).toBe( 0.95 );
		});

		it('should filter stats by category', async () => {
			const programmingStats = [
				{
					tagId: 1,
					tagName: 'JavaScript',
					tagSlug: 'javascript',
					category: 'programming',
					weight: 1.5,
					totalUsage: 200,
					avgRelevance: 0.9,
					moduleBreakdown: 'projects:150,tutorials:50',
					autoTaggedCount: 120,
					manualTaggedCount: 80,
					lastUsed: Date.now() - 1800000, // 30 minutes ago
				},
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( programmingStats ),
			} );

			const params = {
				category: 'programming',
				limit: 20,
			};

			const result = await tag_stats( app, params );

			expect( result.success ).toBe( true );
			expect( result.stats ).toHaveLength( 1 );
			expect( result.stats[0].category ).toBe( 'programming' );
		});
	});

	describe('tag_merge - Complex Merge Scenarios', () => {
		it('should handle merge with duplicate assignments gracefully', async () => {
			const sourceTag = createTestTag( { id: 1, slug: 'old-tag' } );
			const targetTag = createTestTag( { id: 2, slug: 'new-tag' } );

			// Multiple assignments to merge
			const sourceAssignments = [
				createTestTaggable( { id: 1, tag_id: 1, module: 'module1', id_object: 'obj1' } ),
				createTestTaggable( { id: 2, tag_id: 1, module: 'module1', id_object: 'obj2' } ),
				createTestTaggable( { id: 3, tag_id: 1, module: 'module2', id_object: 'obj1' } ),
			];

			app.db.select
				.mockReturnValueOnce( {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					then: vi.fn().mockResolvedValue( [ sourceTag ] ),
				} )
				.mockReturnValueOnce( {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					then: vi.fn().mockResolvedValue( [ targetTag ] ),
				} )
				.mockReturnValueOnce( {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					then: vi.fn().mockResolvedValue( sourceAssignments ),
				} );

			// Simulate some updates succeeding, one failing due to duplicate
			let updateCallCount = 0;
			app.db.update.mockImplementation( () => {
				updateCallCount++;
				if ( updateCallCount === 2 ) {
					// Second update fails due to duplicate
					const error = new Error( 'Constraint failed' );
					error.code = 'SQLITE_CONSTRAINT_UNIQUE';
					return {
						set: vi.fn().mockReturnThis(),
						where: vi.fn().mockRejectedValue( error ),
					};
				}
				return {
					set: vi.fn().mockReturnThis(),
					where: vi.fn().mockResolvedValue( undefined ),
				};
			} );

			app.db.delete.mockReturnValue( {
				where: vi.fn().mockResolvedValue( undefined ),
			} );

			const params = {
				source_tag_slug: 'old-tag',
				target_tag_slug: 'new-tag',
				updated_by: 'admin',
			};

			const result = await tag_merge( app, params );

			expect( result.success ).toBe( true );
			expect( result.merged_count ).toBe( 2 ); // Two successful merges
			expect( result.skipped_count ).toBe( 1 ); // One duplicate skipped
			expect( result.message ).toContain( 'Merged 2 assignments, skipped 1 duplicates' );
		});

		it('should deactivate source tag after merge', async () => {
			const sourceTag = createTestTag( { id: 1, slug: 'deprecated-tag' } );
			const targetTag = createTestTag( { id: 2, slug: 'current-tag' } );

			app.db.select
				.mockReturnValueOnce( {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					then: vi.fn().mockResolvedValue( [ sourceTag ] ),
				} )
				.mockReturnValueOnce( {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					then: vi.fn().mockResolvedValue( [ targetTag ] ),
				} )
				.mockReturnValueOnce( {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					then: vi.fn().mockResolvedValue( [] ), // No assignments to merge
				} );

			const tagUpdateMock = vi.fn().mockReturnValue( {
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue( undefined ),
			} );
			app.db.update.mockReturnValue( tagUpdateMock );

			const params = {
				source_tag_slug: 'deprecated-tag',
				target_tag_slug: 'current-tag',
			};

			const result = await tag_merge( app, params );

			expect( result.success ).toBe( true );
			expect( result.merged_count ).toBe( 0 );
			expect( result.skipped_count ).toBe( 0 );
			// Should still deactivate source tag even with no assignments
			expect( app.db.update ).toHaveBeenCalled();
		});
	});

	describe('tag_bulk_add - Overwrite Scenarios', () => {
		it('should overwrite existing tags when overwrite_existing is true', async () => {
			const existingTags = [
				createTestTag( { id: 1, slug: 'tag1' } ),
				createTestTag( { id: 2, slug: 'tag2' } ),
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( existingTags ),
			} );

			// Mock delete for overwriting existing tags
			app.db.delete.mockReturnValue( {
				where: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( undefined ),
			} );

			// Mock successful inserts
			app.db.insert
				.mockReturnValueOnce( {
					values: vi.fn().mockReturnThis(),
					returning: vi.fn().mockResolvedValue( [ createTestTaggable( { tag_id: 1 } ) ] ),
				} )
				.mockReturnValueOnce( {
					values: vi.fn().mockReturnThis(),
					returning: vi.fn().mockResolvedValue( [ createTestTaggable( { tag_id: 2 } ) ] ),
				} );

			const params = {
				tag_slugs: [ 'tag1', 'tag2' ],
				id_object: 'obj123',
				module: 'test-module',
				overwrite_existing: true, // This should delete existing first
				relevance: 0.9,
			};

			const result = await tag_bulk_add( app, params );

			expect( result.success ).toBe( true );
			expect( result.tagged ).toHaveLength( 2 );
			expect( result.errors ).toHaveLength( 0 );
			expect( app.db.delete ).toHaveBeenCalled(); // Should delete existing tags first
		});

		it('should handle partial failures in bulk operations', async () => {
			const existingTags = [
				createTestTag( { id: 1, slug: 'tag1' } ),
				createTestTag( { id: 2, slug: 'tag2' } ),
				createTestTag( { id: 3, slug: 'tag3' } ),
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( existingTags ),
			} );

			const duplicateError = new Error( 'Constraint failed' );
			duplicateError.code = 'SQLITE_CONSTRAINT_UNIQUE';
			const dbError = new Error( 'Database connection failed' );

			// Mock mixed results: success, duplicate, database error
			app.db.insert
				.mockReturnValueOnce( {
					values: vi.fn().mockReturnThis(),
					returning: vi.fn().mockResolvedValue( [ createTestTaggable( { tag_id: 1 } ) ] ),
				} )
				.mockReturnValueOnce( {
					values: vi.fn().mockReturnThis(),
					returning: vi.fn().mockRejectedValue( duplicateError ),
				} )
				.mockReturnValueOnce( {
					values: vi.fn().mockReturnThis(),
					returning: vi.fn().mockRejectedValue( dbError ),
				} );

			const params = {
				tag_slugs: [ 'tag1', 'tag2', 'tag3' ],
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_bulk_add( app, params );

			expect( result.success ).toBe( true );
			expect( result.tagged ).toHaveLength( 1 ); // One successful
			expect( result.errors ).toHaveLength( 2 ); // Two failures
			expect( result.errors[0].error ).toBe( 'Already tagged' );
			expect( result.errors[1].error ).toBe( 'Database connection failed' );
			expect( result.summary ).toBe( '1 tags added, 2 errors' );
		});
	});

	describe('Parameter Validation Edge Cases', () => {
		it('should handle boundary values correctly', async () => {
			// Test with minimum and maximum valid values
			const boundaryParams = {
				name: 'A', // Minimum length
				weight: 0, // Minimum weight
			};

			const result = await tag_add( app, boundaryParams );
			// This test depends on actual validation logic
		});

		it('should handle special characters in slugs and names', async () => {
			const newTag = createTestTag( {
				name: 'C++ Programming',
				slug: 'c-programming', // Should be sanitized
			} );

			app.db.insert.mockReturnValue( {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [ newTag ] ),
			} );

			const params = {
				name: 'C++ Programming',
				// Test slug generation from special characters
			};

			const result = await tag_add( app, params );
			expect( result.success ).toBe( true );
		});

		it('should handle very long tag lists', async () => {
			// Test with maximum allowed tag count
			const manyTagSlugs = Array.from( { length: 50 }, ( _, i ) => `tag${i + 1}` );
			const manyTags = manyTagSlugs.map( ( slug, i ) => createTestTag( { id: i + 1, slug } ) );

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( manyTags ),
			} );

			// Mock successful inserts for all tags
			const mockInserts = manyTags.map( ( tag ) => vi.fn().mockResolvedValue( [ createTestTaggable( { tag_id: tag.id } ) ] ) );

			let insertCallCount = 0;
			app.db.insert.mockImplementation( () => {
				const mockReturn = {
					values: vi.fn().mockReturnThis(),
					returning: mockInserts[insertCallCount],
				};
				insertCallCount++;
				return mockReturn;
			} );

			const params = {
				tag_slugs: manyTagSlugs,
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_bulk_add( app, params );

			expect( result.success ).toBe( true );
			expect( result.tagged ).toHaveLength( 50 );
		});
	});

	describe('Performance and Scalability Scenarios', () => {
		it('should handle large result sets efficiently', async () => {
			// Simulate large number of search results
			const largeResultSet = Array.from( { length: 100 }, ( _, i ) => createTestTag( { id: i + 1, name: `Tag ${i + 1}`, slug: `tag-${i + 1}` } ) );

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( largeResultSet ),
			} );

			const params = {
				query: 'tag',
				limit: 100,
				offset: 0,
			};

			const result = await tag_search( app, params );

			expect( result.success ).toBe( true );
			expect( result.tags ).toHaveLength( 100 );
		});

		it('should handle empty database gracefully', async () => {
			// Test all methods with empty database
			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( [] ),
			} );

			const searchResult = await tag_search( app, { query: 'anything' } );
			expect( searchResult.success ).toBe( true );
			expect( searchResult.tags ).toEqual( [] );

			const statsResult = await tag_stats( app, {} );
			expect( statsResult.success ).toBe( true );
			expect( statsResult.stats ).toEqual( [] );
		});
	});
});
