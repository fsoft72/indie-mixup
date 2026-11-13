import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type LiWECtx, liwe_event_call } from '@backend/liwe3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listeners_init } from '../src/listeners';
import { taggables, tags } from '../src/schema';
import { createSqliteDb } from './sqlite-db';

const DDL = readFileSync( join( __dirname, '..', 'sql', 'tags.sql' ), 'utf8' );

type TestDb = ReturnType<typeof createSqliteDb>;

const makeCtx = ( db : TestDb ) : LiWECtx => ( {
	app: { db } as any,
	c: null,
	sessionId: null,
	session: async () => null,
	user: async () => null,
} );

/** Inserts a tag and returns its id. */
const addTag = async ( db : TestDb, slug : string, is_active = true ) : Promise<number> => {
	await db.insert( tags ).values( { name: slug.toUpperCase(), slug, is_active } ).run();
	const rows = await db.select().from( tags );
	return rows.find( ( t ) => t.slug === slug )!.id;
};

/** Attaches a tag to an object. */
const attach = async ( db : TestDb, tag_id : number, module : string, id_object : string ) => {
	await db.insert( taggables ).values( { tag_id, module, id_object } ).run();
};

describe('tags call events', () => {
	let db : TestDb;

	beforeAll( () => {
		listeners_init( {} as any );
	} );

	beforeEach( () => {
		db = createSqliteDb( DDL );
	} );

	it('tags.call.list_by_objects returns active tags per id, [] for untagged ids, and omits inactive tags', async () => {
		const urgent = await addTag( db, 'urgent' );
		const old = await addTag( db, 'old', false );
		await attach( db, urgent, 'kanban', 'card1' );
		await attach( db, old, 'kanban', 'card1' );
		await attach( db, urgent, 'blog', 'card2' );

		const res = await liwe_event_call<{ tags : Record<string, { slug : string }[]> }>( makeCtx( db ), 'tags', 'list_by_objects', {
			module: 'kanban',
			ids: [ 'card1', 'card2' ],
		} );

		expect( res.ok ).toBe( true );
		expect( Object.keys( res.data!.tags ).sort() ).toEqual( [ 'card1', 'card2' ] );
		expect( res.data!.tags.card1.map( ( t ) => t.slug ) ).toEqual( [ 'urgent' ] );
		expect( res.data!.tags.card2 ).toEqual( [] );
	});

	it('tags.call.list_by_objects rejects an invalid payload with 400', async () => {
		const res = await liwe_event_call( makeCtx( db ), 'tags', 'list_by_objects', { module: 'kanban' } );

		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 400 );
	});

	it('tags.call.find_objects_by_tag returns the ids tagged with an active tag in that module', async () => {
		const urgent = await addTag( db, 'urgent' );
		await attach( db, urgent, 'kanban', 'card1' );
		await attach( db, urgent, 'kanban', 'card2' );
		await attach( db, urgent, 'blog', 'post1' );

		const res = await liwe_event_call<{ ids : string[] }>( makeCtx( db ), 'tags', 'find_objects_by_tag', { module: 'kanban', tag_slug: 'urgent' } );

		expect( res.ok ).toBe( true );
		expect( res.data!.ids.sort() ).toEqual( [ 'card1', 'card2' ] );
	});

	it('tags.call.find_objects_by_tag returns no ids for an inactive or unknown tag', async () => {
		const old = await addTag( db, 'old', false );
		await attach( db, old, 'kanban', 'card1' );

		const inactive = await liwe_event_call( makeCtx( db ), 'tags', 'find_objects_by_tag', { module: 'kanban', tag_slug: 'old' } );
		const unknown = await liwe_event_call( makeCtx( db ), 'tags', 'find_objects_by_tag', { module: 'kanban', tag_slug: 'nope' } );

		expect( inactive.data ).toEqual( { ids: [] } );
		expect( unknown.data ).toEqual( { ids: [] } );
	});

	it('tags.call.tag_add creates a tag and rejects a duplicate', async () => {
		const first = await liwe_event_call<{ tag : { slug : string } }>( makeCtx( db ), 'tags', 'tag_add', { name: 'Backend API', slug: 'backend-api' } );
		const again = await liwe_event_call( makeCtx( db ), 'tags', 'tag_add', { name: 'Backend API', slug: 'backend-api' } );

		expect( first.ok ).toBe( true );
		expect( first.data!.tag.slug ).toBe( 'backend-api' );
		// the status of a duplicate depends on the SQLite driver error code: only the failure is pinned
		expect( again.ok ).toBe( false );
	});

	it('tags.call.obj_add tags an object, tags.call.obj_del removes the tag', async () => {
		await addTag( db, 'urgent' );

		const added = await liwe_event_call( makeCtx( db ), 'tags', 'obj_add', { tag_slug: 'urgent', module: 'kb', id_object: 'node1' } );
		const listed = await liwe_event_call<{ tags : Record<string, { slug : string }[]> }>( makeCtx( db ), 'tags', 'list_by_objects', { module: 'kb', ids: [ 'node1' ] } );
		const removed = await liwe_event_call( makeCtx( db ), 'tags', 'obj_del', { tag_slug: 'urgent', module: 'kb', id_object: 'node1' } );
		const after = await liwe_event_call<{ tags : Record<string, { slug : string }[]> }>( makeCtx( db ), 'tags', 'list_by_objects', { module: 'kb', ids: [ 'node1' ] } );

		expect( added.ok ).toBe( true );
		expect( listed.data!.tags.node1.map( ( t ) => t.slug ) ).toEqual( [ 'urgent' ] );
		expect( removed.ok ).toBe( true );
		expect( after.data!.tags.node1 ).toEqual( [] );
	});

	it('tags.call.obj_add answers 404 for an unknown tag and 400 for an invalid payload', async () => {
		const unknown = await liwe_event_call( makeCtx( db ), 'tags', 'obj_add', { tag_slug: 'nope', module: 'kb', id_object: 'node1' } );
		const invalid = await liwe_event_call( makeCtx( db ), 'tags', 'obj_add', { module: 'kb' } );

		expect( unknown.status ).toBe( 404 );
		expect( invalid.status ).toBe( 400 );
	});
});
