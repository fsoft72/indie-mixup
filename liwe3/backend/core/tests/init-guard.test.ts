import { describe, expect, it, vi } from 'vitest';
import { createInitGuard } from '../src/init-guard';

describe('createInitGuard', () => {
	it('runs the initializer only once on success', async () => {
		const init = vi.fn( async () => 'app' );
		const ensure = createInitGuard( init );

		expect( await ensure() ).toBe( 'app' );
		expect( await ensure() ).toBe( 'app' );
		expect( init ).toHaveBeenCalledTimes( 1 );
	});

	it('shares one in-flight promise between concurrent callers', async () => {
		let resolve! : ( v : string ) => void;
		const init = vi.fn( () =>
			new Promise<string>( ( r ) => {
				resolve = r;
			} )
		);
		const ensure = createInitGuard( init );

		const a = ensure();
		const b = ensure();
		resolve( 'app' );

		expect( await a ).toBe( 'app' );
		expect( await b ).toBe( 'app' );
		expect( init ).toHaveBeenCalledTimes( 1 );
	});

	it('retries after a failed attempt instead of caching the rejection', async () => {
		const init = vi.fn()
			.mockRejectedValueOnce( new Error( 'transient' ) )
			.mockResolvedValueOnce( 'app' );
		const ensure = createInitGuard( init );

		await expect( ensure() ).rejects.toThrow( 'transient' );
		expect( await ensure() ).toBe( 'app' );
		expect( init ).toHaveBeenCalledTimes( 2 );
	});
});
