import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	tag_add,
	tag_bulk_add,
	tag_bulk_remove,
	tag_list_by_object,
	tag_merge,
	tag_object,
	tag_remove_object,
	tag_search,
	tag_update_relevance,
} from '../src/methods';
import { createTestApp, createTestTag, createTestTaggable, resetMocks } from './setup';

describe('Tags Module - Comprehensive Tests', () => {
	let app : any;

	beforeEach( () => {
		app = createTestApp();
		resetMocks( app );
	} );

	describe('tag_add - Advanced Cases', () => {
		it('should generate slug from name with special characters', async () => {
			const newTag = createTestTag( { name: 'C++ Programming', slug: 'c-programming' } );

			app.db.insert.mockReturnValue( {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [ newTag ] ),
			} );

			const params = {
				name: 'C++ Programming',
				// No slug provided - should be generated
			};

			const result = await tag_add( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tag ).toEqual( newTag );
		});

		it('should handle database errors gracefully', async () => {
			const error = new Error( 'Database connection failed' );

			app.db.insert.mockReturnValue( {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockRejectedValue( error ),
			} );

			const params = {
				name: 'Test Tag',
			};

			const result = await tag_add( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toBe( 'Database error' );
		});
	});

	describe('tag_remove_object', () => {
		it('should successfully remove tag from object', async () => {
			const existingTag = createTestTag();

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue( [ existingTag ] ),
			} );

			app.db.delete.mockReturnValue( {
				where: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [ {} ] ), // One row deleted
			} );

			const params = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_remove_object( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.removed ).toBe( true );
			expect( result.data.message ).toBe( 'Tag removed successfully' );
		});

		it('should handle case when tag was not assigned', async () => {
			const existingTag = createTestTag();

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue( [ existingTag ] ),
			} );

			app.db.delete.mockReturnValue( {
				where: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [] ), // No rows deleted
			} );

			const params = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_remove_object( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.removed ).toBe( false );
			expect( result.data.message ).toBe( 'Tag was not assigned to this object' );
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
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockResolvedValue( tagData ),
			} );

			const params = {
				id_object: 'obj123',
				module: 'test-module',
				active_only: true,
			};

			const result = await tag_list_by_object( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( tagData );
			expect( result.data.tags ).toHaveLength( 1 );
		});

		it('should handle empty result', async () => {
			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockResolvedValue( [] ),
			} );

			const params = {
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_list_by_object( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( [] );
		});
	});

	describe('tag_search', () => {
		it('should search tags by query', async () => {
			const searchResults = [
				createTestTag( { name: 'JavaScript', slug: 'javascript' } ),
				createTestTag( { name: 'Java', slug: 'java' } ),
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockResolvedValue( searchResults ),
			} );

			const params = {
				query: 'java',
				active_only: true,
				limit: 10,
				offset: 0,
			};

			const result = await tag_search( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( searchResults );
		});

		it('should handle empty search results', async () => {
			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockResolvedValue( [] ),
			} );

			const params = {
				query: 'nonexistent',
			};

			const result = await tag_search( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( [] );
		});
	});

	describe('tag_update_relevance', () => {
		it('should successfully update relevance score', async () => {
			const existingTag = createTestTag();
			const updatedTaggable = createTestTaggable( { relevance_score: 0.9 } );

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue( [ existingTag ] ),
			} );

			app.db.update.mockReturnValue( {
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [ updatedTaggable ] ),
			} );

			const params = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: 0.9,
				updated_by: 'user123',
			};

			const result = await tag_update_relevance( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.updated ).toEqual( updatedTaggable );
		});

		it('should validate relevance range', async () => {
			const params = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: 1.5, // Invalid: above 1.0
			};

			const result = await tag_update_relevance( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toContain( 'Relevance must be between 0 and 1' );
		});
	});

	describe('tag_bulk_add', () => {
		it('should successfully add multiple tags to an object', async () => {
			const existingTags = [
				createTestTag( { id: 1, slug: 'tag1' } ),
				createTestTag( { id: 2, slug: 'tag2' } ),
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue( existingTags ),
			} );

			// Mock successful inserts
			let insertCallCount = 0;
			app.db.insert.mockImplementation( () => {
				insertCallCount++;
				return {
					values: vi.fn().mockReturnThis(),
					returning: vi.fn().mockResolvedValue( [ createTestTaggable( { tag_id: insertCallCount } ) ] ),
				};
			} );

			const params = {
				tag_slugs: [ 'tag1', 'tag2' ],
				id_object: 'obj123',
				module: 'test-module',
				relevance: 0.8,
			};

			const result = await tag_bulk_add( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tagged ).toHaveLength( 2 );
			expect( result.data.errors ).toHaveLength( 0 );
			expect( result.data.summary ).toBe( '2 tags added, 0 errors' );
		});

		it('should fail if some tags not found', async () => {
			const existingTags = [
				createTestTag( { slug: 'tag1' } ),
				// tag2 missing
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue( existingTags ),
			} );

			const params = {
				tag_slugs: [ 'tag1', 'tag2' ], // tag2 doesn't exist
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_bulk_add( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toContain( 'Tags not found: tag2' );
		});
	});

	describe('tag_bulk_remove', () => {
		it('should successfully remove multiple tags from an object', async () => {
			const existingTags = [
				createTestTag( { id: 1, slug: 'tag1' } ),
				createTestTag( { id: 2, slug: 'tag2' } ),
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue( existingTags ),
			} );

			app.db.delete.mockReturnValue( {
				where: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [ {}, {} ] ), // Two rows deleted
			} );

			const params = {
				tag_slugs: [ 'tag1', 'tag2' ],
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_bulk_remove( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.removed_count ).toBe( 2 );
			expect( result.data.message ).toBe( 'Removed 2 tags from test-module:obj123' );
		});
	});

	describe('tag_merge', () => {
		it('should fail if source and target are the same', async () => {
			const params = {
				source_tag_slug: 'same-tag',
				target_tag_slug: 'same-tag',
			};

			const result = await tag_merge( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toBe( 'Source and target tags cannot be the same' );
		});

		it('should validate merge parameters', async () => {
			const params = {
				source_tag_slug: '', // Invalid: empty slug
				target_tag_slug: 'target-tag',
			};

			const result = await tag_merge( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toContain( 'Source tag slug is required' );
		});
	});

	describe('Error handling', () => {
		it('should handle database errors gracefully', async () => {
			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockRejectedValue( new Error( 'Database connection failed' ) ),
			} );

			const result = await tag_search( app, { query: 'test' } );

			expect( result.ok ).toBe( false );
			expect( result.message ).toBe( 'Database connection failed' );
		});
	});
});
