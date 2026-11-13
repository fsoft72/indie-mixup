import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { indiegame_track } from '../src/methods/indiegame-track';
import { createDb, createKv, insertGame, mkCtx, mkUser, registerStubs } from './helpers';

const ENV = { VISITOR_SALT: 'test-salt-test-salt-test-salt-123' };

let env : ReturnType<typeof createDb>;

const track = ( kind : string, headers : Record<string, string> = {}, id_game = 'g1', envVars : Record<string, unknown> = ENV ) =>
	indiegame_track( mkCtx( env.db, null, envVars, headers ), { id_game, kind } as any );

const eventRows = () => env.sqlite.prepare( 'SELECT kind, day FROM indiegame_events ORDER BY day, kind' ).all();

beforeAll( () => registerStubs() );

beforeEach( () => {
	env = createDb();
	insertGame( env.sqlite, { id: 'g1', repo_url: 'https://github.com/alice/g1' } );
	vi.useFakeTimers( { toFake: [ 'Date' ] } );
	vi.setSystemTime( new Date( '2026-11-13T10:00:00Z' ) );
} );

afterEach( () => vi.useRealTimers() );

describe('indiegame_track', () => {
	it('first view counts, second the same day does not', async () => {
		const first = await track( 'view', { cookie: 'ig_vid=visitor-1' } );
		const second = await track( 'view', { cookie: 'ig_vid=visitor-1' } );

		expect( first.data!.counted ).toBe( true );
		expect( second.data!.counted ).toBe( false );
		expect( eventRows() ).toEqual( [ { kind: 'view', day: '2026-11-13' } ] );
	});

	it('different visitors both count', async () => {
		await track( 'view', { cookie: 'ig_vid=visitor-1' } );
		const other = await track( 'view', { cookie: 'ig_vid=visitor-2' } );

		expect( other.data!.counted ).toBe( true );
		expect( eventRows() ).toHaveLength( 2 );
	});

	it('same visitor counts again the next UTC day', async () => {
		vi.setSystemTime( new Date( '2026-11-13T23:59:59Z' ) );
		const late = await track( 'view', { cookie: 'ig_vid=visitor-1' } );

		vi.setSystemTime( new Date( '2026-11-14T00:00:00Z' ) );
		const early = await track( 'view', { cookie: 'ig_vid=visitor-1' } );

		expect( late.data!.counted ).toBe( true );
		expect( early.data!.counted ).toBe( true );
		expect( eventRows() ).toEqual( [ { kind: 'view', day: '2026-11-13' }, { kind: 'view', day: '2026-11-14' } ] );
	});

	it('view and download are counted separately', async () => {
		const headers = { cookie: 'ig_vid=visitor-1' };

		expect( ( await track( 'view', headers ) ).data!.counted ).toBe( true );
		expect( ( await track( 'download', headers ) ).data!.counted ).toBe( true );
		expect( ( await track( 'download', headers ) ).data!.counted ).toBe( false );
	});

	it('no cookie and no ip still counts once and does not throw', async () => {
		const first = await track( 'view' );
		const second = await track( 'view' );

		expect( first.ok ).toBe( true );
		expect( first.data!.counted ).toBe( true );
		expect( second.data!.counted ).toBe( false );
	});

	it('falls back to the ip when there is no cookie', async () => {
		await track( 'view', { 'cf-connecting-ip': '1.2.3.4' } );
		const otherIp = await track( 'view', { 'cf-connecting-ip': '5.6.7.8' } );
		const sameIp = await track( 'view', { 'cf-connecting-ip': '1.2.3.4' } );

		expect( otherIp.data!.counted ).toBe( true );
		expect( sameIp.data!.counted ).toBe( false );
		expect( JSON.stringify( env.sqlite.prepare( 'SELECT * FROM indiegame_events' ).all() ) ).not.toContain( '1.2.3.4' );
	});

	it('sets the visitor cookie only when the request has none', async () => {
		const without = mkCtx( env.db, null, ENV, {} );
		await indiegame_track( without, { id_game: 'g1', kind: 'view' } as any );

		const withCookie = mkCtx( env.db, null, ENV, { cookie: 'a=b; ig_vid=visitor-1' } );
		await indiegame_track( withCookie, { id_game: 'g1', kind: 'view' } as any );

		const header = ( without.c as any ).header as ReturnType<typeof vi.fn>;
		expect( header ).toHaveBeenCalledTimes( 1 );
		expect( header.mock.calls[0][0] ).toBe( 'Set-Cookie' );
		expect( header.mock.calls[0][1] ).toMatch( /^ig_vid=[\w-]+; Max-Age=\d+; Path=\/; HttpOnly; SameSite=Lax/ );
		expect( ( withCookie.c as any ).header ).not.toHaveBeenCalled();
	});

	it('unknown kind is a 400', async () => {
		const res = await track( 'like' );

		expect( res.status ).toBe( 400 );
		expect( eventRows() ).toEqual( [] );
	});

	it('hidden, deleted or unknown game is a 404', async () => {
		insertGame( env.sqlite, { id: 'h', status: 'hidden' } );
		insertGame( env.sqlite, { id: 'd', status: 'deleted' } );

		for ( const id of [ 'h', 'd', 'ghost' ] ) expect( ( await track( 'view', {}, id ) ).status, id ).toBe( 404 );
		expect( eventRows() ).toEqual( [] );
	});

	it('download returns the repo url', async () => {
		const res = await track( 'download', { cookie: 'ig_vid=v' } );

		expect( res.data!.repo_url ).toBe( 'https://github.com/alice/g1' );
	});

	it('a missing salt is a configuration error, not a silent weak hash', async () => {
		const res = await track( 'view', {}, 'g1', {} );

		expect( res.status ).toBe( 500 );
		expect( res.error?.code ).toBe( 'VISITOR_SALT_MISSING' );
	});

	it('SITE_SECRET is used when VISITOR_SALT is not set', async () => {
		const res = await track( 'view', {}, 'g1', { SITE_SECRET: 'site-secret-site-secret-site-secret-1' } );

		expect( res.ok ).toBe( true );
		expect( res.data!.counted ).toBe( true );
		expect( eventRows() ).toHaveLength( 1 );
	});
});

describe('forged cookies', () => {
	it('one IP cannot create more than 10 visitors per game, kind and day by changing the cookie', async () => {
		const kv = createKv();
		const withKv = { ...ENV, KV: kv };
		const results : boolean[] = [];

		for ( let i = 0; i < 15; i++ ) results.push( ( await track( 'view', { cookie: `ig_vid=forged-${i}`, 'cf-connecting-ip': '9.9.9.9' }, 'g1', withKv ) ).data!.counted );

		expect( results.filter( Boolean ) ).toHaveLength( 10 );
		expect( results.slice( 0, 10 ).every( Boolean ) ).toBe( true );
		expect( ( await track( 'view', { cookie: 'ig_vid=forged-x', 'cf-connecting-ip': '8.8.8.8' }, 'g1', withKv ) ).data!.counted ).toBe( true );
		expect( ( await track( 'download', { cookie: 'ig_vid=forged-x', 'cf-connecting-ip': '9.9.9.9' }, 'g1', withKv ) ).data!.counted ).toBe( true );
	});
});
