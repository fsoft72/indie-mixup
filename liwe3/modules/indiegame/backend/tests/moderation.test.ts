import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { indiegame_admin_hide } from '../src/methods/indiegame-admin-hide';
import { indiegame_admin_report_close } from '../src/methods/indiegame-admin-report-close';
import { indiegame_admin_reports } from '../src/methods/indiegame-admin-reports';
import { indiegame_get } from '../src/methods/indiegame-get';
import { indiegame_list } from '../src/methods/indiegame-list';
import { indiegame_ranking_games } from '../src/methods/indiegame-ranking-games';
import { indiegame_report } from '../src/methods/indiegame-report';
import { indiegame_track } from '../src/methods/indiegame-track';
import { createDb, createKv, insertEvent, insertGame, mkCtx, mkUser, registerStubs } from './helpers';

const alice = mkUser( 'alice' );
const bob = mkUser( 'bob' );
const mod = mkUser( 'mod', [ 'indiegame.moderate' ] );

let env : ReturnType<typeof createDb>;

const report = ( user : ReturnType<typeof mkUser> | null, id_game : string, reason = 'spam' ) => indiegame_report( mkCtx( env.db, user ), { id_game, reason } as any );
const hide = ( user : ReturnType<typeof mkUser>, id : string, hidden : boolean | null, kv? : unknown ) =>
	indiegame_admin_hide( mkCtx( env.db, user, kv ? { KV: kv } : {} ), { id, hidden } as any );

beforeAll( () => registerStubs() );

beforeEach( () => {
	env = createDb();
	insertGame( env.sqlite, { id: 'g1', id_user: 'alice', name: 'Alpha' } );
	vi.useFakeTimers( { toFake: [ 'Date' ] } );
	vi.setSystemTime( new Date( '2026-11-13T12:00:00Z' ) );
} );

afterEach( () => vi.useRealTimers() );

describe('indiegame_report', () => {
	it('requires login and a visible game', async () => {
		insertGame( env.sqlite, { id: 'h', status: 'hidden' } );
		insertGame( env.sqlite, { id: 'd', status: 'deleted' } );

		expect( ( await report( null, 'g1' ) ).status ).toBe( 401 );
		expect( ( await report( bob, 'ghost' ) ).status ).toBe( 404 );
		expect( ( await report( bob, 'h' ) ).status ).toBe( 404 );
		expect( ( await report( bob, 'd' ) ).status ).toBe( 404 );
	});

	it('needs a reason and caps its length', async () => {
		expect( ( await report( bob, 'g1', '   ' ) ).status ).toBe( 400 );
		expect( ( await report( bob, 'g1', 'x'.repeat( 2001 ) ) ).status ).toBe( 400 );
	});

	it('stores an open report of the caller', async () => {
		const res = await report( bob, 'g1', 'stolen art' );

		expect( res.data ).toMatchObject( { id_game: 'g1', id_reporter: 'bob', reason: 'stolen art', status: 'open' } );
	});

	it('a second open report by the same user on the same game is a conflict', async () => {
		await report( bob, 'g1' );

		expect( ( await report( bob, 'g1' ) ).status ).toBe( 409 );
		expect( ( await report( alice, 'g1' ) ).ok ).toBe( true );
	});

	it('the same user can report again after the report was closed', async () => {
		const id = ( await report( bob, 'g1' ) ).data!.id;
		await indiegame_admin_report_close( mkCtx( env.db, mod ), { id_report: id } as any );

		const second = await report( bob, 'g1' );

		expect( second.ok ).toBe( true );
		expect( env.sqlite.prepare( 'SELECT status FROM indiegame_reports ORDER BY rowid' ).all() ).toEqual( [ { status: 'closed' }, { status: 'open' } ] );
	});
});

describe('moderator endpoints', () => {
	it('a non moderator gets 403 on every admin endpoint', async () => {
		const id = ( await report( bob, 'g1' ) ).data!.id;

		expect( ( await indiegame_admin_reports( mkCtx( env.db, alice ), {} as any ) ).status ).toBe( 403 );
		expect( ( await hide( alice, 'g1', true ) ).status ).toBe( 403 );
		expect( ( await indiegame_admin_report_close( mkCtx( env.db, alice ), { id_report: id } as any ) ).status ).toBe( 403 );
		expect( ( await indiegame_admin_reports( mkCtx( env.db, null ), {} as any ) ).status ).toBe( 401 );
	});

	it('the system admin wildcard counts as a moderator', async () => {
		const admin = mkUser( 'root', [ 'system.admin' ] );
		await report( bob, 'g1' );

		expect( ( await indiegame_admin_reports( mkCtx( env.db, admin ), {} as any ) ).data!.reports ).toHaveLength( 1 );
		expect( ( await hide( admin, 'g1', true ) ).data!.status ).toBe( 'hidden' );
	});

	it('hidden game disappears from list, get, rankings and track', async () => {
		insertEvent( env.sqlite, { id: 'e1', id_game: 'g1', day: '2026-11-13' } );
		const env2 = { VISITOR_SALT: 'salt-salt-salt-salt-salt-salt-12' };

		expect( ( await hide( mod, 'g1', true ) ).data!.status ).toBe( 'hidden' );

		expect( ( await indiegame_list( mkCtx( env.db, null ), { page: 1, limit: 20 } as any ) ).data ?? [] ).toEqual( [] );
		expect( ( await indiegame_get( mkCtx( env.db, null ), { id: 'g1' } as any ) ).status ).toBe( 404 );
		expect( ( await indiegame_ranking_games( mkCtx( env.db, null ), { kind: 'views', window: 'all', limit: 20 } as any ) ).data ?? [] ).toEqual( [] );
		expect( ( await indiegame_track( mkCtx( env.db, null, env2 ), { id_game: 'g1', kind: 'view' } as any ) ).status ).toBe( 404 );
	});

	it('unhide restores the game', async () => {
		await hide( mod, 'g1', true );

		expect( ( await hide( mod, 'g1', false ) ).data!.status ).toBe( 'visible' );
		expect( ( await indiegame_get( mkCtx( env.db, null ), { id: 'g1' } as any ) ).ok ).toBe( true );
	});

	it('hide rejects unknown and deleted games and a missing flag', async () => {
		insertGame( env.sqlite, { id: 'd', status: 'deleted' } );

		expect( ( await hide( mod, 'ghost', true ) ).status ).toBe( 404 );
		expect( ( await hide( mod, 'd', false ) ).status ).toBe( 404 );
		expect( ( await hide( mod, 'g1', null ) ).status ).toBe( 400 );
	});

	it('hiding purges the cached rankings so the game leaves them at once', async () => {
		const kv = createKv();
		insertEvent( env.sqlite, { id: 'e1', id_game: 'g1', day: '2026-11-13' } );
		const ranking = () => indiegame_ranking_games( mkCtx( env.db, null, { KV: kv } ), { kind: 'views', window: 'all', limit: 20 } as any );

		expect( ( await ranking() ).data ).toHaveLength( 1 );
		await hide( mod, 'g1', true, kv );

		expect( ( await ranking() ).data ?? [] ).toEqual( [] );
	});

	it('admin reports lists open reports, pending and contested remixes, and hidden games, oldest first', async () => {
		insertGame( env.sqlite, { id: 'g2', id_user: 'bob', name: 'Beta' } );
		const first = ( await report( bob, 'g1', 'first' ) ).data!.id;
		vi.setSystemTime( new Date( '2026-11-13T13:00:00Z' ) );
		await report( alice, 'g2', 'second' );
		const closed = ( await report( mkUser( 'carol' ), 'g1', 'closed one' ) ).data!.id;
		await indiegame_admin_report_close( mkCtx( env.db, mod ), { id_report: closed } as any );
		insertGame( env.sqlite, { id: 'gh', id_user: 'bob', name: 'Hidden one', status: 'hidden' } );
		env.sqlite.prepare(
			"INSERT INTO indiegame_remix_reports (id, domain, id_game, id_original, id_reporter, id_owner, status) VALUES ('rr1','acme','g2','g1','alice','bob','contested'), ('rr2','acme','g2','g1','alice','bob','pending')",
		).run();

		const res = await indiegame_admin_reports( mkCtx( env.db, mod ), {} as any );

		expect( res.data!.reports.map( ( r ) => r.reason ) ).toEqual( [ 'first', 'second' ] );
		expect( res.data!.reports[0].id ).toBe( first );
		expect( res.data!.remix_reports.map( ( r ) => r.id ) ).toEqual( [ 'rr1', 'rr2' ] );
		expect( res.data!.hidden_games ).toEqual( [ expect.objectContaining( { id: 'gh', status: 'hidden' } ) ] );
	});

	it('close marks the report closed, twice is fine, unknown is a 404', async () => {
		const id = ( await report( bob, 'g1' ) ).data!.id;

		const res = await indiegame_admin_report_close( mkCtx( env.db, mod ), { id_report: id } as any );
		const again = await indiegame_admin_report_close( mkCtx( env.db, mod ), { id_report: id } as any );

		expect( res.data!.status ).toBe( 'closed' );
		expect( again.ok ).toBe( true );
		expect( ( await indiegame_admin_report_close( mkCtx( env.db, mod ), { id_report: 'ghost' } as any ) ).status ).toBe( 404 );
	});
});
