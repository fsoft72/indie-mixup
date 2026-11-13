import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { indiegame_developer_get } from '../src/methods/indiegame-developer-get';
import { indiegame_ranking_developers } from '../src/methods/indiegame-ranking-developers';
import { indiegame_ranking_games } from '../src/methods/indiegame-ranking-games';
import { cachedRanking, rankDevelopers, rankGames } from '../src/lib/ranking';
import { createDb, createKv, insertEvent, insertGame, mkCtx, registerStubs } from './helpers';

const NOW = new Date( '2026-11-13T12:00:00Z' );

let env : ReturnType<typeof createDb>;
const ctx = ( envVars : Record<string, unknown> = {} ) => mkCtx( env.db, null, envVars );

const events = ( game : string, days : string[], kind = 'view' ) =>
	days.forEach( ( day, i ) => insertEvent( env.sqlite, { id: `${game}-${kind}-${day}-${i}`, id_game: game, kind, day } ) );

beforeAll( () => registerStubs() );

beforeEach( () => {
	env = createDb();
	vi.useFakeTimers( { toFake: [ 'Date' ] } );
	vi.setSystemTime( NOW );
} );

afterEach( () => vi.useRealTimers() );

describe('rankGames', () => {
	beforeEach( () => {
		insertGame( env.sqlite, { id: 'g1', name: 'Alpha' } );
		insertGame( env.sqlite, { id: 'g2', name: 'Beta' } );
		events( 'g1', [ '2026-11-13', '2026-11-13', '2026-11-13', '2026-11-12', '2026-11-12' ] );
		events( 'g2', [ '2026-11-01' ] );
	} );

	it('counts only events inside the window', async () => {
		expect( ( await rankGames( ctx(), 'acme', 'views', '1d', 20, NOW ) ).map( ( r ) => [ r.id, r.count ] ) ).toEqual( [ [ 'g1', 3 ] ] );
		expect( ( await rankGames( ctx(), 'acme', 'views', '7d', 20, NOW ) ).map( ( r ) => [ r.id, r.count ] ) ).toEqual( [ [ 'g1', 5 ] ] );
		expect( ( await rankGames( ctx(), 'acme', 'views', '30d', 20, NOW ) ).map( ( r ) => [ r.id, r.count ] ) ).toEqual( [ [ 'g1', 5 ], [ 'g2', 1 ] ] );
		expect( ( await rankGames( ctx(), 'acme', 'views', 'all', 20, NOW ) ).map( ( r ) => r.id ) ).toEqual( [ 'g1', 'g2' ] );
	});

	it('the 7d window starts six days before today', async () => {
		events( 'g2', [ '2026-11-07', '2026-11-06' ] );

		const week = await rankGames( ctx(), 'acme', 'views', '7d', 20, NOW );

		expect( week.find( ( r ) => r.id === 'g2' )?.count ).toBe( 1 );
	});

	it('views and downloads are separate rankings', async () => {
		events( 'g2', [ '2026-11-13', '2026-11-13' ], 'download' );

		const downloads = await rankGames( ctx(), 'acme', 'downloads', 'all', 20, NOW );

		expect( downloads.map( ( r ) => [ r.id, r.count ] ) ).toEqual( [ [ 'g2', 2 ] ] );
	});

	it('ignores hidden and deleted games', async () => {
		insertGame( env.sqlite, { id: 'h', name: 'Hidden', status: 'hidden' } );
		insertGame( env.sqlite, { id: 'd', name: 'Deleted', status: 'deleted' } );
		events( 'h', [ '2026-11-13', '2026-11-13', '2026-11-13', '2026-11-13' ] );
		events( 'd', [ '2026-11-13', '2026-11-13', '2026-11-13', '2026-11-13' ] );

		const ids = ( await rankGames( ctx(), 'acme', 'views', 'all', 20, NOW ) ).map( ( r ) => r.id );

		expect( ids ).toEqual( [ 'g1', 'g2' ] );
	});

	it('breaks ties by name and honours the limit', async () => {
		insertGame( env.sqlite, { id: 'z', name: 'Zed' } );
		insertGame( env.sqlite, { id: 'a', name: 'Aaa' } );
		events( 'z', [ '2026-11-01' ] );
		events( 'a', [ '2026-11-01' ] );

		const ranking = await rankGames( ctx(), 'acme', 'views', 'all', 3, NOW );

		expect( ranking.map( ( r ) => r.name ) ).toEqual( [ 'Alpha', 'Aaa', 'Beta' ] );
	});

	it('an empty ranking is an empty array and a game with no events is absent', async () => {
		insertGame( env.sqlite, { id: 'quiet', name: 'Quiet' } );

		expect( await rankGames( ctx(), 'acme', 'downloads', 'all', 20, NOW ) ).toEqual( [] );
		expect( ( await rankGames( ctx(), 'acme', 'views', 'all', 20, NOW ) ).some( ( r ) => r.id === 'quiet' ) ).toBe( false );
	});
});

describe('rankDevelopers', () => {
	beforeEach( () => {
		insertGame( env.sqlite, { id: 'a1', id_user: 'alice', created: '2026-11-13 08:00:00' } );
		insertGame( env.sqlite, { id: 'a2', id_user: 'alice', created: '2026-10-01 08:00:00' } );
		insertGame( env.sqlite, { id: 'b1', id_user: 'bob', created: '2026-11-12 08:00:00' } );
		insertGame( env.sqlite, { id: 'b2', id_user: 'bob', id_remix_of: 'a1', created: '2026-11-13 09:00:00' } );
		insertGame( env.sqlite, { id: 'b3', id_user: 'bob', id_remix_of: 'a2', created: '2026-11-13 10:00:00' } );
		insertGame( env.sqlite, { id: 'x', id_user: 'bob', status: 'hidden', created: '2026-11-13 10:00:00' } );
	} );

	it('counts originals and remixes separately', async () => {
		const originals = await rankDevelopers( ctx(), 'acme', 'originals', 'all', 20, NOW );
		const remixes = await rankDevelopers( ctx(), 'acme', 'remixes', 'all', 20, NOW );

		expect( originals.map( ( r ) => [ r.id_user, r.count ] ) ).toEqual( [ [ 'alice', 2 ], [ 'bob', 1 ] ] );
		expect( remixes.map( ( r ) => [ r.id_user, r.count ] ) ).toEqual( [ [ 'bob', 2 ] ] );
		expect( originals[0].author_name ).toBeTruthy();
	});

	it('uses the publication date of the game for the windows', async () => {
		const today = await rankDevelopers( ctx(), 'acme', 'originals', '1d', 20, NOW );
		const week = await rankDevelopers( ctx(), 'acme', 'originals', '7d', 20, NOW );

		expect( today.map( ( r ) => [ r.id_user, r.count ] ) ).toEqual( [ [ 'alice', 1 ] ] );
		expect( week.map( ( r ) => [ r.id_user, r.count ] ) ).toEqual( [ [ 'alice', 1 ], [ 'bob', 1 ] ] );
	});

	it('a game accepted as remix moves from originals to remixes', async () => {
		env.sqlite.prepare( "UPDATE indiegame_games SET id_remix_of = 'a1' WHERE id = 'b1'" ).run();

		expect( await rankDevelopers( ctx(), 'acme', 'originals', 'all', 20, NOW ) ).toEqual( [ expect.objectContaining( { id_user: 'alice', count: 2 } ) ] );
		expect( ( await rankDevelopers( ctx(), 'acme', 'remixes', 'all', 20, NOW ) )[0].count ).toBe( 3 );
	});

	it('ties are ordered by user id', async () => {
		insertGame( env.sqlite, { id: 'c1', id_user: 'carol', created: '2026-11-13 08:00:00' } );
		insertGame( env.sqlite, { id: 'c2', id_user: 'carol', created: '2026-11-13 08:00:00' } );

		const originals = await rankDevelopers( ctx(), 'acme', 'originals', 'all', 20, NOW );

		expect( originals.map( ( r ) => r.id_user ) ).toEqual( [ 'alice', 'carol', 'bob' ] );
	});
});

describe('cachedRanking', () => {
	it('computes once within the ttl and separates keys', async () => {
		const kv = createKv();
		const compute = vi.fn( async () => [ 1, 2, 3 ] );

		const first = await cachedRanking( ctx( { KV: kv } ), 'k1', 300, compute );
		const second = await cachedRanking( ctx( { KV: kv } ), 'k1', 300, compute );
		await cachedRanking( ctx( { KV: kv } ), 'k2', 300, compute );

		expect( first ).toEqual( [ 1, 2, 3 ] );
		expect( second ).toEqual( [ 1, 2, 3 ] );
		expect( compute ).toHaveBeenCalledTimes( 2 );
		expect( kv.put.mock.calls[0][2] ).toEqual( { expirationTtl: 300 } );
	});

	it('works without a KV binding', async () => {
		const compute = vi.fn( async () => 'x' );

		expect( await cachedRanking( ctx(), 'k', 300, compute ) ).toBe( 'x' );
		expect( await cachedRanking( ctx(), 'k', 300, compute ) ).toBe( 'x' );
		expect( compute ).toHaveBeenCalledTimes( 2 );
	});
});

describe('ranking endpoints', () => {
	beforeEach( () => {
		insertGame( env.sqlite, { id: 'g1', name: 'Alpha' } );
		events( 'g1', [ '2026-11-13' ] );
	} );

	it('return the ranking for valid parameters', async () => {
		const res = await indiegame_ranking_games( ctx(), { kind: 'views', window: 'all', limit: 20 } as any );

		expect( res.data ).toEqual( [ { id: 'g1', name: 'Alpha', count: 1 } ] );
	});

	it('an empty ranking is a 200 with an empty list', async () => {
		const res = await indiegame_ranking_games( ctx(), { kind: 'downloads', window: 'all', limit: 20 } as any );

		expect( res.ok ).toBe( true );
		expect( res.data ?? [] ).toEqual( [] );
	});

	it('limit 0, 1000, 2.5 and abc are a 400', async () => {
		for ( const limit of [ 0, 1000, 2.5, 'abc' ] ) {
			expect( ( await indiegame_ranking_games( ctx(), { kind: 'views', window: 'all', limit } as any ) ).status, String( limit ) ).toBe( 400 );
			expect( ( await indiegame_ranking_developers( ctx(), { kind: 'originals', window: 'all', limit } as any ) ).status, String( limit ) ).toBe( 400 );
		}
	});

	it('unknown window or kind is a 400', async () => {
		expect( ( await indiegame_ranking_games( ctx(), { kind: 'views', window: '1y', limit: 20 } as any ) ).status ).toBe( 400 );
		expect( ( await indiegame_ranking_games( ctx(), { kind: 'likes', window: 'all', limit: 20 } as any ) ).status ).toBe( 400 );
		expect( ( await indiegame_ranking_developers( ctx(), { kind: 'views', window: 'all', limit: 20 } as any ) ).status ).toBe( 400 );
		expect( ( await indiegame_ranking_developers( ctx(), { kind: 'originals', window: 'forever', limit: 20 } as any ) ).status ).toBe( 400 );
	});

	it('the second identical request is served from the cache', async () => {
		const kv = createKv();
		const params = { kind: 'views', window: 'all', limit: 20 } as any;

		await indiegame_ranking_games( ctx( { KV: kv } ), params );
		env.sqlite.prepare( 'DELETE FROM indiegame_events' ).run();
		const cached = await indiegame_ranking_games( ctx( { KV: kv } ), params );

		expect( cached.data ).toEqual( [ { id: 'g1', name: 'Alpha', count: 1 } ] );
	});
});

describe('developer profile', () => {
	it('returns counts and visible games of a developer', async () => {
		insertGame( env.sqlite, { id: 'o', id_user: 'alice' } );
		insertGame( env.sqlite, { id: 'r', id_user: 'alice', id_remix_of: 'o' } );
		insertGame( env.sqlite, { id: 'h', id_user: 'alice', status: 'hidden' } );

		const res = await indiegame_developer_get( ctx(), { id_user: 'alice' } as any );

		expect( res.data!.originals ).toBe( 1 );
		expect( res.data!.remixes ).toBe( 1 );
		expect( res.data!.games.map( ( g ) => g.id ).sort() ).toEqual( [ 'o', 'r' ] );
		expect( res.data!.author_name ).toBeTruthy();
	});

	it('a developer with no games has zero counts and an empty list', async () => {
		const res = await indiegame_developer_get( ctx(), { id_user: 'nobody' } as any );

		expect( res.ok ).toBe( true );
		expect( res.data!.originals ).toBe( 0 );
		expect( res.data!.games ).toEqual( [] );
	});
});
