/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable @typescript-eslint/no-unused-vars */

import md5 from './md5';
import type { UserAuth } from '../types/user_auth';
import { apiClient } from './ApiClient';
import { runeDebug } from './runes.svelte';
import { sha256 } from '../lib/crypto';

// Format a date string like '2023-08-01T17:15:09.388Z' into a readable date string
export const format_date = ( date? : string | Date, format = 'YYYY-MM-DD HH:mm:ss' ) => {
	if ( !date ) return '';

	let d : Date;

	if ( typeof date === 'string' ) {
		d = new Date( date );
	} else {
		d = date;
	}

	const dct : Record<string, string> = {
		YYYY: d.getFullYear().toString(),
		MM: ( '0' + ( d.getMonth() + 1 ) ).slice( -2 ),
		DD: ( '0' + d.getDate() ).slice( -2 ),
		HH: ( '0' + d.getHours() ).slice( -2 ),
		mm: ( '0' + d.getMinutes() ).slice( -2 ),
		ss: ( '0' + d.getSeconds() ).slice( -2 ),
	};

	// convert YYYY, MM, DD HH, mm, ss in the format string into ${YYYY}, ${MM}, ${DD}, ${HH}, ${mm}, ${ss}
	const res = format.replace( /YYYY|MM|DD|HH|mm|ss/g, ( match ) => dct[match] );

	return res;
};

// converts a number like 1000.23  into 1.000,23
export const format_amount = ( amount? : number ) => {
	if ( !amount ) return '0,00';
	amount = Math.round( amount * 100 ) / 100;
	const [ int, dec ] = amount.toFixed( 2 ).split( '.' );
	return `${Number( int ).toLocaleString().replace( /,/g, '.' )},${dec}`;
};

export const toFixed = ( amount? : number | string, decimals = 2 ) => {
	if ( !amount ) return 0.00;
	return parseFloat( parseFloat( amount.toString() ).toFixed( decimals ) );
};

export const format_size = ( size : number ) => {
	const units = [ 'B', 'KB', 'MB', 'GB', 'TB', 'PB' ];
	let i = 0;
	while ( size >= 1024 ) {
		size /= 1024;
		++i;
	}
	return `${size.toFixed( 2 )} ${units[i]}`;
};

export const has_perm = ( user : UserAuth | null, perm : string ) => {
	// runeDebug( '=== HAS PERM: ', { perm, user, perms: user?.perms } );
	if ( !user ) return false;
	if ( !user.perms ) return false;
	if ( !user.perms.length ) return false;

	if ( user.perms.indexOf( 'system.admin' ) >= 0 ) return true;

	// split on the first dot
	const mod = perm.split( '.' )[0];
	if ( user.perms.indexOf( `${mod}.admin` ) >= 0 ) return true;

	if ( user.perms.indexOf( perm ) >= 0 ) return true;

	return false;
};

export const has_one_perm = ( user : UserAuth | null, perms : string[] ) => {
	// if perms is empty, everyone has access
	if ( !perms ) return true;
	if ( !perms.length ) return true;

	if ( !user ) return false;
	if ( !user.perms ) return false;

	if ( !user.perms.length ) return false;
	if ( user.perms.indexOf( 'system.admin' ) >= 0 ) return true;

	for ( let i = 0; i < perms.length; i++ ) {
		const perm = perms[i];

		if ( has_perm( user, perm ) ) return true;
	}

	return false;
};

/**
 *  Generates a random integer number from `min` to `max`
 *
 * @param min Random int starting number
 * @param max Random int max ending number
 * @returns an integer between the specified min / max range
 */
export const rand_int = ( min : number = 0, max : number = 100 ) : number => {
	min = Math.ceil( min );
	max = Math.floor( max );

	return Math.floor( Math.random() * ( max - min + 1 ) ) + min;
};

/**
 * Generates an unique string code (up to 37 chars long)
 *
 * @param simple	If the code should be simpler (smaller)
 * @param prefix	The prefix to add to the string
 * @param second_slice	If a second slice of random string should be added
 * @returns the unique string generated
 */
export const unique_code = ( simple : boolean = true, prefix : string = '', second_slice : boolean = true ) : string => {
	const now = new Date();
	const n = now.getTime(); //  + now.getMilliseconds();

	if ( prefix ) prefix = `${prefix}.`;
	else prefix = '';

	let c = `${prefix}${md5( n.toString( 36 ) )}`;

	if ( simple && !second_slice ) return c;

	c = `${c}.${rand_int( 0, n ).toString( 36 ).slice( 0, 4 )}`;

	if ( simple ) return c;

	return `${prefix}${md5( c )}.${rand_int( 0, n ).toString( 36 ).slice( 0, 4 )}`;
};

/**
 * Generates a unique code number string based on the current timestamp.
 *
 * @param {number} length - The length of the code number string to generate.
 * @param {number} [second_slice=0] - The length of the second slice to append to the code number string.
 * @returns {string} - The unique code number string.
 */
export const unique_code_numbers = ( length : number, second_slice : number = 0 ) : string => {
	const now = new Date();
	const n = now.getTime(); //  + now.getMilliseconds();

	// get the latest length digits of the string
	const c = n.toString().slice( -length );

	if ( !second_slice ) return c;

	const m = now.getTime() + now.getMilliseconds();

	// get the latest length digits of the string
	return `${c}.${m.toString().slice( -second_slice )}`;
};

/**
 * @description This function returns an unique id, the id starts with the prefix and can optionally contain an extension
 * @param prefix - The prefix to add to the string
 * @param ext - The extension to add to the string
 */
export const mkid = ( prefix : string, ext? : string ) => {
	if ( !ext ) ext = '';
	if ( ext && ext.length && !ext.startsWith( '.' ) ) ext = `.${ext}`;

	return `${unique_code( false, prefix )}${ext}`;
};

export const mkid_simple = ( prefix : string, rnd : boolean = true, sep : string = '.' ) => {
	const d = new Date().getTime().toString( 36 );
	const rand = rand_int( 0, 999999 ).toString( 36 );

	if ( rnd ) return `${prefix}${sep}${d}${sep}${rand}`;

	return `${prefix}${sep}${d}`;
};

export const media_url = ( id : string, filename : string = '', thumbnail = false ) => {
	if ( !id ) return '';

	if ( ( id as any ).id ) id = ( id as any ).id;

	if ( !filename ) filename = id;

	const url = apiClient.fullURL( '/static/public/uploads' );
	const base = id.split( '.' ).slice( -1 );
	let new_url;

	if ( !thumbnail ) new_url = `${url}/${base}/${filename}`;
	else new_url = `${url}/${base}/thumbs/${id}.jpg`;

	return new_url;
};

/**
 * Convert seconds into a time string of hh:mm:ss
 *
 * @param secs - The seconds to convert
 * @returns the time string
 */
export const secs2time = ( secs? : number ) => {
	if ( !secs ) return '00:00';
	const hours = Math.floor( secs / 3600 );
	const minutes = Math.floor( ( secs - ( hours * 3600 ) ) / 60 );
	const seconds = secs - ( hours * 3600 ) - ( minutes * 60 );

	let time = '';

	if ( hours > 0 ) {
		time = `${hours}:`;
	}

	time += `${( '0' + minutes ).slice( -2 )}:${( '0' + seconds ).slice( -2 )}`;

	return time;
};

export const toBool = ( val : any ) => {
	if ( val === 'true' || val === true || val === 1 || val === '1' ) return true;
	return false;
};

/**
 * This function returns the username or (deleted) if the username starts with 'user.'
 *
 * @param username
 * @returns
 */
export const uname = ( username? : string ) => {
	if ( !username ) return '';
	if ( username.startsWith( 'user.' ) ) return '(deleted)';
	return username;
};

/**
 * Converts a hexadecimal RGB color code to an array of integers representing the RGB values.
 *
 * @param rgb - The hexadecimal RGB color code (e.g., "#FF0000" for red).
 * @returns An array of integers representing the RGB values [r, g, b].
 */
export const rgbHexToInt = ( rgb : string ) => {
	if ( !rgb ) return [ 0, 0, 0 ];

	// add the '#' if it's missing
	if ( rgb.length === 6 ) rgb = `#${rgb}`;

	const r = parseInt( rgb.slice( 1, 3 ), 16 );
	const g = parseInt( rgb.slice( 3, 5 ), 16 );
	const b = parseInt( rgb.slice( 5, 7 ), 16 );

	return [ r, g, b ];
};

/**
 * Converts an RGB color array to a hexadecimal color string.
 * @param rgb - The RGB color array [r, g, b].
 * @returns The hexadecimal color string.
 */
export const intToRGBHex = ( rgb : number[] ) => {
	const r = rgb[0].toString( 16 ).padStart( 2, '0' );
	const g = rgb[1].toString( 16 ).padStart( 2, '0' );
	const b = rgb[2].toString( 16 ).padStart( 2, '0' );

	return `#${r}${g}${b}`;
};

export function debounce<T extends ( ...args : any[] ) => any>(
	func : T,
	delay : number,
) : ( ...args : Parameters<T> ) => void {
	let timeoutId : ReturnType<typeof setTimeout> | null = null;

	return ( ...args : Parameters<T> ) : void => {
		if ( timeoutId ) {
			clearTimeout( timeoutId );
		}
		timeoutId = setTimeout( () => {
			func( ...args );
		}, delay );
	};
}

export const downloadFile = ( content : string, file_name : string, type = 'application/json' ) => {
	const element = document.createElement( 'a' );
	file_name = file_name.toLowerCase();

	const file = new Blob( [ content ], {
		type,
	} );
	element.href = URL.createObjectURL( file );
	element.download = file_name;
	document.body.appendChild( element );
	element.click();
};

export function values<T>( obj : any ) : T[] {
	if ( !obj ) return [];
	return Object.values( obj );
}

export function keys<T>( obj : any ) : string[] {
	if ( !obj ) return [];
	return Object.keys( obj );
}

export function clearObject( obj : any ) {
	for ( const prop in obj ) {
		delete obj[prop];
	}
}

export const isTrue = ( value : any ) : boolean => {
	if ( typeof value === 'boolean' ) return value;

	if ( typeof value === 'string' ) {
		if ( value === 'true' ) return true;
		if ( value === 'false' ) return false;
		if ( value === '1' ) return true;
		if ( value === '0' ) return false;
		if ( value === 'on' ) return true;
	}

	return false;
};

export const toInt = ( value : any ) : number => {
	return parseInt( value.toString(), 10 );
};

export const challenge_create = async ( params : string[], secret : string, debug = false ) => {
	const s : string[] = params.map( ( p ) => ( p || '' )?.toString().toLowerCase() );
	s.sort();
	s.push( secret );

	let ckey = s.join( '-' );

	// remove multiple '-' characters
	ckey = ckey.replace( /-{2,}/g, '-' );

	// remove all starting '-' characters
	while ( ckey[0] == '-' ) ckey = ckey.substring( 1 );

	if ( debug ) runeDebug( '=== CHALLENGE: Create: ', ckey );

	return await sha256( ckey );
};

/**
 * This function returns a deep copy of the object passed as argument.
 *
 * @param obj - The object to clone.
 *
 * @returns A deep copy of the object.
 */
export const clone = ( obj : any ) => {
	return structuredClone( obj );
};

/**
 * this function returns a dict with only the keys that are not undefined
 */
export const clean = ( obj : Record<string, any> ) => {
	const res : Record<string, any> = {};

	for ( const key in obj ) {
		if ( obj[key] !== undefined ) res[key] = obj[key];
	}

	return res;
};

/**
 * This function returns a shortened text with a maximum number of words and if specified, a maximum length.
 */
export const short_text = (
	text : string,
	words : number,
	maxLength? : number,
	maxRows? : number,
) => {
	if ( !text || text.length === 0 ) return '';

	const words_arr = text.split( ' ' );
	// Merge short words into previous word
	for ( let idx = 2; idx < words_arr.length; idx++ ) {
		if ( words_arr[idx].length < 4 ) {
			words_arr[idx - 1] += ' ' + words_arr[idx];
			words_arr.splice( idx, 1 );
			idx--; // Adjust index after splice
		}
	}

	let output = words_arr.join( ' ' );

	// If text doesn't need to be shortened
	if (
		words_arr.length <= words
		&& ( !maxRows || text.split( '\n' ).length <= maxRows )
	) {
		if ( !maxLength || output.length <= maxLength ) return text;
	}

	// Limit by words
	if ( words_arr.length > words ) {
		words_arr.splice( words, words_arr.length - words );
		output = words_arr.join( ' ' );
	}

	// Limit by maxLength
	if ( maxLength && output.length > maxLength ) {
		output = output.slice( 0, maxLength ) + '...';
	} else {
		output += '...';
	}

	// Limit by maxRows
	if ( maxRows && maxRows > 0 ) {
		const lines = output.split( '\n' );
		if ( lines.length > maxRows ) {
			output = lines.slice( 0, maxRows ).join( '\n' ) + '...';
		}
	}

	return output;
};

/**
 * This function returns the file extension of a filename.
 *
 * @param filename - The filename to extract the extension from.
 */
export const ext = ( filename : string ) => {
	if ( !filename ) return '';
	const parts = filename.split( '.' );
	if ( parts.length < 2 ) return '';
	return parts[parts.length - 1].toLowerCase();
};

// Memoized allowlists for `filterValidChars`. Callers pass the same `validChars`
// string over and over (once per keypress), so the Set is built once per allowlist
// instead of once per call - building it per call would be slower for the
// single-character keypress path.
const VALID_CHARS_CACHE = new Map<string, Set<string>>();
const VALID_CHARS_CACHE_MAX = 32;

// Returns the memoized Set of allowed characters for `validChars`.
// The Set is built with split( '' ), so lookups stay per UTF-16 code unit,
// exactly as the previous `validChars.includes( char )` check was.
const _validCharsSet = ( validChars : string ) : Set<string> => {
	const cached = VALID_CHARS_CACHE.get( validChars );
	if ( cached ) return cached;

	const chars = new Set( validChars.split( '' ) );

	// Simple FIFO eviction to keep the cache bounded
	if ( VALID_CHARS_CACHE.size >= VALID_CHARS_CACHE_MAX ) VALID_CHARS_CACHE.delete( VALID_CHARS_CACHE.keys().next().value! );
	VALID_CHARS_CACHE.set( validChars, chars );

	return chars;
};

/**
 * Filters `text`, keeping only the characters that are also present in `validChars`.
 * Used to enforce free-text inputs (typing, paste, programmatic edits, ...) to a
 * specific allowlist of characters.
 *
 * @param text - The text to filter.
 * @param validChars - The allowlist of characters to keep. If empty/undefined, `text` is returned unchanged.
 * @returns The filtered text.
 */
export const filterValidChars = ( text : string, validChars? : string ) : string => {
	if ( !validChars ) return text;
	if ( !text ) return text;

	const allowed = _validCharsSet( validChars );

	let result = '';
	for ( let i = 0; i < text.length; i++ ) {
		const char = text[i];
		if ( allowed.has( char ) ) result += char;
	}

	return result;
};

const SAFE_HTML_ALLOWED_TAGS = new Set( [
	'a',
	'abbr',
	'b',
	'blockquote',
	'br',
	'code',
	'div',
	'em',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'hr',
	'i',
	'img',
	'li',
	'ol',
	'p',
	'pre',
	'small',
	'span',
	'strong',
	'sub',
	'sup',
	'table',
	'tbody',
	'td',
	'th',
	'thead',
	'tr',
	'u',
	'ul',
] );

const SAFE_HTML_ALLOWED_ATTRS : Record<string, string[]> = {
	'*': [ 'class' ],
	a: [ 'href', 'title', 'target' ],
	img: [ 'src', 'alt', 'title', 'width', 'height' ],
};

const SAFE_HTML_URL_ATTRS = new Set( [ 'href', 'src' ] );

// non-allowlisted elements are unwrapped (content kept). These are removed WHOLE
// instead: their text content is code/markup, not prose, and keeping it would
// dump raw script/style source into the output.
const SAFE_HTML_DROP_CONTENT_TAGS = new Set( [
	'script',
	'style',
	'noscript',
	'template',
	'textarea',
	'title',
	'iframe',
	'object',
	'embed',
] );

// only allow http(s)/mailto/tel absolute urls, or scheme-less relative/anchor urls
const isSafeUrl = ( value : string ) : boolean => {
	// strip every ASCII control char and space (0x00-0x20) before inspecting the
	// scheme: browsers ignore embedded tabs/newlines/NULs in a url, so without
	// this `java\tscript:alert(1)` would reach the `!v.includes(':')` check with
	// its colon "hidden" and... still be rejected, but only by luck. Normalising
	// first makes the intent explicit and covers `\njavascript:` etc.
	// eslint-disable-next-line no-control-regex
	const v = value.replace( /[ - ]+/g, '' ).toLowerCase();

	// protocol-relative `//host` inherits the page scheme and points off-origin
	if ( v.startsWith( '//' ) ) return false;

	if ( v.startsWith( 'http://' ) || v.startsWith( 'https://' ) || v.startsWith( 'mailto:' ) || v.startsWith( 'tel:' ) ) return true;
	if ( v.startsWith( '#' ) || v.startsWith( '/' ) || v.startsWith( './' ) || v.startsWith( '../' ) ) return true;

	// scheme-less relative url (no ':' anywhere -> cannot introduce a dangerous scheme)
	return !v.includes( ':' );
};

// walks a DOM subtree removing anything not in the allowlist, in place
const _sanitizeNode = ( node : ParentNode ) : void => {
	// Walk the LIVE child list rather than a snapshot: when a disallowed element
	// is unwrapped, its former children become children of `node` and MUST be
	// sanitized too - otherwise `<foo><img src=x onerror=alert(1)></foo>` unwraps
	// `<foo>` and the `<img>` (with its handler) survives untouched.
	let child = node.firstChild;

	while ( child ) {
		const next = child.nextSibling;

		if ( child.nodeType === Node.COMMENT_NODE ) {
			node.removeChild( child );
			child = next;
			continue;
		}

		if ( child.nodeType !== Node.ELEMENT_NODE ) {
			child = next;
			continue;
		}

		const el = child as HTMLElement;
		const tag = el.tagName.toLowerCase();

		if ( SAFE_HTML_DROP_CONTENT_TAGS.has( tag ) ) {
			// remove the element AND its content
			node.removeChild( el );
			child = next;
			continue;
		}

		if ( !SAFE_HTML_ALLOWED_TAGS.has( tag ) ) {
			// unwrap: drop the element itself but keep its content, then resume
			// from the first promoted node so it goes through the allowlist too
			const firstPromoted = el.firstChild;
			while ( el.firstChild ) node.insertBefore( el.firstChild, el );
			node.removeChild( el );
			child = firstPromoted ?? next;
			continue;
		}

		const allowedAttrs = new Set( [
			...( SAFE_HTML_ALLOWED_ATTRS[tag] || [] ),
			...( SAFE_HTML_ALLOWED_ATTRS['*'] || [] ),
		] );

		for ( const attr of Array.from( el.attributes ) ) {
			const name = attr.name.toLowerCase();

			// drops every `on*` event handler and any other non-allowlisted attribute
			if ( !allowedAttrs.has( name ) ) {
				el.removeAttribute( attr.name );
				continue;
			}

			if ( SAFE_HTML_URL_ATTRS.has( name ) && !isSafeUrl( attr.value ) ) {
				el.removeAttribute( attr.name );
			}
		}

		if ( tag === 'a' ) el.setAttribute( 'rel', 'noopener noreferrer' );

		_sanitizeNode( el );
		child = next;
	}
};

/**
 * Sanitizes an HTML string against a small allowlist of tags/attributes, so it can be
 * safely passed to Svelte's `{@html ...}` when the markup may come from user-controlled
 * data (e.g. a DataGrid `field.render()` callback, a rich-text/comment field, ...).
 *
 * Removes `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>` and friends
 * together with their raw source; unwraps every other non-allowlisted tag (keeps
 * the text, drops the wrapper) and keeps sanitizing that promoted content.
 *
 * Also sanitizes ATTRIBUTES, not just text: strips every `on*` handler and any
 * attribute outside the per-tag allowlist, and drops `href`/`src` values that are
 * not http(s)/mailto/tel/relative - including schemes hidden behind embedded
 * control chars (`java&#9;script:`) and protocol-relative `//host` URLs. Attribute
 * values that survive are re-serialized by the DOM, so quote-breakout payloads
 * are entity-escaped and cannot forge a new attribute.
 *
 * @param html - The raw HTML string to sanitize.
 * @returns The sanitized HTML string.
 */
export const safeHTML = ( html? : string | null ) : string => {
	if ( !html ) return '';

	const template = document.createElement( 'template' );
	template.innerHTML = html;

	_sanitizeNode( template.content );

	return template.innerHTML;
};

/**
 * This function explores the object parents to find the parent with the specified class name.
 * @param element - The element to start the search from.
 * @param className - The class name to search for.
 */
export const getParentByClass = ( element : HTMLElement, className : string ) => {
	let parent = element.parentElement;
	while ( parent && !parent.classList.contains( className ) ) {
		parent = parent.parentElement;
	}
	return parent;
};

/**
 * This function highlights a part (needle) of the whole string (searchableText) .
 * @param searchableString - The string to highlight.
 * @param needle - The search string to highlight.
 * @returns The highlighted string.
 */
export const highlightResults = ( searchableString : string, needle : string ) => {
	if ( needle === '' ) return searchableString;
	const idx = searchableString.toLowerCase().indexOf( needle.toLowerCase() );
	if ( idx < 0 ) return searchableString;
	const before = searchableString.slice( 0, idx );
	const match = searchableString.slice( idx, idx + needle.length );
	const after = searchableString.slice( idx + needle.length );
	return `${before}<span style="color:var(--liwe3-accent);">${match}</span>${after}`;
};
