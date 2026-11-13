import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type LiWECtx, liwe_event_call } from '@backend/liwe3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listeners_init } from '../src/listeners';
import { createSqliteDb } from './sqlite-db';

const DDL = readFileSync( join( __dirname, '..', 'sql', 'comment.sql' ), 'utf8' );

type TestDb = ReturnType<typeof createSqliteDb>;

const makeCtx = ( db : TestDb, id : string, perms : string[] = [] ) : LiWECtx => ( {
	app: { db } as any,
	c: null,
	sessionId: null,
	session: async () => null,
	user: async () => ( { id, domain: 'dom-a', username: id, email: `${id}@example.com`, name: id, lastname: id, perms } as any ),
} );

describe('comment.call.list / add / del', () => {
	let db : TestDb;
	let ctx : LiWECtx;

	beforeAll( () => {
		listeners_init( {} as any );
	} );

	beforeEach( () => {
		db = createSqliteDb( DDL );
		ctx = makeCtx( db, 'u1' );
	} );

	it('answers a generic 500 when a method throws, without the thrown text', async () => {
		const errSpy = vi.spyOn( console, 'error' ).mockImplementation( () => {} );
		const boom = {
			...ctx,
			app: {
				db: new Proxy( {}, {
					get: () => {
						throw new Error( 'secret internal detail' );
					},
				} ),
			} as any,
		} as LiWECtx;
		const res = await liwe_event_call<any>( boom, 'comment', 'list', { module: 'kanban', id_obj: 'card1' } );
		errSpy.mockRestore();
		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 500 );
		expect( res.message ).toBe( 'Comment call failed' );
		expect( JSON.stringify( res ) ).not.toContain( 'secret internal detail' );
	});

	it('adds, lists and deletes a comment through the call events', async () => {
		const added = await liwe_event_call<any>( ctx, 'comment', 'add', { module: 'kanban', id_obj: 'card1', comment: 'hello' } );
		expect( added.ok ).toBe( true );

		const listed = await liwe_event_call<any[]>( ctx, 'comment', 'list', { module: 'kanban', id_obj: 'card1' } );
		expect( listed.ok ).toBe( true );
		expect( listed.data ).toHaveLength( 1 );
		expect( listed.data![0].comment ).toBe( 'hello' );

		const del = await liwe_event_call( ctx, 'comment', 'del', { id: listed.data![0].id } );
		expect( del.ok ).toBe( true );

		const after = await liwe_event_call<any[]>( ctx, 'comment', 'list', { module: 'kanban', id_obj: 'card1' } );
		expect( after.data ).toHaveLength( 0 );
	});

	it('returns the method error for an invalid payload', async () => {
		const res = await liwe_event_call( ctx, 'comment', 'add', {} );
		expect( res.ok ).toBe( false );
	});
});
