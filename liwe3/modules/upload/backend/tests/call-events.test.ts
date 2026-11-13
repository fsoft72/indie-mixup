import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type LiWECtx, liwe_event_call } from '@backend/liwe3';
import { listeners_init } from '../src/listeners';

type FakeObject = { key : string; etag : string; size : number; version : string; uploaded : Date };

/** Builds a fake R2 object stored under a key. */
const obj = ( key : string ) : FakeObject => ( { key, etag: 'e', size: 10, version: 'v', uploaded: new Date( 0 ) } );

/**
 * Fake R2 bucket: serves `pageSize` objects per call, honouring prefix and cursor
 * (the cursor is the index of the next object).
 */
const makeBucket = ( keys : string[], pageSize : number ) => ( {
	list: vi.fn( async ( opts : { prefix? : string; cursor? : string; limit? : number } ) => {
		const all = keys.filter( ( k ) => k.startsWith( opts.prefix ?? '' ) );
		const start = opts.cursor ? Number( opts.cursor ) : 0;
		const slice = all.slice( start, start + pageSize );
		const truncated = start + pageSize < all.length;
		return { objects: slice.map( obj ), truncated, cursor: truncated ? String( start + pageSize ) : undefined };
	} ),
} );

const makeCtx = ( bucket : unknown ) : LiWECtx => ( {
	app: { env: { UPLOAD_BUCKET: bucket } } as any,
	c: null,
	sessionId: null,
	session: async () => null,
	user: async () => null,
} );

describe('upload call events', () => {
	beforeAll( () => {
		listeners_init( {} as any );
	} );

	beforeEach( () => {
		vi.clearAllMocks();
	} );

	it('upload.call.count returns one count per folder, paginating until not truncated, 0 for an empty folder', async () => {
		// folder "kanban/c1" is stored as "dom|kanban_c1/<ts>|<name>"
		const keys = [
			'dom|kanban_c1/a|a.png',
			'dom|kanban_c1/b|b.png',
			'dom|kanban_c1/c|c.png',
			'dom|kanban_c10/d|d.png', // sibling folder with the same textual prefix
			'other|kanban_c1/e|e.png', // other domain
		];
		const bucket = makeBucket( keys, 2 );

		const res = await liwe_event_call( makeCtx( bucket ), 'upload', 'count', { domain: 'dom', folders: [ 'kanban/c1', 'kanban/empty' ] } );

		expect( res.ok ).toBe( true );
		expect( res.data ).toEqual( { counts: { 'kanban/c1': 3, 'kanban/empty': 0 } } );
		// 2 pages for the first folder + 1 for the empty one
		expect( bucket.list ).toHaveBeenCalledTimes( 3 );
	});

	it('upload.call.count rejects an invalid payload with 400', async () => {
		const res = await liwe_event_call( makeCtx( makeBucket( [], 10 ) ), 'upload', 'count', { domain: 'dom' } );

		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 400 );
	});

	it('upload.call.list returns an UploadFileList with the files of the folder', async () => {
		const bucket = makeBucket( [ 'dom|kanban_c1/a|a.png', 'dom|kanban_c10/b|b.png' ], 10 );

		const res = await liwe_event_call<{ truncated : boolean; objects : { key : string }[] }>( makeCtx( bucket ), 'upload', 'list', { domain: 'dom', folder: 'kanban/c1' } );

		expect( res.ok ).toBe( true );
		expect( res.data!.truncated ).toBe( false );
		expect( res.data!.objects.map( ( o ) => o.key ) ).toEqual( [ 'dom|kanban_c1/a|a.png' ] );
		expect( Object.keys( res.data!.objects[0] ).sort() ).toEqual( [ 'etag', 'key', 'size', 'uploaded', 'version' ] );
	});

	it('upload.call.list rejects an invalid payload with 400', async () => {
		const res = await liwe_event_call( makeCtx( makeBucket( [], 10 ) ), 'upload', 'list', { folder: 'x' } );

		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 400 );
	});

	it('upload.call.del deletes one file or a whole folder of the caller domain, and refuses another domain', async () => {
		const keys = [ 'dom|kb_b1/a|a.pdf', 'dom|kb_b1/b|b.pdf', 'dom|kb_b10/c|c.pdf' ];
		const bucket = { ...makeBucket( keys, 10 ), delete: vi.fn( async ( _keys : string[] ) => undefined ) };
		const ctx = { ...makeCtx( bucket ), user: async () => ( { id: 'u1', domain: 'dom' } as any ) };

		const one = await liwe_event_call( ctx, 'upload', 'del', { pattern: 'dom|kb_b1/a|a.pdf' } );
		const folder = await liwe_event_call( ctx, 'upload', 'del', { pattern: 'dom|kb_b1' } );
		const foreign = await liwe_event_call( ctx, 'upload', 'del', { pattern: 'other|kb_b1/a|a.pdf' } );

		expect( one.ok ).toBe( true );
		expect( bucket.delete ).toHaveBeenNthCalledWith( 1, [ 'dom|kb_b1/a|a.pdf' ] );
		expect( folder.ok ).toBe( true );
		expect( bucket.delete ).toHaveBeenNthCalledWith( 2, [ 'dom|kb_b1/a|a.pdf', 'dom|kb_b1/b|b.pdf' ] );
		expect( foreign.status ).toBe( 403 );
	});
});
