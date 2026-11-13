import { describe, expect, it } from 'vitest';
import type { LiWECtx } from '@backend/liwe3';
import { upload_get } from '../src/methods';

/**
 * Builds a request ctx whose bucket holds one object with the given stored content type.
 *
 * @param key - The object key
 * @param content_type - The stored content type (undefined: none)
 * @param thumb - Also store a thumbnail of the object
 */
const ctx_for = ( key : string, content_type : string | undefined, thumb = false ) : LiWECtx => {
	const object = ( k : string ) => ( {
		key: k,
		body: 'BODY',
		httpEtag: '"e"',
		writeHttpMetadata: ( h : Headers ) => {
			if ( content_type ) h.set( 'content-type', content_type );
		},
	} );
	const bucket = {
		get: async ( k : string ) => {
			if ( k === key ) return object( k );
			if ( thumb && k.includes( '|thumbnails/' ) ) return object( k );
			return null;
		},
	};

	return {
		app: { env: { UPLOAD_BUCKET: bucket, THUMBNAIL_BUCKET: bucket }, cfg: { system: { domain: 'dom-a' } } } as never,
		c: null,
		sessionId: null,
		session: async () => null,
		user: async () => null,
	};
};

/**
 * Serves a key and returns the headers of the raw response.
 *
 * @param key - The key
 * @param content_type - The stored content type
 * @param variant - The variant
 */
const served = async ( key : string, content_type : string | undefined, variant? : string ) : Promise<Headers> => {
	const res = await upload_get( ctx_for( key, content_type, variant === 'thumb' ), variant ? { key, variant } : { key } );
	expect( res.response ).toBeDefined();

	return res.response!.headers;
};

describe('upload get: safe serving headers', () => {
	it('an html upload is served as an attachment, sandboxed, nosniff', async () => {
		const h = await served( 'dom-a|kanban_c1/t|evil.html', 'text/html' );

		expect( h.get( 'content-disposition' ) ).toBe( 'attachment; filename="evil.html"' );
		expect( h.get( 'x-content-type-options' ) ).toBe( 'nosniff' );
		expect( h.get( 'content-security-policy' ) ).toBe( "sandbox; default-src 'none'" );
	});

	it('an svg upload is always an attachment, even if stored as an image', async () => {
		const h = await served( 'dom-a|kanban_c1/t|logo.svg', 'image/svg+xml' );

		expect( h.get( 'content-disposition' ) ).toMatch( /^attachment;/ );
		expect( h.get( 'x-content-type-options' ) ).toBe( 'nosniff' );
	});

	it('xml and javascript types are forced to attachment', async () => {
		for (
			const type of [ 'application/xhtml+xml', 'text/xml', 'application/xml', 'application/javascript', 'text/javascript', 'application/rss+xml', 'TEXT/HTML; charset=utf-8' ]
		) {
			const h = await served( 'dom-a|kanban_c1/t|x.bin', type );
			expect( h.get( 'content-disposition' ), type ).toMatch( /^attachment;/ );
		}
	});

	it('a png is served inline with nosniff and the sandbox policy', async () => {
		const h = await served( 'dom-a|kanban_c1/t|photo.png', 'image/png' );

		expect( h.get( 'content-type' ) ).toBe( 'image/png' );
		expect( h.get( 'content-disposition' ) ).toBe( 'inline; filename="photo.png"' );
		expect( h.get( 'x-content-type-options' ) ).toBe( 'nosniff' );
		expect( h.get( 'content-security-policy' ) ).toBe( "sandbox; default-src 'none'" );
	});

	it('a pdf is always downloaded (Chromium does not run its PDF viewer in a sandboxed document)', async () => {
		const h = await served( 'dom-a|kanban_c1/t|spec.pdf', 'application/pdf' );

		expect( h.get( 'content-disposition' ) ).toBe( 'attachment; filename="spec.pdf"' );
		expect( h.get( 'x-content-type-options' ) ).toBe( 'nosniff' );
		expect( h.get( 'content-security-policy' ) ).toBe( "sandbox; default-src 'none'" );
	});

	it('plain text, audio, video and images stay inline', async () => {
		for ( const type of [ 'text/plain', 'audio/mpeg', 'video/mp4', 'image/jpeg', 'image/webp' ] ) {
			const h = await served( 'dom-a|kanban_c1/t|f.bin', type );
			expect( h.get( 'content-disposition' ), type ).toMatch( /^inline;/ );
		}
	});

	it('a missing type is an attachment served as application/octet-stream', async () => {
		const h = await served( 'dom-a|kanban_c1/t|blob', undefined );

		expect( h.get( 'content-type' ) ).toBe( 'application/octet-stream' );
		expect( h.get( 'content-disposition' ) ).toBe( 'attachment; filename="blob"' );
	});

	it('the image thumbnail use case still serves png and jpeg inline', async () => {
		for ( const [ name, type ] of [ [ 'a.png', 'image/png' ], [ 'b.jpg', 'image/jpeg' ] ] ) {
			const h = await served( `dom-a|kanban_c1/t|${name}`, type, 'thumb' );
			expect( h.get( 'content-type' ) ).toBe( type );
			expect( h.get( 'content-disposition' ) ).toMatch( /^inline;/ );
		}
	});

	it('a file name with quotes or line breaks cannot break the header', async () => {
		const h = await served( 'dom-a|kanban_c1/t|a"b\r\nc.html', 'text/html' );

		expect( h.get( 'content-disposition' ) ).toBe( 'attachment; filename="a_b__c.html"' );
	});
});

describe('upload get: range requests', () => {
	/** Builds a ctx whose bucket honours the range option like R2 does. */
	const ranged_ctx = ( key : string, range_header : string | null ) : LiWECtx => {
		const bucket = {
			get: async ( k : string, opts? : { range? : Headers } ) => {
				if ( k !== key ) return null;
				const partial = !!opts?.range;
				return {
					key: k,
					size: 1000,
					body: 'BODY',
					httpEtag: '"e"',
					range: partial ? { offset: 100, length: 200 } : undefined,
					writeHttpMetadata: ( h : Headers ) => h.set( 'content-type', 'video/mp4' ),
				};
			},
		};
		const headers = new Headers( range_header ? { range: range_header } : {} );

		return {
			app: { env: { UPLOAD_BUCKET: bucket }, cfg: { system: { domain: 'dom-a' } } } as never,
			c: { req: { header: ( n : string ) => headers.get( n ) ?? undefined, raw: { headers } } } as never,
			sessionId: null,
			session: async () => null,
			user: async () => null,
		};
	};

	it('a range request is answered with 206 and a content-range', async () => {
		const key = 'dom-a|site|v.mp4';
		const res = await upload_get( ranged_ctx( key, 'bytes=100-299' ), { key } );

		expect( res.response!.status ).toBe( 206 );
		expect( res.response!.headers.get( 'content-range' ) ).toBe( 'bytes 100-299/1000' );
		expect( res.response!.headers.get( 'content-length' ) ).toBe( '200' );
		expect( res.response!.headers.get( 'accept-ranges' ) ).toBe( 'bytes' );
	});

	it('a plain request is a 200 that advertises range support', async () => {
		const key = 'dom-a|site|v.mp4';
		const res = await upload_get( ranged_ctx( key, null ), { key } );

		expect( res.response!.status ).toBe( 200 );
		expect( res.response!.headers.get( 'accept-ranges' ) ).toBe( 'bytes' );
	});
});
