import { beforeEach, describe, expect, it } from 'vitest';
import {
	sessionCreate,
	sessionDestroy,
	sessionGet,
	sessionListIds,
	sessionRefresh,
	sessionUpdateMetadata,
} from '../src/session';

/**
 * Minimal in-memory KVNamespace mock, faithful enough to exercise real
 * get/put/delete/list semantics (including prefix listing) without needing
 * a live Cloudflare KV binding.
 */
class InMemoryKV {
	private store = new Map<string, string>();
	// Last put options seen per key, so tests can assert TTL bookkeeping.
	putOpts = new Map<string, any>();

	async get ( key : string ) : Promise<string | null> {
		return this.store.has( key ) ? this.store.get( key )! : null;
	}

	async put ( key : string, value : string, opts? : any ) : Promise<void> {
		this.store.set( key, value );
		this.putOpts.set( key, opts );
	}

	async delete ( key : string ) : Promise<void> {
		this.store.delete( key );
	}

	async list ( opts : { prefix? : string; cursor? : string } = {} ) : Promise<any> {
		const prefix = opts.prefix ?? '';
		const keys = Array.from( this.store.keys() )
			.filter( ( k ) => k.startsWith( prefix ) )
			.map( ( name ) => ( { name } ) );

		return { keys, list_complete: true, cursor: undefined };
	}
}

describe('session', () => {
	let kv : InMemoryKV;

	beforeEach( () => {
		kv = new InMemoryKV();
	} );

	describe('sessionCreate + sessionListIds', () => {
		it('lists a single created session for its user', async () => {
			const sessionId = await sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 3600 } );

			const ids = await sessionListIds( kv as any, 'user_1' );

			expect( ids ).toEqual( [ sessionId ] );
		});

		it('accumulates independent sessions across concurrent logins for the same user', async () => {
			// Two "concurrent" logins for the same user, interleaved to emulate a race:
			// both would previously read the same (empty) shared list before either wrote
			// back, causing one session id to be lost. Each session now gets its own KV
			// key, so both must survive regardless of interleaving.
			const [ sessionA, sessionB ] = await Promise.all( [
				sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 3600 } ),
				sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 3600 } ),
			] );

			const ids = await sessionListIds( kv as any, 'user_1' );

			expect( ids.sort() ).toEqual( [ sessionA, sessionB ].sort() );
			expect( ids ).toHaveLength( 2 );
		});

		it('keeps sessions from different users isolated', async () => {
			const sessionUser1 = await sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 3600 } );
			await sessionCreate( kv as any, 'acme', 'user_2', { expiresIn: 3600 } );

			const idsUser1 = await sessionListIds( kv as any, 'user_1' );

			expect( idsUser1 ).toEqual( [ sessionUser1 ] );
		});
	});

	describe('sessionDestroy', () => {
		it('removes the session and its index entry when userId is provided', async () => {
			const sessionId = await sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 3600 } );

			await sessionDestroy( kv as any, 'acme', sessionId, 'user_1' );

			expect( await sessionGet( kv as any, 'acme', sessionId ) ).toBeNull();
			expect( await sessionListIds( kv as any, 'user_1' ) ).toEqual( [] );
		});

		it('removes the session but leaves the index entry when userId is omitted', async () => {
			const sessionId = await sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 3600 } );

			await sessionDestroy( kv as any, 'acme', sessionId );

			expect( await sessionGet( kv as any, 'acme', sessionId ) ).toBeNull();
			// Index entry lingers until its own TTL expires - acceptable, self-healing.
			expect( await sessionListIds( kv as any, 'user_1' ) ).toEqual( [ sessionId ] );
		});

		it('destroying one session does not affect a sibling session for the same user', async () => {
			const sessionA = await sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 3600 } );
			const sessionB = await sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 3600 } );

			await sessionDestroy( kv as any, 'acme', sessionA, 'user_1' );

			expect( await sessionGet( kv as any, 'acme', sessionB ) ).not.toBeNull();
			expect( await sessionListIds( kv as any, 'user_1' ) ).toEqual( [ sessionB ] );
		});
	});

	describe('sessionRefresh', () => {
		it('returns false for an unknown session', async () => {
			expect( await sessionRefresh( kv as any, 'acme', 'sess_missing', 3600 ) ).toBe( false );
		});

		it('extends the expiry and keeps the session listed', async () => {
			const sessionId = await sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 60 } );

			const ok = await sessionRefresh( kv as any, 'acme', sessionId, 3600 );

			expect( ok ).toBe( true );
			expect( await sessionListIds( kv as any, 'user_1' ) ).toEqual( [ sessionId ] );
		});

		it('bumps the per-user index entry TTL in step with the session, so it does not expire early', async () => {
			const sessionId = await sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 60 } );
			const indexKey = `user_session_idx:user_1:${sessionId}`;

			expect( kv.putOpts.get( indexKey )?.expirationTtl ).toBe( 60 );

			await sessionRefresh( kv as any, 'acme', sessionId, 3600 );

			expect( kv.putOpts.get( indexKey )?.expirationTtl ).toBe( 3600 );
		});
	});

	describe('sessionUpdateMetadata', () => {
		it('returns false for an unknown session', async () => {
			expect( await sessionUpdateMetadata( kv as any, 'acme', 'sess_missing', { a: 1 } ) ).toBe( false );
		});

		it('merges into existing metadata rather than replacing it', async () => {
			const sessionId = await sessionCreate( kv as any, 'acme', 'user_1', {
				expiresIn: 3600,
				metadata: { a: 1 },
			} );

			await sessionUpdateMetadata( kv as any, 'acme', sessionId, { b: 2 } );

			const data = await sessionGet( kv as any, 'acme', sessionId );
			expect( data?.metadata ).toEqual( { a: 1, b: 2 } );
		});
	});

	describe('logout-everywhere flow (sessionListIds + sessionDestroy)', () => {
		it('revokes every session created for a user, including ones from a racy double-login', async () => {
			const [ sessionA, sessionB, sessionC ] = await Promise.all( [
				sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 3600 } ),
				sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 3600 } ),
				sessionCreate( kv as any, 'acme', 'user_1', { expiresIn: 3600 } ),
			] );

			const idsToRevoke = await sessionListIds( kv as any, 'user_1' );
			for ( const id of idsToRevoke ) {
				await sessionDestroy( kv as any, 'acme', id, 'user_1' );
			}

			for ( const id of [ sessionA, sessionB, sessionC ] ) {
				expect( await sessionGet( kv as any, 'acme', id ) ).toBeNull();
			}
			expect( await sessionListIds( kv as any, 'user_1' ) ).toEqual( [] );
		});
	});
});
