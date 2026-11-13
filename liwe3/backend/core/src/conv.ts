/**
 * Converts the input value to an integer.
 * If the input value is falsy or undefined, returns 0.
 * @param s - The value to convert to an integer.
 * @returns The converted integer value.
 */
export const int = ( s : any ) : number => {
	if ( !s ) return 0;
	if ( typeof s === 'undefined' ) s = '0';
	return parseInt( s.toString(), 10 );
};

/**
 * Converts a value to a floating-point number.
 * If the value is falsy, returns 0.0.
 * @param s - The value to convert.
 * @returns The converted floating-point number.
 */
export const float = ( s : any ) : number => {
	if ( !s ) return 0.0;
	return parseFloat( s.toString() );
};

/**
 * Converts a string into a slug by removing special characters, converting to lowercase, and replacing spaces with dashes.
 * @param str - The string to be slugified.
 * @returns The slugified string.
 */
const _SLUG_GROUPS : Array<[ RegExp, string ]> = [
	[ /[àáäâãåÀÁÄÂÃÅ]/g, 'a' ],
	[ /[èéëêÈÉËÊ]/g, 'e' ],
	[ /[ìíïîÌÍÏÎ]/g, 'i' ],
	[ /[òóöôõøÒÓÖÔÕØ]/g, 'o' ],
	[ /[ùúüûÙÚÜÛ]/g, 'u' ],
	[ /[ñÑ]/g, 'n' ],
	[ /ç/g, 'c' ],
	[ /ß/g, 'ss' ],
	[ /[^a-z0-9 -]/g, '' ],
	[ /\s+/g, '-' ],
	[ /-+/g, '-' ],
];

export const slugify = ( str : string ) => {
	str = str.replace( /^\s+|\s+$/g, '' ); // trim
	str = str.toLowerCase();

	for ( const [ re, to ] of _SLUG_GROUPS ) {
		str = str.replace( re, to );
	}

	return str;
};

const dec2base64_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';

/**
 * Converts a decimal number to a base-96 string representation.
 * @param decimal The decimal number to convert.
 * @returns The base-96 string representation of the decimal number.
 */
export const decimalToBase96 = ( decimal : number ) : string => {
	let result = '';
	while ( decimal > 0 ) {
		const remainder = decimal % 96;
		result += dec2base64_chars.charAt( remainder );
		decimal = Math.floor( decimal / 96 );
	}
	return result.split( '' ).reverse().join( '' );
};

/**
 * Converts a base96 number to decimal.
 *
 * @param base96 - The base96 number to convert.
 * @returns The decimal representation of the base96 number.
 */
export const base96ToDecimal = ( base96 : string ) : number => {
	let decimal = 0;
	for ( let i = base96.length - 1; i >= 0; i-- ) {
		const char = base96.charAt( i );
		const power = base96.length - 1 - i;
		const value = dec2base64_chars.indexOf( char );
		decimal += value * Math.pow( 96, power );
	}
	return decimal;
};

/**
 * Formats a number as a currency string.
 * @param number - The number to format.
 * @param options - Optional formatting options.
 * @param options.thousandSeparator - The character used as a thousand separator. Default is '.'.
 * @param options.decimalSeparator - The character used as a decimal separator. Default is ','.
 * @returns The formatted currency string.
 */
export const formatCurrency = ( number : number, { thousandSeparator = '.', decimalSeparator = ',' } = {} ) : string => {
	// if number is a string, convert to float
	if ( !number ) return '';
	if ( typeof number === 'string' ) {
		number = parseFloat( number );
	}

	let buffer = '';
	let parts = number.toFixed( 2 ).split( '.' );
	let integerPart = parts[0];
	let decimalPart = parts[1];

	for ( let i = 0; i < integerPart.length; i++ ) {
		if ( i > 0 && ( integerPart.length - i ) % 3 === 0 ) {
			buffer += thousandSeparator;
		}
		buffer += integerPart[i];
	}

	buffer += decimalSeparator;
	buffer += decimalPart;

	return buffer;
};

/// export a number with a fixed number of decimals
export const toNumDecimal = ( num : number, dec : number ) : number => {
	const s = ( num ?? 0 ).toString();
	const n = parseFloat( s ).toFixed( dec );

	return parseFloat( n );
};
