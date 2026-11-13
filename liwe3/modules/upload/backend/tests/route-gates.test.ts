import { beforeEach, describe, expect, it, vi } from 'vitest';

// The thumbnail queue loads WASM image codecs that only run in the Workers runtime
vi.mock( '../src/queue', () => ( { queue_init: vi.fn() } ) );

import { Hono } from 'hono';
import type { LiWEApp, LiWECtx, LiWEUser } from '@backend/liwe3';
import { module_init } from '../src/index';
import { liwe_event_call } from '@backend/liwe3';

/** A plain logged user of `dom-a`: no upload.* permission, no system.admin */
const PLAIN_USER = { id: 'user.plain', domain: 'dom-a', perms: [] } as unknown as LiWEUser;

/** Keys stored before each test: two files of dom-a, one of dom-b in a folder with the same name */
const KEYS = [ 'dom-a|kanban_c1/k1|a.png', 'dom-a|kanban_c1/k2|b.png', 'dom-b|kanban_c1/k3|c.png' ];

/** In-memory fake of the R2 bucket used by the upload methods */
const bucket_make = ( initial : string[] = KEYS ) => {
	const keys = new Set( initial );
	const bucket = {
		keys,
		list: vi.fn( async ( opts : { prefix? : string } ) => ( {
			objects: [ ...keys ].filter( ( k ) => k.startsWith( opts.prefix ?? '' ) ).map( ( key ) => ( { key, etag: 'e', size: 1, version: 'v', uploaded: new Date( 0 ) } ) ),
			truncated: false,
			cursor: undefined,
		} ) ),
		delete: vi.fn( async ( list : string[] ) => list.forEach( ( k ) => keys.delete( k ) ) ),
		get: vi.fn( async (
			key : string,
		) => ( keys.has( key ) ? { body: 'x', httpMetadata: { contentType: 'image/png' }, size: 1, httpEtag: 'e', writeHttpMetadata: () => {} } : null ) ),
		createMultipartUpload: vi.fn( async ( key : string ) => ( { uploadId: 'up.1', key } ) ),
		resumeMultipartUpload: vi.fn( ( key : string ) => ( {
			uploadPart: async ( partNumber : number ) => ( { partNumber, etag: 'p' } ),
			complete: async () => {
				keys.add( key );
				return { key, size: 1, etag: 'e' };
			},
			abort: async () => undefined,
		} ) ),
	};

	return bucket;
};

type FakeBucket = ReturnType<typeof bucket_make>;

/**
 * Mounts the real upload routes (module_init) with a request ctx resolving the given user.
 *
 * @param user - The user of every request (null = no session)
 * @param bucket - The fake bucket
 * @param with_thumbs - Bind THUMBNAIL_BUCKET too (false = the binding is absent, as in app/backend)
 * @returns The Hono app
 */
const app_for = async ( user : LiWEUser | null, bucket : FakeBucket, with_thumbs = true ) : Promise<Hono> => {
	const hono = new Hono();
	const env = with_thumbs ? { UPLOAD_BUCKET: bucket, THUMBNAIL_BUCKET: bucket } : { UPLOAD_BUCKET: bucket };
	const app = { hono, env, cfg: { system: { domain: 'dom-a' } } } as unknown as LiWEApp;

	hono.use( '/api/*', async ( c, next ) => {
		const ctx : LiWECtx = { app, c, sessionId: user ? 'sess' : null, session: async () => null, user: async () => user };
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

describe('upload route gates (Phase 1: every logged user can upload and delete in their domain)', () => {
	let bucket : FakeBucket;
	let hono : Hono;

	beforeEach( async () => {
		bucket = bucket_make();
		hono = await app_for( PLAIN_USER, bucket );
	} );

	it('a plain logged user can initiate, send a part, complete, list, get and delete in their own domain', async () => {
		const init = await send( hono, 'POST', '/api/upload/initiate', { fileName: 'new.png', fileType: 'image/png', folder: 'kanban/c1' } );
		expect( init.status ).toBe( 200 );
		const { data } = ( await init.json() ) as { data : { key : string; uploadId : string } };
		expect( data.key.startsWith( 'dom-a|kanban_c1/' ) ).toBe( true );

		const part = await hono.request( '/api/upload/part', {
			method: 'POST',
			headers: { 'X-Upload-Id': data.uploadId, 'X-Key': data.key, 'X-Part-Number': '1' },
			body: new Uint8Array( [ 1, 2, 3 ] ),
		} );
		expect( part.status ).toBe( 200 );

		const done = await send( hono, 'POST', '/api/upload/complete', { uploadId: data.uploadId, key: data.key, parts: [ { partNumber: 1, etag: 'p' } ] } );
		expect( done.status ).toBe( 200 );

		const list = await hono.request( '/api/upload/list?folder=kanban/c1' );
		const listed = ( await list.json() ) as { data : { objects : { key : string }[] } };
		expect( listed.data.objects.map( ( o ) => o.key ) ).toEqual( [ 'dom-a|kanban_c1/k1|a.png', 'dom-a|kanban_c1/k2|b.png', data.key ] );

		const get = await hono.request( `/api/upload/get?key=${encodeURIComponent( data.key )}` );
		expect( get.status ).toBe( 200 );

		const del = await send( hono, 'DELETE', '/api/upload/del', { pattern: data.key } );
		expect( del.status ).toBe( 200 );
		expect( bucket.keys.has( data.key ) ).toBe( false );
		expect( bucket.keys.has( 'dom-a|kanban_c1/k1|a.png' ) ).toBe( true );
	});

	it('delete of a folder removes only the files of the caller domain', async () => {
		const del = await send( hono, 'DELETE', '/api/upload/del', { pattern: 'kanban/c1' } );

		expect( del.status ).toBe( 200 );
		expect( [ ...bucket.keys ] ).toEqual( [ 'dom-b|kanban_c1/k3|c.png' ] );
	});

	it('delete cannot reach a key or a folder of another domain', async () => {
		const by_key = await send( hono, 'DELETE', '/api/upload/del', { pattern: 'dom-b|kanban_c1/k3|c.png' } );
		const by_folder = await send( hono, 'DELETE', '/api/upload/del', { pattern: 'dom-b|kanban_c1*' } );

		expect( by_key.status ).toBe( 403 );
		expect( by_folder.status ).toBe( 403 );
		expect( bucket.delete ).not.toHaveBeenCalled();
		expect( bucket.keys.has( 'dom-b|kanban_c1/k3|c.png' ) ).toBe( true );
	});

	it('delete refuses an empty pattern (it would remove every file of the domain)', async () => {
		expect( ( await send( hono, 'DELETE', '/api/upload/del', { pattern: '*' } ) ).status ).toBe( 400 );
		expect( ( await send( hono, 'DELETE', '/api/upload/del', { pattern: '' } ) ).status ).toBe( 400 );
		expect( bucket.delete ).not.toHaveBeenCalled();
	});

	it('delete refuses a pattern that would match the whole domain or a bare prefix of folder names', async () => {
		// Folders u_files, uploads and kanban_c10 exist: a bare prefix ("u", "k") must not reach them
		bucket = bucket_make( [ ...KEYS, 'dom-a|u_files/k4|d.png', 'dom-a|uploads/k5|e.png', 'dom-a|kanban_c10/k6|f.png' ] );
		hono = await app_for( PLAIN_USER, bucket );
		const before = [ ...bucket.keys ];

		for ( const pattern of [ 'dom-a|', 'dom-a|*', 'dom-a|/', 'u', 'k', '', '/', '///', '*', 'u*' ] ) {
			const res = await send( hono, 'DELETE', '/api/upload/del', { pattern } );
			expect( res.status, `pattern "${pattern}"` ).toBe( 400 );
		}

		expect( bucket.delete ).not.toHaveBeenCalled();
		expect( [ ...bucket.keys ] ).toEqual( before );
	});

	it('delete of a folder matches the complete folder name only, a full key deletes that file only', async () => {
		bucket = bucket_make( [ ...KEYS, 'dom-a|kanban_c10/k6|f.png' ] );
		hono = await app_for( PLAIN_USER, bucket );

		expect( ( await send( hono, 'DELETE', '/api/upload/del', { pattern: 'dom-a|kanban_c1/k1|a.png' } ) ).status ).toBe( 200 );
		expect( [ ...bucket.keys ] ).toEqual( [ 'dom-a|kanban_c1/k2|b.png', 'dom-b|kanban_c1/k3|c.png', 'dom-a|kanban_c10/k6|f.png' ] );

		expect( ( await send( hono, 'DELETE', '/api/upload/del', { pattern: 'kanban/c1' } ) ).status ).toBe( 200 );
		// kanban_c10 shares the textual prefix but is another folder
		expect( [ ...bucket.keys ] ).toEqual( [ 'dom-b|kanban_c1/k3|c.png', 'dom-a|kanban_c10/k6|f.png' ] );

		expect( ( await send( hono, 'DELETE', '/api/upload/del', { pattern: 'dom-a|kanban_c10' } ) ).status ).toBe( 200 );
		expect( [ ...bucket.keys ] ).toEqual( [ 'dom-b|kanban_c1/k3|c.png' ] );
	});

	it('initiate, list, part, complete and abort cannot target another domain', async () => {
		expect( ( await send( hono, 'POST', '/api/upload/initiate', { fileName: 'x.png', fileType: 'image/png', folder: 'dom-b|kanban_c1' } ) ).status ).toBe( 403 );
		expect( ( await hono.request( `/api/upload/list?folder=${encodeURIComponent( 'dom-b|kanban_c1' )}` ) ).status ).toBe( 403 );
		const part = await hono.request( '/api/upload/part', {
			method: 'POST',
			headers: { 'X-Upload-Id': 'up.1', 'X-Key': 'dom-b|kanban_c1/k9|x.png', 'X-Part-Number': '1' },
			body: new Uint8Array( [ 1 ] ),
		} );
		expect( part.status ).toBe( 403 );
		expect( ( await send( hono, 'POST', '/api/upload/complete', { uploadId: 'up.1', key: 'dom-b|kanban_c1/k9|x.png', parts: [] } ) ).status ).toBe( 403 );
		expect( ( await send( hono, 'POST', '/api/upload/abort', { uploadId: 'up.1', key: 'dom-b|kanban_c1/k9|x.png' } ) ).status ).toBe( 403 );
		expect( bucket.createMultipartUpload ).not.toHaveBeenCalled();
		expect( bucket.resumeMultipartUpload ).not.toHaveBeenCalled();
	});

	it('an anonymous caller cannot upload or delete', async () => {
		const anon = await app_for( null, bucket );

		expect( ( await send( anon, 'POST', '/api/upload/initiate', { fileName: 'x.png', fileType: 'image/png' } ) ).status ).toBe( 401 );
		expect( ( await send( anon, 'POST', '/api/upload/complete', { uploadId: 'u', key: 'k', parts: [] } ) ).status ).toBe( 401 );
		expect( ( await send( anon, 'POST', '/api/upload/abort', { uploadId: 'u', key: 'k' } ) ).status ).toBe( 401 );
		expect( ( await send( anon, 'DELETE', '/api/upload/del', { pattern: 'kanban/c1' } ) ).status ).toBe( 401 );
		expect( bucket.delete ).not.toHaveBeenCalled();
	});

	it('delete succeeds when the THUMBNAIL_BUCKET binding is absent', async () => {
		hono = await app_for( PLAIN_USER, bucket, false );

		const del = await send( hono, 'DELETE', '/api/upload/del', { pattern: 'dom-a|kanban_c1/k1|a.png' } );

		expect( del.status ).toBe( 200 );
		// The envelope carries the real outcome: a TypeError on the missing binding came back as ok:false
		expect( await del.json() ).toMatchObject( { ok: true, data: true } );
		expect( bucket.keys.has( 'dom-a|kanban_c1/k1|a.png' ) ).toBe( false );
	});

	it('delete also removes the thumbnails when the THUMBNAIL_BUCKET binding exists', async () => {
		await send( hono, 'DELETE', '/api/upload/del', { pattern: 'dom-a|kanban_c1/k1|a.png' } );

		expect( bucket.delete ).toHaveBeenCalledTimes( 2 );
		expect( bucket.delete ).toHaveBeenLastCalledWith( [ 'dom-a|thumbnails/kanban_c1/k1|a.png' ] );
	});

	it('a user with a null domain uploads under the "_" domain and can list and delete it', async () => {
		const nullUser = { id: 'user.null', domain: null, perms: [] } as unknown as LiWEUser;
		bucket = bucket_make( [] );
		hono = await app_for( nullUser, bucket );

		const init = await send( hono, 'POST', '/api/upload/initiate', { fileName: 'n.png', fileType: 'image/png', folder: 'kanban/c9' } );
		expect( init.status ).toBe( 200 );
		const { data } = ( await init.json() ) as { data : { key : string; uploadId : string } };
		expect( data.key.startsWith( '_|kanban_c9/' ) ).toBe( true );

		const part = await hono.request( '/api/upload/part', {
			method: 'POST',
			headers: { 'X-Upload-Id': data.uploadId, 'X-Key': data.key, 'X-Part-Number': '1' },
			body: new Uint8Array( [ 1 ] ),
		} );
		expect( part.status ).toBe( 200 );
		const done = await send( hono, 'POST', '/api/upload/complete', { uploadId: data.uploadId, key: data.key, parts: [ { partNumber: 1, etag: 'p' } ] } );
		expect( done.status ).toBe( 200 );

		// What the kanban card/get sees through the listener, with the '_' fallback
		const listed = await liwe_event_call<{ objects : { key : string }[] }>( { app: { env: { UPLOAD_BUCKET: bucket } } } as unknown as LiWECtx, 'upload', 'list', {
			domain: '_',
			folder: 'kanban/c9',
		} );
		expect( listed.data!.objects.map( ( o ) => o.key ) ).toEqual( [ data.key ] );
		const counted = await liwe_event_call<{ counts : Record<string, number> }>( { app: { env: { UPLOAD_BUCKET: bucket } } } as unknown as LiWECtx, 'upload', 'count', {
			domain: '_',
			folders: [ 'kanban/c9' ],
		} );
		expect( counted.data!.counts ).toEqual( { 'kanban/c9': 1 } );

		// keyInDomain: own "_|" keys pass, another domain is refused
		expect( ( await send( hono, 'POST', '/api/upload/abort', { uploadId: 'up.1', key: data.key } ) ).status ).toBe( 200 );
		expect( ( await send( hono, 'POST', '/api/upload/abort', { uploadId: 'up.1', key: 'dom-b|kanban_c9/k|x.png' } ) ).status ).toBe( 403 );
		expect( ( await send( hono, 'POST', '/api/upload/abort', { uploadId: 'up.1', key: '|kanban_c9/k|x.png' } ) ).status ).toBe( 403 );
	});
});
