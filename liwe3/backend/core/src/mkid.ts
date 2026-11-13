import { sha256 } from './crypto';
import { ulid } from 'ulid';

const md5 = async ( txt : string ) => {
	if ( !txt || txt?.length == 0 ) return '';

	const t : string = await sha256( txt );

	return t.slice( 0, 32 );
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
export const unique_code = async ( simple : boolean = true, prefix : string = '', second_slice : boolean = true ) => {
	const now = new Date();
	const n = now.getTime(); //  + now.getMilliseconds();

	if ( prefix ) prefix = `${prefix}.`;
	else prefix = '';

	let c = `${prefix}${await md5( n.toString( 36 ) )}`;

	if ( simple && !second_slice ) return c;

	c = `${c}.${rand_int( 0, n ).toString( 36 ).slice( 0, 4 )}`;

	if ( simple ) return c;

	return `${prefix}${await md5( c )}.${rand_int( 0, n ).toString( 36 ).slice( 0, 4 )}`;
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
	const n = now.getTime().toString() + now.getMilliseconds().toString();

	// get the latest length digits of the string
	let c = n.slice( -length );

	if ( !second_slice ) return c;

	const m = now.getTime().toString() + now.getMilliseconds().toString();

	// get the latest length digits of the string
	return `${c}.${m.slice( -second_slice )}`;
};

/**
 * @description This function returns an unique id, the id starts with the prefix and can optionally contain an extension
 * @param prefix - The prefix to add to the string
 * @param ext - The extension to add to the string
 */
export const mkid_legacy = async ( prefix : string, ext? : string ) => {
	if ( !ext ) ext = '';
	if ( ext && ext.length && !ext.startsWith( '.' ) ) ext = `.${ext}`;

	return `${await unique_code( false, prefix )}${ext}`;
};

/**
 * @description This function returns an unique id, the id starts with the prefix and can optionally contain an extension
 * @param prefix - The prefix to add to the string
 * @param ext - The extension to add to the string
 */
export const mkid = ( prefix? : string, ext? : string ) => {
	if ( !prefix ) prefix = '';
	if ( !ext ) ext = '';
	if ( prefix ) prefix = `${prefix}.`;
	if ( ext && ext.length && !ext.startsWith( '.' ) ) ext = `.${ext}`;

	return `${prefix}${ulid().toLowerCase()}${ext}`;
};

export const mkid_simple = ( prefix? : string, ext? : string ) => {
	if ( !prefix ) prefix = '';
	if ( !ext ) ext = '';
	if ( prefix ) prefix = `${prefix}.`;
	if ( ext && ext.length && !ext.startsWith( '.' ) ) ext = `.${ext}`;

	const d = new Date().getTime().toString( 36 );

	return `${prefix}${d}${ext}`;
};
