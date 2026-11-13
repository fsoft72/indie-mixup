import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tag_list } from '../src/methods';
import { createMockChain, createTestApp, createTestTag, resetMocks } from './setup';

describe('Tags Module - tag_list', () => {
	let app : any;

	beforeEach( () => {
		app = createTestApp();
		resetMocks( app );
	} );

	describe('validation', () => {
		it('should validate limit parameter range', async () => {
			const params = {
				limit: 101, // Exceeds maximum of 100
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toContain( 'Too big: expected number to be <=100' );
		});

		it('should validate offset parameter is not negative', async () => {
			const params = {
				offset: -1, // Negative offset not allowed
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toContain( 'Too small: expected number to be >=0' );
		});

		it('should validate order_by field', async () => {
			const params = {
				order_by: 'invalid_field' as any,
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toContain( 'invalid_value' );
		});

		it('should validate order_direction', async () => {
			const params = {
				order_direction: 'invalid_direction' as any,
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( false );
			expect( result.message ).toContain( 'invalid_value' );
		});
	});

	describe('pagination', () => {
		it('should return paginated results with default parameters', async () => {
			const mockTags = [
				createTestTag( { id: 1, name: 'Tag 1', slug: 'tag-1' } ),
				createTestTag( { id: 2, name: 'Tag 2', slug: 'tag-2' } ),
			];

			app.db.select
				.mockReturnValueOnce( createMockChain( [ { count: 2 } ] ) )
				.mockReturnValueOnce( createMockChain( mockTags ) );

			const result = await tag_list( app, {} );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( mockTags );
			expect( result.data.total ).toBe( 2 );
		});

		it('should apply limit and offset parameters', async () => {
			const mockTags = [ createTestTag( { id: 3, name: 'Tag 3', slug: 'tag-3' } ) ];

			app.db.select
				.mockReturnValueOnce( createMockChain( [ { count: 10 } ] ) )
				.mockReturnValueOnce( createMockChain( mockTags ) );

			const params = {
				limit: 1,
				offset: 2,
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( mockTags );
			expect( result.data.total ).toBe( 10 );
		});
	});

	describe('filtering', () => {
		it('should filter by category', async () => {
			const programmingTags = [
				createTestTag( { id: 1, name: 'JavaScript', category: 'programming' } ),
				createTestTag( { id: 2, name: 'Python', category: 'programming' } ),
			];

			app.db.select
				.mockReturnValueOnce( createMockChain( [ { count: 2 } ] ) )
				.mockReturnValueOnce( createMockChain( programmingTags ) );

			const params = {
				category: 'programming',
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( programmingTags );
			expect( result.data.total ).toBe( 2 );
		});

		it('should filter by active status', async () => {
			const activeTags = [
				createTestTag( { id: 1, name: 'Active Tag', is_active: true } ),
			];

			app.db.select
				.mockReturnValueOnce( createMockChain( [ { count: 1 } ] ) )
				.mockReturnValueOnce( createMockChain( activeTags ) );

			const params = {
				active_only: true,
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( activeTags );
		});

		it('should include inactive tags when active_only is false', async () => {
			const allTags = [
				createTestTag( { id: 1, name: 'Active Tag', is_active: true } ),
				createTestTag( { id: 2, name: 'Inactive Tag', is_active: false } ),
			];

			app.db.select
				.mockReturnValueOnce( createMockChain( [ { count: 2 } ] ) )
				.mockReturnValueOnce( createMockChain( allTags ) );

			const params = {
				active_only: false,
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( allTags );
			expect( result.data.total ).toBe( 2 );
		});
	});

	describe('sorting', () => {
		it('should sort by name ascending by default', async () => {
			const sortedTags = [
				createTestTag( { id: 1, name: 'A Tag' } ),
				createTestTag( { id: 2, name: 'B Tag' } ),
			];

			app.db.select
				.mockReturnValueOnce( createMockChain( [ { count: 2 } ] ) )
				.mockReturnValueOnce( createMockChain( sortedTags ) );

			const result = await tag_list( app, {} );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( sortedTags );
		});

		it('should sort by created date when specified', async () => {
			const recentTags = [
				createTestTag( { id: 2, name: 'Newer Tag', created: new Date( '2023-02-01' ) } ),
				createTestTag( { id: 1, name: 'Older Tag', created: new Date( '2023-01-01' ) } ),
			];

			app.db.select
				.mockReturnValueOnce( createMockChain( [ { count: 2 } ] ) )
				.mockReturnValueOnce( createMockChain( recentTags ) );

			const params = {
				order_by: 'created' as const,
				order_direction: 'desc' as const,
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( recentTags );
		});

		it('should sort by weight when specified', async () => {
			const weightedTags = [
				createTestTag( { id: 1, name: 'Heavy Tag', weight: 10.0 } ),
				createTestTag( { id: 2, name: 'Light Tag', weight: 1.0 } ),
			];

			app.db.select
				.mockReturnValueOnce( createMockChain( [ { count: 2 } ] ) )
				.mockReturnValueOnce( createMockChain( weightedTags ) );

			const params = {
				order_by: 'weight' as const,
				order_direction: 'desc' as const,
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( weightedTags );
		});
	});

	describe('combined filters and sorting', () => {
		it('should apply category filter with custom sorting', async () => {
			const filteredAndSorted = [
				createTestTag( {
					id: 3,
					name: 'C Programming',
					category: 'programming',
					weight: 5.0,
				} ),
				createTestTag( {
					id: 1,
					name: 'A Programming',
					category: 'programming',
					weight: 3.0,
				} ),
			];

			app.db.select
				.mockReturnValueOnce( createMockChain( [ { count: 2 } ] ) )
				.mockReturnValueOnce( createMockChain( filteredAndSorted ) );

			const params = {
				category: 'programming',
				order_by: 'weight' as const,
				order_direction: 'desc' as const,
				limit: 10,
				offset: 0,
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( filteredAndSorted );
			expect( result.data.total ).toBe( 2 );
		});
	});

	describe('error handling', () => {
		it('should handle zero count result', async () => {
			app.db.select
				.mockReturnValueOnce( createMockChain( [ { count: 0 } ] ) )
				.mockReturnValueOnce( createMockChain( [] ) );

			const result = await tag_list( app, {} );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( [] );
			expect( result.data.total ).toBe( 0 );
		});

		it('should handle missing count result', async () => {
			app.db.select
				.mockReturnValueOnce( createMockChain( [] ) ) // No count result
				.mockReturnValueOnce( createMockChain( [] ) );

			const result = await tag_list( app, {} );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( [] );
			expect( result.data.total ).toBe( 0 );
		});
	});

	describe('type coercion', () => {
		it('should coerce string numbers to numbers', async () => {
			const mockTags = [ createTestTag() ];

			app.db.select
				.mockReturnValueOnce( createMockChain( [ { count: 1 } ] ) )
				.mockReturnValueOnce( createMockChain( mockTags ) );

			const params = {
				limit: '5' as any, // String that should be coerced to number
				offset: '10' as any, // String that should be coerced to number
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( mockTags );
		});

		it('should coerce string booleans to booleans', async () => {
			const mockTags = [ createTestTag() ];

			app.db.select
				.mockReturnValueOnce( createMockChain( [ { count: 1 } ] ) )
				.mockReturnValueOnce( createMockChain( mockTags ) );

			const params = {
				active_only: 'false' as any, // String that should be coerced to boolean
			};

			const result = await tag_list( app, params );

			expect( result.ok ).toBe( true );
			expect( result.data.tags ).toEqual( mockTags );
		});
	});
});
