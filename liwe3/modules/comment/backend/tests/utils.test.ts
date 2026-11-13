import { describe, expect, it, vi } from 'vitest';
import type { LiWECtx } from '@backend/liwe3';
import { comments_get_all_by_user } from '../src/methods/utils';

/** Rows a real driver would hand back for the SELECT. */
const ROWS = [
	{ id: 'c1', id_user: 'user-A', module: 'blog' },
	{ id: 'c2', id_user: 'user-A', module: 'blog' },
	{ id: 'c3', id_user: 'user-A', module: 'shop' },
];

/**
 * What Drizzle's `.run()` returns for a SELECT on D1: the raw driver envelope,
 * not the rows. Calling `.run()` where `.all()` is meant is exactly the P0-9 bug.
 */
const D1_RAW = { success: true, meta: { rows_read: 3 }, results: ROWS };

/**
 * Builds a ctx whose db exposes the `select().from().where()` chain with both
 * `.all()` (rows) and `.run()` (raw envelope) so the test can tell which one the
 * method calls.
 */
const makeCtx = () : LiWECtx => {
	const whereResult = {
		all: vi.fn( () => ROWS ),
		run: vi.fn( () => D1_RAW ),
	};
	const db = {
		select: vi.fn( () => ( {
			from: vi.fn( () => ( {
				where: vi.fn( () => whereResult ),
			} ) ),
		} ) ),
	};

	return {
		app: { db },
		c: null,
		sessionId: null,
		session: async () => null,
		user: async () => null,
	} as unknown as LiWECtx;
};

describe('comments_get_all_by_user', () => {
	it('returns the matching comments as a real array', async () => {
		const res = await comments_get_all_by_user( makeCtx(), { id_user: 'user-A' } );

		expect( Array.isArray( res.data ) ).toBe( true );
		expect( res.data ).toHaveLength( 3 );
	});
});

// The static `select()...run()` regression guard is now repo-wide, in
// `liwe3/backend/core/tests/no-select-run.test.ts` (it scans this module too).
