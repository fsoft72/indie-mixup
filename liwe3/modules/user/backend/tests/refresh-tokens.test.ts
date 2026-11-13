import { describe, expect, it, vi } from 'vitest';
import type { LiWECtx } from '@backend/liwe3';
import { refresh_tokens_gc } from '../src/methods/utils';

/**
 * ctx whose db.delete().where().run() records the where clause and returns a
 * D1-style result with a changes count.
 */
const makeCtx = ( changes : number ) => {
	const run = vi.fn().mockResolvedValue( { meta: { changes } } );
	const where = vi.fn( () => ( { run } ) );
	const del = vi.fn( () => ( { where } ) );
	const ctx = { app: { db: { delete: del } } } as unknown as LiWECtx;
	return { ctx, del, where, run };
};

describe('refresh_tokens_gc', () => {
	it('deletes rows past the grace window and returns the count', async () => {
		const { ctx, del, run } = makeCtx( 4 );

		const removed = await refresh_tokens_gc( ctx );

		expect( del ).toHaveBeenCalledOnce();
		expect( run ).toHaveBeenCalledOnce();
		expect( removed ).toBe( 4 );
	});

	it('returns 0 when the driver reports no meta', async () => {
		const run = vi.fn().mockResolvedValue( {} );
		const ctx = { app: { db: { delete: () => ( { where: () => ( { run } ) } ) } } } as unknown as LiWECtx;

		expect( await refresh_tokens_gc( ctx ) ).toBe( 0 );
	});
});
