import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	tag_add,
	tag_bulk_add,
	tag_bulk_remove,
	tag_find_by_affinity,
	tag_find_by_tags,
	tag_list_by_module,
	tag_list_by_object,
	tag_merge,
	tag_object,
	tag_remove_object,
	tag_search,
	tag_stats,
	tag_update_relevance,
} from '../src/methods';
import {
	createMockChain,
	createTestApp,
	createTestTag,
	createTestTaggable,
	resetMocks,
} from './setup';

describe('Tags Module - Database Methods', () => {
	let app : any;

	beforeEach( () => {
		app = createTestApp();
		resetMocks( app );
	} );

	describe('tag_add', () => {
		it('should successfully add a new tag', async () => {
			const newTag = createTestTag();
			const mockChain = createMockChain( [ newTag ] );
			app.db.insert.mockReturnValue( mockChain );

			const params = {
				name: 'Test Tag',
				slug: 'test-tag',
				description: 'A test tag',
				color: '#FF0000',
				category: 'test',
				weight: 5.0,
				updated_by: 'user123',
			};

			const result = await tag_add( app, params );

			expect( result.success ).toBe( true );
			expect( result.tag ).toEqual( newTag );
			expect( app.db.insert ).toHaveBeenCalledTimes( 1 );
		});

		it('should generate slug from name when not provided', async () => {
			const newTag = createTestTag( { slug: 'test-tag-name' } );
			app.db.insert.mockReturnValue( mockInsertResponse( newTag ) );

			const params = {
				name: 'Test Tag Name',
				description: 'A test tag',
			};

			const result = await tag_add( app, params );

			expect( result.success ).toBe( true );
		});

		it('should handle duplicate tag name/slug error', async () => {
			const error = new Error( 'Constraint failed' );
			error.code = 'SQLITE_CONSTRAINT_UNIQUE';

			app.db.insert.mockReturnValue( {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockRejectedValue( error ),
			} );

			const params = {
				name: 'Duplicate Tag',
			};

			const result = await tag_add( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Tag name or slug already exists' );
		});

		it('should handle database error', async () => {
			const error = new Error( 'Database connection failed' );

			app.db.insert.mockReturnValue( {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockRejectedValue( error ),
			} );

			const params = {
				name: 'Test Tag',
			};

			const result = await tag_add( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Database error' );
			expect( result.details ).toBe( 'Database connection failed' );
		});

		it('should validate parameters', async () => {
			const params = {
				name: '', // Invalid: empty name
			};

			const result = await tag_add( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Invalid parameters' );
		});

		it('should validate color format', async () => {
			const params = {
				name: 'Test Tag',
				color: 'not-a-hex-color', // Invalid color format
			};

			const result = await tag_add( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Invalid parameters' );
		});
	});

	describe('tag_object', () => {
		it('should successfully tag an object', async () => {
			const existingTag = createTestTag();
			const newTaggable = createTestTaggable();

			app.db.select.mockReturnValue( mockSelectResponse( [ existingTag ] ) );
			app.db.insert.mockReturnValue( mockInsertResponse( newTaggable ) );

			const params = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: 0.8,
				updated_by: 'user123',
				auto_tagged: false,
			};

			const result = await tag_object( app, params );

			expect( result.success ).toBe( true );
			expect( result.taggable ).toEqual( newTaggable );
		});

		it('should fail if tag not found', async () => {
			app.db.select.mockReturnValue( mockSelectResponse( [] ) );

			const params = {
				tag_slug: 'non-existent-tag',
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_object( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( "Tag with slug 'non-existent-tag' not found" );
		});

		it('should handle duplicate tagging error', async () => {
			const existingTag = createTestTag();
			const error = new Error( 'Constraint failed' );
			error.code = 'SQLITE_CONSTRAINT_UNIQUE';

			app.db.select.mockReturnValue( mockSelectResponse( [ existingTag ] ) );
			app.db.insert.mockReturnValue( {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockRejectedValue( error ),
			} );

			const params = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_object( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Object already has this tag' );
		});

		it('should validate parameters', async () => {
			const params = {
				tag_slug: '', // Invalid: empty slug
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_object( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Invalid parameters' );
		});
	});

	describe('tag_remove_object', () => {
		it('should successfully remove tag from object', async () => {
			const existingTag = createTestTag();

			app.db.select.mockReturnValue( mockSelectResponse( [ existingTag ] ) );
			app.db.delete.mockReturnValue( mockDeleteResponse( 1 ) );

			const params = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_remove_object( app, params );

			expect( result.success ).toBe( true );
			expect( result.removed ).toBe( true );
			expect( result.message ).toBe( 'Tag removed successfully' );
		});

		it('should handle case when tag was not assigned', async () => {
			const existingTag = createTestTag();

			app.db.select.mockReturnValue( mockSelectResponse( [ existingTag ] ) );
			app.db.delete.mockReturnValue( mockDeleteResponse( 0 ) );

			const params = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_remove_object( app, params );

			expect( result.success ).toBe( true );
			expect( result.removed ).toBe( false );
			expect( result.message ).toBe( 'Tag was not assigned to this object' );
		});

		it('should fail if tag not found', async () => {
			app.db.select.mockReturnValue( mockSelectResponse( [] ) );

			const params = {
				tag_slug: 'non-existent-tag',
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_remove_object( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( "Tag with slug 'non-existent-tag' not found" );
		});
	});

	describe('tag_list_by_object', () => {
		it('should return tags for an object', async () => {
			const tagData = [
				{
					tagId: 1,
					tagName: 'Tag 1',
					tagSlug: 'tag-1',
					category: 'test',
					color: '#FF0000',
					weight: 1.0,
					relevanceScore: 0.8,
					created: new Date(),
					updated: new Date(),
					updated_by: 'user123',
					auto_tagged: false,
				},
				{
					tagId: 2,
					tagName: 'Tag 2',
					tagSlug: 'tag-2',
					category: 'test',
					color: '#00FF00',
					weight: 1.5,
					relevanceScore: 0.6,
					created: new Date(),
					updated: new Date(),
					updated_by: 'user123',
					auto_tagged: true,
				},
			];

			app.db.select.mockReturnValue( mockSelectResponse( tagData ) );

			const params = {
				id_object: 'obj123',
				module: 'test-module',
				active_only: true,
			};

			const result = await tag_list_by_object( app, params );

			expect( result.success ).toBe( true );
			expect( result.tags ).toEqual( tagData );
			expect( result.tags ).toHaveLength( 2 );
		});

		it('should handle empty result', async () => {
			app.db.select.mockReturnValue( mockSelectResponse( [] ) );

			const params = {
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_list_by_object( app, params );

			expect( result.success ).toBe( true );
			expect( result.tags ).toEqual( [] );
		});
	});

	describe('tag_search', () => {
		it('should search tags by query', async () => {
			const searchResults = [
				createTestTag( { name: 'JavaScript', slug: 'javascript' } ),
				createTestTag( { name: 'Java', slug: 'java' } ),
			];

			app.db.select.mockReturnValue( mockSelectResponse( searchResults ) );

			const params = {
				query: 'java',
				active_only: true,
				limit: 10,
				offset: 0,
			};

			const result = await tag_search( app, params );

			expect( result.success ).toBe( true );
			expect( result.tags ).toEqual( searchResults );
		});

		it('should search tags by category', async () => {
			const categoryResults = [
				createTestTag( { category: 'programming' } ),
			];

			app.db.select.mockReturnValue( mockSelectResponse( categoryResults ) );

			const params = {
				category: 'programming',
			};

			const result = await tag_search( app, params );

			expect( result.success ).toBe( true );
			expect( result.tags ).toEqual( categoryResults );
		});

		it('should handle empty search results', async () => {
			app.db.select.mockReturnValue( mockSelectResponse( [] ) );

			const params = {
				query: 'nonexistent',
			};

			const result = await tag_search( app, params );

			expect( result.success ).toBe( true );
			expect( result.tags ).toEqual( [] );
		});
	});

	describe('tag_update_relevance', () => {
		it('should successfully update relevance score', async () => {
			const existingTag = createTestTag();
			const updatedTaggable = createTestTaggable( { relevance_score: 0.9 } );

			app.db.select.mockReturnValue( mockSelectResponse( [ existingTag ] ) );
			app.db.update.mockReturnValue( mockUpdateResponse( updatedTaggable ) );

			const params = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: 0.9,
				updated_by: 'user123',
			};

			const result = await tag_update_relevance( app, params );

			expect( result.success ).toBe( true );
			expect( result.updated ).toEqual( updatedTaggable );
		});

		it('should fail if tag not found', async () => {
			app.db.select.mockReturnValue( mockSelectResponse( [] ) );

			const params = {
				tag_slug: 'non-existent-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: 0.9,
			};

			const result = await tag_update_relevance( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( "Tag with slug 'non-existent-tag' not found" );
		});

		it('should fail if tag assignment not found', async () => {
			const existingTag = createTestTag();

			app.db.select.mockReturnValue( mockSelectResponse( [ existingTag ] ) );
			app.db.update.mockReturnValue( {
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [] ), // No rows updated
			} );

			const params = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: 0.9,
			};

			const result = await tag_update_relevance( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Tag assignment not found for this object' );
		});

		it('should validate relevance range', async () => {
			const params = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: 1.5, // Invalid: above 1.0
			};

			const result = await tag_update_relevance( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Invalid parameters' );
		});
	});

	describe('tag_bulk_add', () => {
		it('should successfully add multiple tags to an object', async () => {
			const existingTags = [
				createTestTag( { slug: 'tag1' } ),
				createTestTag( { slug: 'tag2' } ),
			];

			app.db.select.mockReturnValue( mockSelectResponse( existingTags ) );
			app.db.insert
				.mockReturnValueOnce( mockInsertResponse( createTestTaggable( { tag_id: 1 } ) ) )
				.mockReturnValueOnce( mockInsertResponse( createTestTaggable( { tag_id: 2 } ) ) );

			const params = {
				tag_slugs: [ 'tag1', 'tag2' ],
				id_object: 'obj123',
				module: 'test-module',
				relevance: 0.8,
			};

			const result = await tag_bulk_add( app, params );

			expect( result.success ).toBe( true );
			expect( result.tagged ).toHaveLength( 2 );
			expect( result.errors ).toHaveLength( 0 );
		});

		it('should fail if some tags not found', async () => {
			const existingTags = [
				createTestTag( { slug: 'tag1' } ),
			];

			app.db.select.mockReturnValue( mockSelectResponse( existingTags ) );

			const params = {
				tag_slugs: [ 'tag1', 'tag2', 'tag3' ], // tag2 and tag3 don't exist
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_bulk_add( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toContain( 'Tags not found: tag2, tag3' );
		});

		it('should handle mixed success and failure', async () => {
			const existingTags = [
				createTestTag( { slug: 'tag1' } ),
				createTestTag( { slug: 'tag2' } ),
			];

			const duplicateError = new Error( 'Constraint failed' );
			duplicateError.code = 'SQLITE_CONSTRAINT_UNIQUE';

			app.db.select.mockReturnValue( mockSelectResponse( existingTags ) );
			app.db.insert
				.mockReturnValueOnce( mockInsertResponse( createTestTaggable( { tag_id: 1 } ) ) )
				.mockReturnValueOnce( {
					values: vi.fn().mockReturnThis(),
					returning: vi.fn().mockRejectedValue( duplicateError ),
				} );

			const params = {
				tag_slugs: [ 'tag1', 'tag2' ],
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_bulk_add( app, params );

			expect( result.success ).toBe( true );
			expect( result.tagged ).toHaveLength( 1 );
			expect( result.errors ).toHaveLength( 1 );
			expect( result.errors[0].error ).toBe( 'Already tagged' );
		});
	});

	describe('tag_bulk_remove', () => {
		it('should successfully remove multiple tags from an object', async () => {
			const existingTags = [
				createTestTag( { id: 1, slug: 'tag1' } ),
				createTestTag( { id: 2, slug: 'tag2' } ),
			];

			app.db.select.mockReturnValue( mockSelectResponse( existingTags ) );
			app.db.delete.mockReturnValue( mockDeleteResponse( 2 ) );

			const params = {
				tag_slugs: [ 'tag1', 'tag2' ],
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_bulk_remove( app, params );

			expect( result.success ).toBe( true );
			expect( result.removed_count ).toBe( 2 );
		});

		it('should fail if no valid tags found', async () => {
			app.db.select.mockReturnValue( mockSelectResponse( [] ) );

			const params = {
				tag_slugs: [ 'tag1', 'tag2' ],
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_bulk_remove( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'No valid tags found' );
		});
	});

	describe('tag_merge', () => {
		it('should successfully merge tags', async () => {
			const sourceTag = createTestTag( { id: 1, slug: 'source-tag' } );
			const targetTag = createTestTag( { id: 2, slug: 'target-tag' } );
			const assignments = [
				createTestTaggable( { id: 1, tag_id: 1 } ),
				createTestTaggable( { id: 2, tag_id: 1 } ),
			];

			app.db.select
				.mockReturnValueOnce( mockSelectResponse( [ sourceTag ] ) )
				.mockReturnValueOnce( mockSelectResponse( [ targetTag ] ) )
				.mockReturnValueOnce( mockSelectResponse( assignments ) );

			app.db.update
				.mockReturnValue( {
					set: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					then: vi.fn().mockResolvedValue( undefined ),
				} );

			const params = {
				source_tag_slug: 'source-tag',
				target_tag_slug: 'target-tag',
				updated_by: 'user123',
			};

			const result = await tag_merge( app, params );

			expect( result.success ).toBe( true );
			expect( result.merged_count ).toBe( 2 );
			expect( result.skipped_count ).toBe( 0 );
		});

		it('should fail if source and target are the same', async () => {
			const params = {
				source_tag_slug: 'same-tag',
				target_tag_slug: 'same-tag',
			};

			const result = await tag_merge( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Source and target tags cannot be the same' );
		});

		it('should fail if source tag not found', async () => {
			app.db.select
				.mockReturnValueOnce( mockSelectResponse( [] ) ); // Source tag not found

			const params = {
				source_tag_slug: 'non-existent-source',
				target_tag_slug: 'target-tag',
			};

			const result = await tag_merge( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( "Source tag 'non-existent-source' not found" );
		});

		it('should fail if target tag not found', async () => {
			const sourceTag = createTestTag();

			app.db.select
				.mockReturnValueOnce( mockSelectResponse( [ sourceTag ] ) )
				.mockReturnValueOnce( mockSelectResponse( [] ) ); // Target tag not found

			const params = {
				source_tag_slug: 'source-tag',
				target_tag_slug: 'non-existent-target',
			};

			const result = await tag_merge( app, params );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( "Target tag 'non-existent-target' not found" );
		});
	});

	describe('error handling', () => {
		it('should handle database errors gracefully', async () => {
			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockRejectedValue( new Error( 'Database connection failed' ) ),
			} );

			const result = await tag_search( app, { query: 'test' } );

			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Database error' );
		});
	});
});
