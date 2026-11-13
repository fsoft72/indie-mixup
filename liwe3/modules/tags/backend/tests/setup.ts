import { vi } from 'vitest';
import type { LiWEApp } from '@backend/liwe3';
import { Hono } from 'hono';

// Mock D1 database for testing
export const createTestApp = () : LiWEApp => {
	const mockDb = {
		insert: vi.fn(),
		select: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	};

	return {
		hono: new Hono(),
		db: mockDb as any,
		env: {} as any,
	};
};

// Test data factories
export const createTestTag = ( overrides? : Partial<any> ) => ( {
	id: 1,
	name: 'Test Tag',
	slug: 'test-tag',
	description: 'A test tag for testing',
	color: '#FF0000',
	category: 'test',
	weight: 1.0,
	is_active: true,
	created: new Date(),
	updated: new Date(),
	updated_by: 'test-user',
	...overrides,
} );

export const createTestTaggable = ( overrides? : Partial<any> ) => ( {
	id: 1,
	tag_id: 1,
	module: 'test-module',
	id_object: 'test-object-1',
	relevance_score: 1.0,
	created: new Date(),
	updated: new Date(),
	updated_by: 'test-user',
	auto_tagged: false,
	...overrides,
} );

// Simple helper to create chain mock that resolves immediately
export const createMockChain = ( resolveValue : any ) => {
	const chain = {
		from: vi.fn(),
		where: vi.fn(),
		limit: vi.fn(),
		offset: vi.fn(),
		orderBy: vi.fn(),
		innerJoin: vi.fn(),
		leftJoin: vi.fn(),
		groupBy: vi.fn(),
		having: vi.fn(),
		set: vi.fn(),
		values: vi.fn(),
		returning: vi.fn(),
	};

	// Make all methods return this for chaining
	Object.keys( chain ).forEach( ( key ) => {
		chain[key].mockReturnThis();
	} );

	// The last method in chain should resolve
	chain.returning.mockResolvedValue( resolveValue );

	// Add promise resolution for queries that don't use returning
	( chain as any ).then = ( callback : any ) => Promise.resolve( resolveValue ).then( callback );

	return chain;
};

// Helper to reset all mocks
export const resetMocks = ( app : LiWEApp ) => {
	vi.clearAllMocks();
	app.db.insert.mockClear();
	app.db.select.mockClear();
	app.db.update.mockClear();
	app.db.delete.mockClear();
};
