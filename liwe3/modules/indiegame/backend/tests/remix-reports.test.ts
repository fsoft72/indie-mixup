import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { indiegame_admin_remix_decide } from '../src/methods/indiegame-admin-remix-decide';
import { indiegame_remix_answer } from '../src/methods/indiegame-remix-answer';
import { indiegame_remix_inbox } from '../src/methods/indiegame-remix-inbox';
import { indiegame_remix_report } from '../src/methods/indiegame-remix-report';
import { createDb, insertGame, mkCtx, mkUser, registerStubs, stubs } from './helpers';

const alice = mkUser( 'alice' );
const bob = mkUser( 'bob' );
const carol = mkUser( 'carol' );
const mod = mkUser( 'mod', [ 'indiegame.moderate' ] );

let env : ReturnType<typeof createDb>;

const report = ( user : ReturnType<typeof mkUser>, id_game : string, id_original : string ) => indiegame_remix_report( mkCtx( env.db, user ), { id_game, id_original } as any );
const answer = ( user : ReturnType<typeof mkUser>, id_report : string, accept : boolean ) => indiegame_remix_answer( mkCtx( env.db, user ), { id_report, accept } as any );
const decide = ( user : ReturnType<typeof mkUser>, id_report : string, confirm : boolean ) => indiegame_admin_remix_decide( mkCtx( env.db, user ), { id_report, confirm } as any );
const gameRow = ( id : string ) =>
	env.sqlite.prepare( 'SELECT id_remix_of, remix_locked FROM indiegame_games WHERE id = ?' ).get( id ) as { id_remix_of : string | null; remix_locked : number };

beforeAll( () => registerStubs() );

beforeEach( () => {
	env = createDb();
	stubs.notifications = [];
	// alice published "orig" first, bob published "copy" later
	insertGame( env.sqlite, { id: 'orig', id_user: 'alice', created: '2026-01-01 10:00:00' } );
	insertGame( env.sqlite, { id: 'copy', id_user: 'bob', created: '2026-03-01 10:00:00' } );
} );

describe('indiegame_remix_report', () => {
	it('creates a pending report and notifies the owner of the reported game', async () => {
		const res = await report( alice, 'copy', 'orig' );

		expect( res.ok ).toBe( true );
		expect( res.data ).toMatchObject( { id_game: 'copy', id_original: 'orig', id_reporter: 'alice', id_owner: 'bob', status: 'pending' } );
		expect( stubs.notifications ).toHaveLength( 1 );
		expect( stubs.notifications[0] ).toMatchObject( { id_user: 'bob', domain: 'acme', event_type: 'indiegame.remix.reported' } );
	});

	it('rejects an original that is not mine', async () => {
		const res = await report( carol, 'copy', 'orig' );

		expect( res.status ).toBe( 403 );
		expect( res.error?.code ).toBe( 'NOT_YOUR_GAME' );
	});

	it('rejects an original published after the reported game, or at the same time', async () => {
		insertGame( env.sqlite, { id: 'late', id_user: 'alice', created: '2026-06-01 10:00:00' } );
		insertGame( env.sqlite, { id: 'same', id_user: 'alice', created: '2026-03-01 10:00:00' } );

		expect( ( await report( alice, 'copy', 'late' ) ).error?.code ).toBe( 'ORIGINAL_NOT_OLDER' );
		expect( ( await report( alice, 'copy', 'same' ) ).error?.code ).toBe( 'ORIGINAL_NOT_OLDER' );
	});

	it('rejects reporting my own game', async () => {
		insertGame( env.sqlite, { id: 'mine2', id_user: 'alice', created: '2026-04-01 10:00:00' } );

		const res = await report( alice, 'mine2', 'orig' );

		expect( res.status ).toBe( 400 );
		expect( res.error?.code ).toBe( 'OWN_GAME' );
	});

	it('rejects unknown, hidden and deleted games on either side', async () => {
		insertGame( env.sqlite, { id: 'hid', id_user: 'bob', status: 'hidden', created: '2026-03-01 10:00:00' } );
		insertGame( env.sqlite, { id: 'del', id_user: 'alice', status: 'deleted', created: '2026-01-01 10:00:00' } );

		expect( ( await report( alice, 'ghost', 'orig' ) ).status ).toBe( 404 );
		expect( ( await report( alice, 'hid', 'orig' ) ).status ).toBe( 404 );
		expect( ( await report( alice, 'copy', 'ghost' ) ).status ).toBe( 404 );
		expect( ( await report( alice, 'copy', 'del' ) ).status ).toBe( 404 );
	});

	it('rejects a game that already declares a remix', async () => {
		insertGame( env.sqlite, { id: 'other', id_user: 'carol', created: '2026-02-01 10:00:00' } );
		env.sqlite.prepare( "UPDATE indiegame_games SET id_remix_of = 'other' WHERE id = 'copy'" ).run();

		expect( ( await report( alice, 'copy', 'orig' ) ).error?.code ).toBe( 'ALREADY_REMIX' );
	});

	it('rejects a report that would create a cycle', async () => {
		env.sqlite.prepare( "UPDATE indiegame_games SET id_remix_of = 'copy' WHERE id = 'orig'" ).run();

		expect( ( await report( alice, 'copy', 'orig' ) ).error?.code ).toBe( 'REMIX_CYCLE' );
	});

	it('duplicate report for the same pair is a conflict', async () => {
		await report( alice, 'copy', 'orig' );

		expect( ( await report( alice, 'copy', 'orig' ) ).status ).toBe( 409 );
	});

	it('a rejected pair cannot be reopened', async () => {
		const id = ( await report( alice, 'copy', 'orig' ) ).data!.id;
		await answer( bob, id, false );
		await decide( mod, id, false );

		const again = await report( alice, 'copy', 'orig' );

		expect( again.status ).toBe( 409 );
		expect( again.error?.code ).toBe( 'REPORT_REJECTED' );
	});
});

describe('indiegame_remix_answer', () => {
	it('accept sets id_remix_of and locks it', async () => {
		const id = ( await report( alice, 'copy', 'orig' ) ).data!.id;

		const res = await answer( bob, id, true );

		expect( res.data!.status ).toBe( 'accepted' );
		expect( gameRow( 'copy' ) ).toEqual( { id_remix_of: 'orig', remix_locked: 1 } );
	});

	it('contest moves to contested and leaves the game untouched', async () => {
		const id = ( await report( alice, 'copy', 'orig' ) ).data!.id;

		const res = await answer( bob, id, false );

		expect( res.data!.status ).toBe( 'contested' );
		expect( gameRow( 'copy' ).id_remix_of ).toBeNull();
	});

	it('only the owner of the reported game can answer, and only while pending', async () => {
		const id = ( await report( alice, 'copy', 'orig' ) ).data!.id;

		expect( ( await answer( alice, id, true ) ).status ).toBe( 403 );
		expect( ( await answer( carol, id, true ) ).status ).toBe( 403 );
		expect( ( await answer( bob, 'ghost', true ) ).status ).toBe( 404 );

		await answer( bob, id, false );

		expect( ( await answer( bob, id, true ) ).status ).toBe( 409 );
	});

	it('a missing accept flag is a 400 and changes nothing', async () => {
		const id = ( await report( alice, 'copy', 'orig' ) ).data!.id;

		const res = await indiegame_remix_answer( mkCtx( env.db, bob ), { id_report: id, accept: null } as any );

		expect( res.status ).toBe( 400 );
		expect( ( await indiegame_remix_inbox( mkCtx( env.db, bob ), {} as any ) ).data![0].status ).toBe( 'pending' );
	});

	it('accept fails with 409 when the game became a remix of something else meanwhile', async () => {
		const id = ( await report( alice, 'copy', 'orig' ) ).data!.id;
		insertGame( env.sqlite, { id: 'other', id_user: 'carol', created: '2026-02-01 10:00:00' } );
		env.sqlite.prepare( "UPDATE indiegame_games SET id_remix_of = 'other' WHERE id = 'copy'" ).run();

		const res = await answer( bob, id, true );

		expect( res.status ).toBe( 409 );
		expect( gameRow( 'copy' ).id_remix_of ).toBe( 'other' );
	});
});

describe('indiegame_admin_remix_decide', () => {
	const contested = async () => {
		const id = ( await report( alice, 'copy', 'orig' ) ).data!.id;
		await answer( bob, id, false );

		return id;
	};

	it('confirm sets the link and locks it', async () => {
		const id = await contested();

		const res = await decide( mod, id, true );

		expect( res.data ).toMatchObject( { status: 'confirmed', decided_by: 'mod' } );
		expect( gameRow( 'copy' ) ).toEqual( { id_remix_of: 'orig', remix_locked: 1 } );
	});

	it('reject leaves the game untouched', async () => {
		const id = await contested();

		const res = await decide( mod, id, false );

		expect( res.data ).toMatchObject( { status: 'rejected', decided_by: 'mod' } );
		expect( gameRow( 'copy' ).id_remix_of ).toBeNull();
	});

	it('only a moderator can decide, and only a report that is still open', async () => {
		const id = await contested();

		expect( ( await decide( bob, id, true ) ).status ).toBe( 403 );
		expect( ( await decide( mod, 'ghost', true ) ).status ).toBe( 404 );
		expect( ( await decide( mod, id, true ) ).ok ).toBe( true );
		expect( ( await decide( mod, id, true ) ).status ).toBe( 409 );
	});

	it('a moderator can decide a pending report that the owner never answered', async () => {
		const id = ( await report( alice, 'copy', 'orig' ) ).data!.id;

		const res = await decide( mod, id, true );

		expect( res.data ).toMatchObject( { status: 'confirmed', decided_by: 'mod' } );
		expect( gameRow( 'copy' ) ).toEqual( { id_remix_of: 'orig', remix_locked: 1 } );
	});

	it('the owner cannot make a report undecidable by declaring another remix meanwhile', async () => {
		const id = await contested();
		insertGame( env.sqlite, { id: 'other', id_user: 'bob', created: '2026-02-01 10:00:00' } );
		env.sqlite.prepare( "UPDATE indiegame_games SET id_remix_of = 'other' WHERE id = 'copy'" ).run();

		const res = await decide( mod, id, true );

		expect( res.data!.status ).toBe( 'confirmed' );
		expect( gameRow( 'copy' ) ).toEqual( { id_remix_of: 'orig', remix_locked: 1 } );
	});
});

describe('indiegame_remix_inbox', () => {
	it('lists only the reports about my games, newest first', async () => {
		insertGame( env.sqlite, { id: 'copy2', id_user: 'bob', created: '2026-04-01 10:00:00' } );
		insertGame( env.sqlite, { id: 'carol-game', id_user: 'carol', created: '2026-05-01 10:00:00' } );
		await report( alice, 'copy', 'orig' );
		await report( alice, 'copy2', 'orig' );
		await report( alice, 'carol-game', 'orig' );

		const bobs = await indiegame_remix_inbox( mkCtx( env.db, bob ), {} as any );
		const nobody = await indiegame_remix_inbox( mkCtx( env.db, mkUser( 'dave' ) ), {} as any );

		expect( bobs.data!.map( ( r ) => r.id_game ).sort() ).toEqual( [ 'copy', 'copy2' ] );
		expect( nobody.data ?? [] ).toEqual( [] );
	});
});
