import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { module_init } from '../src/index';
import { createTestApp, createTestTag, createTestTaggable, resetMocks } from './setup';

describe('Tags Module - Integration Tests', () => {
	let app : any;
	let hono : Hono;

	beforeEach( () => {
		app = createTestApp();
		hono = app.hono;
		resetMocks( app );

		// Initialize the module with our test app
		module_init( app );
	} );

	describe('POST /api/tags/tag/add', () => {
		it('should add a new tag successfully', async () => {
			const newTag = createTestTag();
			app.db.insert.mockReturnValue( {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [ newTag ] ),
			} );

			const requestBody = {
				name: 'Test Tag',
				slug: 'test-tag',
				description: 'A test tag',
				color: '#FF0000',
				category: 'test',
				weight: 5.0,
			};

			const response = await hono.request( '/api/tags/tag/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.tag ).toEqual( newTag );
		});

		it('should handle validation errors', async () => {
			const requestBody = {
				name: '', // Invalid: empty name
			};

			const response = await hono.request( '/api/tags/tag/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Invalid parameters' );
		});

		it('should handle malformed JSON', async () => {
			const response = await hono.request( '/api/tags/tag/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: 'invalid json',
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( false );
		});
	});

	describe('POST /api/tags/obj/add', () => {
		it('should tag an object successfully', async () => {
			const existingTag = createTestTag();
			const newTaggable = createTestTaggable();

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( [ existingTag ] ),
			} );

			app.db.insert.mockReturnValue( {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [ newTaggable ] ),
			} );

			const requestBody = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: 0.8,
			};

			const response = await hono.request( '/api/tags/obj/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.taggable ).toEqual( newTaggable );
		});

		it('should handle tag not found', async () => {
			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( [] ), // No tag found
			} );

			const requestBody = {
				tag_slug: 'non-existent-tag',
				id_object: 'obj123',
				module: 'test-module',
			};

			const response = await hono.request( '/api/tags/obj/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( false );
			expect( result.error ).toContain( 'not found' );
		});
	});

	describe('DELETE /api/tags/obj/del', () => {
		it('should remove tag from object successfully', async () => {
			const existingTag = createTestTag();

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( [ existingTag ] ),
			} );

			app.db.delete.mockReturnValue( {
				where: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [ {} ] ), // One row deleted
			} );

			const requestBody = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
			};

			const response = await hono.request( '/api/tags/obj/del', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.removed ).toBe( true );
		});
	});

	describe('GET /api/tags/obj/list', () => {
		it('should list tags for an object', async () => {
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

			const response = await hono.request( '/api/tags/obj/list?id_object=obj123&module=test-module', {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.tags ).toEqual( tagData );
		});
	});

	describe('POST /api/tags/find/by/tags', () => {
		it('should find objects by tags', async () => {
			const tags = [ createTestTag() ];
			const objects = [
				{
					module: 'test-module',
					id_object: 'obj123',
					affinityScore: 0.8,
					matchingTags: 1,
					tagDetails: 'Test Tag:0.8',
				},
			];

			app.db.select
				.mockReturnValueOnce( {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					then: vi.fn().mockResolvedValue( tags ),
				} )
				.mockReturnValueOnce( {
					from: vi.fn().mockReturnThis(),
					innerJoin: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					having: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					then: vi.fn().mockResolvedValue( objects ),
				} );

			const requestBody = {
				tag_slugs: [ 'test-tag' ],
				target_module: 'test-module',
				match_type: 'any',
				limit: 10,
			};

			const response = await hono.request( '/api/tags/find/by/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.objects ).toEqual( objects );
		});

		it('should handle no valid tags found', async () => {
			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( [] ), // No tags found
			} );

			const requestBody = {
				tag_slugs: [ 'non-existent-tag' ],
				target_module: 'test-module',
			};

			const response = await hono.request( '/api/tags/find/by/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'No valid tags found' );
		});
	});

	describe('POST /api/tags/find/by/affinity', () => {
		it('should find objects by affinity', async () => {
			const objects = [
				{
					module: 'target-module',
					id_object: 'obj456',
					affinityScore: 0.7,
					matchingTags: 2,
					tagDetails: 'Tag1:0.8,Tag2:0.6',
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
				then: vi.fn().mockResolvedValue( objects ),
			} );

			const requestBody = {
				source_id_object: 'obj123',
				source_module: 'source-module',
				target_module: 'target-module',
				min_affinity_score: 0.5,
				limit: 10,
			};

			const response = await hono.request( '/api/tags/find/by/affinity', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.objects ).toEqual( objects );
		});
	});

	describe('POST /api/tags/search', () => {
		it('should search tags', async () => {
			const searchResults = [
				createTestTag( { name: 'JavaScript', slug: 'javascript' } ),
				createTestTag( { name: 'Java', slug: 'java' } ),
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( searchResults ),
			} );

			const requestBody = {
				query: 'java',
				active_only: true,
				limit: 10,
			};

			const response = await hono.request( '/api/tags/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.tags ).toEqual( searchResults );
		});

		it('should handle empty search results', async () => {
			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( [] ),
			} );

			const requestBody = {
				query: 'nonexistent',
			};

			const response = await hono.request( '/api/tags/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.tags ).toEqual( [] );
		});
	});

	describe('PATCH /api/tags/relevance/update', () => {
		it('should update relevance score', async () => {
			const existingTag = createTestTag();
			const updatedTaggable = createTestTaggable( { relevance_score: 0.9 } );

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( [ existingTag ] ),
			} );

			app.db.update.mockReturnValue( {
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [ updatedTaggable ] ),
			} );

			const requestBody = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: 0.9,
			};

			const response = await hono.request( '/api/tags/relevance/update', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.updated ).toEqual( updatedTaggable );
		});
	});

	describe('POST /api/tags/stats', () => {
		it('should get tag statistics', async () => {
			const stats = [
				{
					tagId: 1,
					tagName: 'Test Tag',
					tagSlug: 'test-tag',
					category: 'test',
					weight: 1.0,
					totalUsage: 5,
					avgRelevance: 0.8,
					moduleBreakdown: 'module1:3,module2:2',
					autoTaggedCount: 2,
					manualTaggedCount: 3,
					lastUsed: Date.now(),
				},
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( stats ),
			} );

			const requestBody = {
				category: 'test',
			};

			const response = await hono.request( '/api/tags/stats', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.stats ).toEqual( stats );
		});
	});

	describe('POST /api/tags/bulk/add', () => {
		it('should bulk add tags to an object', async () => {
			const existingTags = [
				createTestTag( { slug: 'tag1' } ),
				createTestTag( { slug: 'tag2' } ),
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( existingTags ),
			} );

			app.db.insert
				.mockReturnValueOnce( {
					values: vi.fn().mockReturnThis(),
					returning: vi.fn().mockResolvedValue( [ createTestTaggable( { tag_id: 1 } ) ] ),
				} )
				.mockReturnValueOnce( {
					values: vi.fn().mockReturnThis(),
					returning: vi.fn().mockResolvedValue( [ createTestTaggable( { tag_id: 2 } ) ] ),
				} );

			const requestBody = {
				tag_slugs: [ 'tag1', 'tag2' ],
				id_object: 'obj123',
				module: 'test-module',
			};

			const response = await hono.request( '/api/tags/bulk/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.tagged ).toHaveLength( 2 );
			expect( result.errors ).toHaveLength( 0 );
		});
	});

	describe('DELETE /api/tags/bulk/del', () => {
		it('should bulk remove tags from an object', async () => {
			const existingTags = [
				createTestTag( { id: 1, slug: 'tag1' } ),
				createTestTag( { id: 2, slug: 'tag2' } ),
			];

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( existingTags ),
			} );

			app.db.delete.mockReturnValue( {
				where: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [ {}, {} ] ), // Two rows deleted
			} );

			const requestBody = {
				tag_slugs: [ 'tag1', 'tag2' ],
				id_object: 'obj123',
				module: 'test-module',
			};

			const response = await hono.request( '/api/tags/bulk/del', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.removed_count ).toBe( 2 );
		});
	});

	describe('POST /api/tags/list/by/module', () => {
		it('should list objects by module', async () => {
			const objects = [
				{
					id_object: 'obj123',
					tagCount: 3,
					avgRelevance: 0.8,
					tagList: 'Tag1,Tag2,Tag3',
					tagSlugs: 'tag1,tag2,tag3',
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
				offset: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( objects ),
			} );

			const requestBody = {
				module: 'test-module',
				min_tag_count: 1,
			};

			const response = await hono.request( '/api/tags/list/by/module', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.objects ).toEqual( objects );
		});
	});

	describe('PATCH /api/tags/merge', () => {
		it('should merge tags', async () => {
			const sourceTag = createTestTag( { id: 1, slug: 'source-tag' } );
			const targetTag = createTestTag( { id: 2, slug: 'target-tag' } );
			const assignments = [ createTestTaggable( { id: 1, tag_id: 1 } ) ];

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
					then: vi.fn().mockResolvedValue( assignments ),
				} );

			app.db.update.mockReturnValue( {
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				then: vi.fn().mockResolvedValue( undefined ),
			} );

			const requestBody = {
				source_tag_slug: 'source-tag',
				target_tag_slug: 'target-tag',
			};

			const response = await hono.request( '/api/tags/merge', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( true );
			expect( result.merged_count ).toBe( 1 );
		});

		it('should handle same source and target tags', async () => {
			const requestBody = {
				source_tag_slug: 'same-tag',
				target_tag_slug: 'same-tag',
			};

			const response = await hono.request( '/api/tags/merge', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Source and target tags cannot be the same' );
		});
	});

	describe('Error handling', () => {
		it('should handle general exceptions in endpoints', async () => {
			// Mock a database error
			app.db.insert.mockReturnValue( {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockRejectedValue( new Error( 'Database connection failed' ) ),
			} );

			const requestBody = {
				name: 'Test Tag',
			};

			const response = await hono.request( '/api/tags/tag/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( requestBody ),
			} );

			expect( response.status ).toBe( 200 );
			const result = await response.json();
			expect( result.success ).toBe( false );
			expect( result.error ).toBe( 'Database connection failed' );
		});
	});
});
