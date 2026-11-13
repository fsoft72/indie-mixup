import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tag_add, tag_object } from '../src/methods';
import { createTestApp, createTestTag, resetMocks } from './setup';

describe('Tags Module - Core Methods', () => {
	let app : any;

	beforeEach( () => {
		app = createTestApp();
		resetMocks( app );
	} );

	describe('tag_add', () => {
		it('should validate required parameters', async () => {
			const params = {
				name: '', // Invalid: empty name
			};

			const result = await tag_add( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toContain( 'Tag name is required' );
		});

		it('should validate color format', async () => {
			const params = {
				name: 'Test Tag',
				color: 'not-a-hex-color', // Invalid color format
			};

			const result = await tag_add( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toContain( 'Color must be a valid hex code' );
		});

		it('should accept valid parameters', async () => {
			const newTag = createTestTag();

			// Setup simple mock
			app.db.insert.mockReturnValue( {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [ newTag ] ),
			} );

			const params = {
				name: 'Test Tag',
				slug: 'test-tag',
				description: 'A test tag',
				color: '#FF0000',
				category: 'test',
				weight: 5.0,
			};

			const result = await tag_add( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tag ).toEqual( newTag );
		});

		it('should handle database constraint errors', async () => {
			const error = new Error( 'Constraint failed' );
			( error as any ).code = 'SQLITE_CONSTRAINT_UNIQUE';

			app.db.insert.mockReturnValue( {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockRejectedValue( error ),
			} );

			const params = {
				name: 'Duplicate Tag',
			};

			const result = await tag_add( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toBe( 'Tag name or slug already exists' );
		});
	});

	describe('tag_object', () => {
		it('should validate required parameters', async () => {
			const params = {
				tag_slug: '', // Invalid: empty slug
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_object( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toContain( 'Tag slug is required' );
		});

		it('should handle tag not found', async () => {
			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue( [] ), // No tag found
			} );

			const params = {
				tag_slug: 'non-existent-tag',
				id_object: 'obj123',
				module: 'test-module',
			};

			const result = await tag_object( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toBe( "Tag with slug 'non-existent-tag' not found" );
		});

		it('should successfully tag an object', async () => {
			const existingTag = createTestTag();
			const newTaggable = { id: 1, tag_id: 1, module: 'test-module', id_object: 'obj123' };

			app.db.select.mockReturnValue( {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue( [ existingTag ] ),
			} );

			app.db.insert.mockReturnValue( {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue( [ newTaggable ] ),
			} );

			const params = {
				tag_slug: 'test-tag',
				id_object: 'obj123',
				module: 'test-module',
				relevance: 0.8,
			};

			const result = await tag_object( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.taggable ).toEqual( newTaggable );
		});
	});
});
