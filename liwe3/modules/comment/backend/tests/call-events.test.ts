import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type LiWECtx, liwe_event_call } from '@backend/liwe3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listeners_init } from '../src/listeners';
import { comment_comments } from '../src/schema';
import { createSqliteDb } from './sqlite-db';

const DDL = readFileSync( join( __dirname, '..', 'sql', 'comment.sql' ), 'utf8' );

type TestDb = ReturnType<typeof createSqliteDb>;

const makeCtx = ( db : TestDb ) : LiWECtx => ( {
	app: { db } as any,
	c: null,
	sessionId: null,
	session: async () => null,
	user: async () => null,
} );

/** Inserts a comment row directly, bypassing the endpoint. */
const addComment = async ( db : TestDb, id : string, domain : string, module : string, id_obj : string ) => {
	await db.insert( comment_comments ).values( { id, id_user: 'u1', module, id_obj, comment: 'hello', domain } ).run();
};

describe('comment.call.count', () => {
	let db : TestDb;

	beforeAll( () => {
		listeners_init( {} as any );
	} );

	beforeEach( () => {
		db = createSqliteDb( DDL );
	} );

	it('comment.call.count returns counts per id with 0 for ids without comments', async () => {
		await addComment( db, 'c1', 'dom-a', 'kanban', 'card1' );
		await addComment( db, 'c2', 'dom-a', 'kanban', 'card1' );
		await addComment( db, 'c3', 'dom-a', 'kanban', 'card2' );

		const res = await liwe_event_call( makeCtx( db ), 'comment', 'count', { domain: 'dom-a', module: 'kanban', ids: [ 'card1', 'card2', 'card3' ] } );

		expect( res.ok ).toBe( true );
		expect( res.data ).toEqual( { counts: { card1: 2, card2: 1, card3: 0 } } );
	});

	it('comment.call.count ignores comments of another domain and another module', async () => {
		await addComment( db, 'c1', 'dom-a', 'kanban', 'card1' );
		await addComment( db, 'c2', 'dom-b', 'kanban', 'card1' );
		await addComment( db, 'c3', 'dom-a', 'blog', 'card1' );

		const res = await liwe_event_call( makeCtx( db ), 'comment', 'count', { domain: 'dom-a', module: 'kanban', ids: [ 'card1' ] } );

		expect( res.data ).toEqual( { counts: { card1: 1 } } );
	});

	it('comment.call.count handles more ids than one query chunk', async () => {
		const ids = Array.from( { length: 250 }, ( _v, i ) => `card${i}` );
		await addComment( db, 'c1', 'dom-a', 'kanban', 'card240' );

		const res = await liwe_event_call<{ counts : Record<string, number> }>( makeCtx( db ), 'comment', 'count', { domain: 'dom-a', module: 'kanban', ids } );

		expect( res.ok ).toBe( true );
		expect( Object.keys( res.data!.counts ) ).toHaveLength( 250 );
		expect( res.data!.counts.card240 ).toBe( 1 );
		expect( res.data!.counts.card0 ).toBe( 0 );
	});

	it('comment.call.count rejects an invalid payload with 400', async () => {
		const res = await liwe_event_call( makeCtx( db ), 'comment', 'count', { domain: 'dom-a' } );

		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 400 );
	});
});
