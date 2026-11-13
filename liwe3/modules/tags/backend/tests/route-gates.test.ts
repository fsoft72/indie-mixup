import { beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import type { LiWEApp, LiWECtx, LiWEUser } from '@backend/liwe3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { module_init } from '../src/index';
import { createSqliteDb } from './sqlite-db';

const DDL = readFileSync( join( __dirname, '..', 'sql', 'tags.sql' ), 'utf8' );

/** A plain logged user: no tags.* permission, no system.admin */
const PLAIN_USER = { id: 'user.plain', domain: 'dom-a', perms: [ 'user' ] } as unknown as LiWEUser;

/**
 * Mounts the real tags routes (module_init) on a Hono app whose request ctx resolves the given user.
 *
 * @param user - The user of every request (null = no session)
 * @returns The Hono app
 */
const appFor = async ( user : LiWEUser | null ) : Promise<Hono> => {
	const db = createSqliteDb( DDL );
	const hono = new Hono();
	const app = { hono, db, env: {} } as unknown as LiWEApp;
	const ctx : LiWECtx = { app, c: null, sessionId: user ? 'sess' : null, session: async () => null, user: async () => user };

	hono.use( '/api/*', async ( c, next ) => {
		c.set( 'ctx' as never, ctx as never );
		await next();
	} );
	await module_init( app );

	return hono;
};

/**
 * Sends a JSON request.
 *
 * @param hono - The app
 * @param method - HTTP method
 * @param url - The URL
 * @param body - The JSON body
 * @returns The response
 */
const send = ( hono : Hono, method : string, url : string, body : Record<string, unknown> ) =>
	hono.request( url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify( body ) } );

describe('tags route gates (Phase 1: every logged user can tag)', () => {
	let hono : Hono;

	beforeEach( async () => {
		hono = await appFor( PLAIN_USER );
	} );

	it('a plain logged user can create a tag, tag an object and untag it', async () => {
		const add = await send( hono, 'POST', '/api/tags/tag/add', { name: 'Urgent', slug: 'urgent' } );
		expect( add.status ).toBe( 200 );

		const tag = await send( hono, 'POST', '/api/tags/obj/add', { tag_slug: 'urgent', module: 'kanban', id_object: 'card.1' } );
		expect( tag.status ).toBe( 200 );

		const list = await hono.request( '/api/tags/obj/list?module=kanban&id_object=card.1' );
		const listed = ( await list.json() ) as { data : { tags : { tagSlug : string }[] } };
		expect( listed.data.tags.map( ( t ) => t.tagSlug ) ).toEqual( [ 'urgent' ] );

		const del = await send( hono, 'DELETE', '/api/tags/obj/del', { tag_slug: 'urgent', module: 'kanban', id_object: 'card.1' } );
		expect( del.status ).toBe( 200 );

		const after = ( await ( await hono.request( '/api/tags/obj/list?module=kanban&id_object=card.1' ) ).json() ) as { data : { tags : unknown[] } };
		expect( after.data.tags ).toEqual( [] );
	});

	it('a plain logged user cannot call the admin endpoints (merge, bulk, relevance)', async () => {
		expect( ( await send( hono, 'PATCH', '/api/tags/merge', { source_tag_slug: 'a', target_tag_slug: 'b' } ) ).status ).toBe( 403 );
		expect( ( await send( hono, 'POST', '/api/tags/bulk/add', {} ) ).status ).toBe( 403 );
		expect( ( await send( hono, 'DELETE', '/api/tags/bulk/del', {} ) ).status ).toBe( 403 );
		expect( ( await send( hono, 'PATCH', '/api/tags/relevance/update', {} ) ).status ).toBe( 403 );
	});

	it('an anonymous caller cannot tag or untag', async () => {
		const anon = await appFor( null );

		expect( ( await send( anon, 'POST', '/api/tags/tag/add', { name: 'X' } ) ).status ).toBe( 401 );
		expect( ( await send( anon, 'POST', '/api/tags/obj/add', { tag_slug: 'x', module: 'kanban', id_object: 'c' } ) ).status ).toBe( 401 );
		expect( ( await send( anon, 'DELETE', '/api/tags/obj/del', { tag_slug: 'x', module: 'kanban', id_object: 'c' } ) ).status ).toBe( 401 );
	});
});
