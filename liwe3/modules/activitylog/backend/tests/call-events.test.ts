import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type LiWECtx, liwe_event_call } from '@backend/liwe3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listeners_init } from '../src/listeners';
import { createSqliteDb } from './sqlite-db';

const DDL = readFileSync( join( __dirname, '..', 'sql', 'activitylog.sql' ), 'utf8' );

type TestDb = ReturnType<typeof createSqliteDb>;

const makeCtx = ( db : TestDb ) : LiWECtx => ( {
	app: { db } as any,
	c: null,
	sessionId: null,
	session: async () => null,
	user: async () => null,
} );

/** Records an event through the call event, as the other modules do. */
const addEvent = ( db : TestDb, event : string, extra : Record<string, unknown> = {} ) =>
	liwe_event_call( makeCtx( db ), 'activitylog', 'event.add', { domain: 'dom-a', module: 'kanban', event, id_user: 'u1', id_obj: 'card1', ...extra } );

describe('activitylog.call.event.add / list', () => {
	let db : TestDb;

	beforeAll( () => {
		listeners_init( {} as any );
	} );

	beforeEach( () => {
		db = createSqliteDb( DDL );
	} );

	it('stores id_obj and a creation date', async () => {
		const added = await addEvent( db, 'kanban.card.create', { data: { id_board: 'b1' } } );
		expect( added.ok ).toBe( true );

		const res = await liwe_event_call<{ events : any[] }>( makeCtx( db ), 'activitylog', 'event.list', { domain: 'dom-a', module: 'kanban', id_obj: 'card1' } );

		expect( res.ok ).toBe( true );
		expect( res.data!.events ).toHaveLength( 1 );
		expect( res.data!.events[0].event ).toBe( 'kanban.card.create' );
		expect( res.data!.events[0].data ).toEqual( { id_board: 'b1' } );
		expect( res.data!.events[0].created ).toBeTruthy();
	});

	it('lists newest first by default, oldest first with sort asc', async () => {
		await addEvent( db, 'e1' );
		await addEvent( db, 'e2' );
		await addEvent( db, 'e3' );
		const payload = { domain: 'dom-a', module: 'kanban', id_obj: 'card1' };

		const desc = await liwe_event_call<{ events : any[] }>( makeCtx( db ), 'activitylog', 'event.list', payload );
		const asc = await liwe_event_call<{ events : any[] }>( makeCtx( db ), 'activitylog', 'event.list', { ...payload, sort: 'asc' } );

		expect( desc.data!.events.map( ( e ) => e.event ) ).toEqual( [ 'e3', 'e2', 'e1' ] );
		expect( asc.data!.events.map( ( e ) => e.event ) ).toEqual( [ 'e1', 'e2', 'e3' ] );
	});

	it('filters by domain, module and object', async () => {
		await addEvent( db, 'mine' );
		await addEvent( db, 'other-card', { id_obj: 'card2' } );
		await addEvent( db, 'other-domain', { domain: 'dom-b' } );
		await addEvent( db, 'other-module', { module: 'blog' } );
		await addEvent( db, 'no-object', { id_obj: undefined } );

		const res = await liwe_event_call<{ events : any[] }>( makeCtx( db ), 'activitylog', 'event.list', { domain: 'dom-a', module: 'kanban', id_obj: 'card1' } );

		expect( res.data!.events.map( ( e ) => e.event ) ).toEqual( [ 'mine' ] );
	});

	it('paginates with offset and limit', async () => {
		for ( const name of [ 'e1', 'e2', 'e3', 'e4' ] ) await addEvent( db, name );

		const res = await liwe_event_call<{ events : any[] }>( makeCtx( db ), 'activitylog', 'event.list', {
			domain: 'dom-a',
			module: 'kanban',
			id_obj: 'card1',
			offset: 1,
			limit: 2,
		} );

		expect( res.data!.events.map( ( e ) => e.event ) ).toEqual( [ 'e3', 'e2' ] );
	});

	it('rejects an invalid payload with 400', async () => {
		const res = await liwe_event_call( makeCtx( db ), 'activitylog', 'event.list', { domain: 'dom-a' } );

		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 400 );
	});
});
