/**
 * @fileoverview Common utilities for upload module methods
 */

// Core imports
export { LiWEApp, LiWEResponse, LiWESysParams, responseError, responseSuccess, zodBoolean } from '@backend/liwe3';
export type { LiWECtx } from '@backend/liwe3';

// Database operation imports
export { eq, and, ne, desc, asc, count, avg, sql, inArray, or, like, isNull } from 'drizzle-orm';

// Schema imports
// TODO: Import your schema tables here

// Zod for validation
export { z } from 'zod';

/*=== f2c_start utils ===*/
export type DomainName = {
	/** Domain name */
	domain : string;

	/** The final path (without filename) */
	path : string;

	/** File name with folder path */
	fullPath : string;

	/** Original filename */
	originalFileName : string;
};

const safeName = ( str : string ) => {
	return str.replace( /[\|\/]/g, '_' );
};

/** key is domain|folder/filename|filename */
export const keyExp = ( key : string ) : DomainName => {
	const parts = key.split( '|' );

	if ( parts.length == 3 ) {
		return {
			domain: parts[0],
			path: parts[1].substring( 0, parts[1].lastIndexOf( '/' ) ),
			fullPath: parts[1],
			originalFileName: parts[2],
		};
	}

	return {
		domain: '',
		path: '',
		fullPath: parts[0],
		originalFileName: '',
	};
};

export const keyBuild = ( domain : string, folder : string, fileName : string ) : string => {
	const timestamp = Date.now().toString( 36 );

	folder = keyFullFolder( domain, folder );

	return `${folder}/${timestamp}|${safeName( fileName )}`;
};

/** If this is a valid key (with  domain|fullPath|originalFilename)
 *  this function simple returns it as is
 */
export const keyRebuild = ( key : string ) => {
	if ( key.indexOf( '|' ) !== -1 ) return key;

	console.log( '=== INVALID KEY: ', key );
	return key;
};

export const keyFullFolder = ( domain : string, folder : string ) => {
	if ( folder.indexOf( '|' ) !== -1 ) return folder;
	if ( !folder || folder == '' ) folder = '';

	// remove '/' at the start of folder if present
	folder = folder.replace( /^\/+/, '' );
	// remove '/' at the end of folder if present
	folder = folder.replace( /\/+$/, '' );
	return `${domain}|${safeName( folder )}`;
};

/**
 * Tells whether a folder, pattern or key sent by a client stays inside the caller's domain.
 * A value without `|` is relative (the domain is added by keyFullFolder / keyBuild); a value with `|` is a full
 * key or folder and must start with `<domain>|`, otherwise it points into another domain.
 *
 * @param domain - the caller's domain
 * @param value - the folder, pattern or key
 * @returns true when the value cannot reach another domain
 */
export const keyInDomain = ( domain : string, value : string ) : boolean => {
	if ( value.indexOf( '|' ) === -1 ) return true;

	return value.startsWith( `${domain}|` );
};

/**
 * Content types a browser may render inline from the app origin (they cannot run scripts). PDF is not here: Chromium
 * does not run its PDF viewer in a CSP-sandboxed document, so PDFs are downloaded.
 */
const INLINE_TYPES = [ 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp', 'text/plain' ];

/** Content types that can run scripts in the page: always downloaded, whatever else the stored type says */
const ACTIVE_TYPE_RE = /html|svg|xml|javascript|ecmascript/;

/**
 * Makes a file name safe inside a quoted header value.
 *
 * @param name - the original file name
 * @returns the name with quotes, backslashes, control and non-ASCII characters replaced by `_`
 */
const _headerFileName = ( name : string ) : string => name.replace( /["\\]|[^\x20-\x7e]/g, '_' ) || 'file';

/**
 * Sets the headers that make a stored upload safe to serve from the app origin (every logged user can upload in
 * Phase 1, and the client chooses the content type): `nosniff`, a sandboxing CSP, and `Content-Disposition`
 * `inline` only for the INLINE_TYPES (plus audio and video), `attachment` for everything else (PDF, HTML, SVG,
 * XML, JavaScript, unknown). A missing type is served as `application/octet-stream`.
 *
 * @param headers - the response headers (already holding the stored HTTP metadata)
 * @param key - the R2 key (the original file name is read from it)
 */
export const serveHeaders = ( headers : Headers, key : string ) : void => {
	const stored = ( headers.get( 'content-type' ) ?? '' ).toLowerCase();
	const type = stored.split( ';' )[0].trim();
	if ( !type ) headers.set( 'content-type', 'application/octet-stream' );

	const inline = !!type && !ACTIVE_TYPE_RE.test( stored ) && ( INLINE_TYPES.includes( type ) || type.startsWith( 'audio/' ) || type.startsWith( 'video/' ) );
	const name = _headerFileName( keyExp( key ).originalFileName || key.slice( key.lastIndexOf( '/' ) + 1 ) );

	headers.set( 'content-disposition', `${inline ? 'inline' : 'attachment'}; filename="${name}"` );
	headers.set( 'x-content-type-options', 'nosniff' );
	headers.set( 'content-security-policy', "sandbox; default-src 'none'" );
};

/** What a delete pattern selects: one exact key, or every key under a complete folder (`prefix` ends with `/`) */
export type DeleteTarget = { prefix : string; exact : boolean };

/**
 * Turns a delete pattern into the R2 prefix to delete, refusing patterns that are too broad.
 *
 * - A full key (`<domain>|<folder>/<ts>|<file>`) selects that file only.
 * - A full folder (`<domain>|<folder>`) or a relative folder (`kanban/<id>`) selects the complete folder only: the
 *   prefix ends with `/`, so `kanban_c1` never matches `kanban_c10` and `u` never matches `uploads`.
 * - The domain alone (`<domain>|`), an empty pattern, only slashes or only `*` select nothing (null).
 * A trailing `*` is ignored (folders are always matched as a whole).
 *
 * @param domain - the caller's domain
 * @param pattern - the client pattern
 * @returns the target, or null when the pattern is refused
 */
export const deleteTarget = ( domain : string, pattern : string ) : DeleteTarget | null => {
	const value = pattern.trim().replace( /\*+$/, '' );
	const pipes = ( value.match( /\|/g ) || [] ).length;

	if ( pipes === 2 ) {
		const parts = keyExp( value );
		if ( parts.domain !== domain || !parts.fullPath.replace( /\//g, '' ) || !parts.originalFileName ) return null;
		return { prefix: value, exact: true };
	}
	if ( pipes > 2 ) return null;

	const folder = ( pipes === 1 ? value.slice( value.indexOf( '|' ) + 1 ) : value ).replace( /^\/+|\/+$/g, '' );
	if ( pipes === 1 && !value.startsWith( `${domain}|` ) ) return null;
	if ( !folder ) return null;

	return { prefix: `${domain}|${safeName( folder )}/`, exact: false };
};

export const keyAddFolder = ( folder : string, key : string ) => {
	const parts = keyExp( key );

	return `${parts.domain}|${folder}/${parts.fullPath}|${parts.originalFileName}`;
};
/*=== f2c_end utils ===*/
