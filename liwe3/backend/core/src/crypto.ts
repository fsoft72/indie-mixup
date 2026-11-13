const PASSWORD_HASH_ITERATIONS = 100_000;

async function _crypt( text : string, algorithm : 'SHA-256' | 'SHA-512' ) {
	// Encode the input string to a Uint8Array.
	// The Web Crypto API works with binary data, not strings.
	const data = new TextEncoder().encode( text );

	// Hash the data using the SHA-512 algorithm.
	// This is an asynchronous operation.
	const hashBuffer = await crypto.subtle.digest( algorithm, data );

	// Convert the hash ArrayBuffer to a hexadecimal string.
	const hashArray = Array.from( new Uint8Array( hashBuffer ) );
	const hashHex = hashArray
		.map( ( b ) => b.toString( 16 ).padStart( 2, '0' ) )
		.join( '' );

	return hashHex;
}

export async function sha512( text : string ) {
	return _crypt( text, 'SHA-512' );
}

export async function sha256( text : string ) {
	return _crypt( text, 'SHA-256' );
}

function _bytesToHex( bytes : Uint8Array ) : string {
	return Array.from( bytes )
		.map( ( b ) => b.toString( 16 ).padStart( 2, '0' ) )
		.join( '' );
}

/**
 * Derives a PBKDF2 key from `password` and `salt` and returns it as a hex string.
 * `hashPassword` and `verifyPassword` must always derive with the exact same
 * parameters (iterations, hash, output algorithm), so both go through this helper
 * rather than each keeping their own copy of the derivation call.
 */
async function _derivePasswordHashHex( password : string, salt : Uint8Array<ArrayBuffer> ) : Promise<string> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode( password ),
		{ name: 'PBKDF2' },
		false,
		[ 'deriveBits', 'deriveKey' ],
	);

	const derivedKey = await crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt,
			iterations: PASSWORD_HASH_ITERATIONS,
			hash: 'SHA-512',
		},
		key,
		{ name: 'AES-GCM', length: 256 },
		true,
		[ 'encrypt', 'decrypt' ],
	);

	const rawKey = await crypto.subtle.exportKey( 'raw', derivedKey );

	return _bytesToHex( new Uint8Array( rawKey ) );
}

export async function hashPassword( password : string ) {
	// Input validation
	if ( !password || password.length > 1000 ) {
		throw new Error( 'Invalid password: must be non-empty and less than 1000 characters' );
	}

	const salt = crypto.getRandomValues( new Uint8Array( 16 ) );
	const hashHex = await _derivePasswordHashHex( password, salt );
	const saltHex = _bytesToHex( salt );

	return `${saltHex}$${hashHex}`;
}

/**
 * Performs constant-time string comparison to prevent timing attacks
 */
function _constantTimeEquals( a : string, b : string ) : boolean {
	if ( a.length !== b.length ) return false;

	let result = 0;
	for ( let i = 0; i < a.length; i++ ) {
		result |= a.charCodeAt( i ) ^ b.charCodeAt( i );
	}
	return result === 0;
}

export async function verifyPassword( password : string, hashed : string ) {
	// Input validation
	if ( !password || password.length > 1000 ) return false;
	if ( !hashed || !hashed.includes( '$' ) ) return false;

	const parts = hashed.split( '$' );
	if ( parts.length !== 2 ) return false;

	const [ saltHex, hashHex ] = parts;
	if ( !saltHex || !hashHex ) return false;

	// Validate hex format
	const saltMatch = saltHex.match( /^[0-9a-f]+$/i );
	const hashMatch = hashHex.match( /^[0-9a-f]+$/i );
	if ( !saltMatch || !hashMatch ) return false;

	// Parse salt
	const saltBytes = saltHex.match( /.{1,2}/g );
	if ( !saltBytes || saltBytes.length !== 16 ) return false;

	const salt = new Uint8Array(
		saltBytes.map( ( byte ) => parseInt( byte, 16 ) ),
	);

	const computedHashHex = await _derivePasswordHashHex( password, salt );

	// Use constant-time comparison to prevent timing attacks
	return _constantTimeEquals( computedHashHex, hashHex );
}

// Chunk size for byte->string conversion, well under any JS engine's max
// call-stack/argument-count limit (typically ~65k-125k args to a single call)
const _BASE64_CHUNK_SIZE = 0x8000;

/**
 * Converts raw bytes to a base64url string (RFC 4648 §5, unpadded), without spreading
 * the whole byte array into `String.fromCharCode(...bytes)` - which can exceed the JS
 * engine's max call-stack/argument-count limit and crash on large inputs.
 */
function _bytesToBase64Url( bytes : Uint8Array ) : string {
	let binary = '';

	for ( let i = 0; i < bytes.length; i += _BASE64_CHUNK_SIZE ) {
		binary += String.fromCharCode( ...bytes.subarray( i, i + _BASE64_CHUNK_SIZE ) );
	}

	return btoa( binary )
		.replace( /=+$/, '' )
		.replace( /\+/g, '-' )
		.replace( /\//g, '_' );
}

export const jwtCreate = async ( payload : Record<string, any>, secret : string, expiresIn : number = 3600 ) : Promise<string> => {
	// Input validation
	if ( !payload || typeof payload !== 'object' ) {
		throw new Error( 'Invalid payload: must be a non-null object' );
	}

	// Validate the secret's own strength before hashing it: sha256() always
	// returns a fixed-length 64-char hex string, so checking the length
	// *after* hashing can never reject a weak/short secret.
	if ( !secret || secret.length < 32 ) {
		throw new Error( 'Invalid secret: must be at least 32 characters long' );
	}
	if ( expiresIn <= 0 || expiresIn > 2592000 ) { // Max 30 days in seconds
		throw new Error( 'Invalid expiresIn: must be between 1 second and 30 days (2592000 seconds)' );
	}

	secret = await sha256( secret ); // Hash secret to ensure proper length

	const header = {
		alg: 'HS256',
		typ: 'JWT',
	};

	const enc = new TextEncoder();

	const iat = Math.floor( Date.now() / 1000 );
	let exp = iat + expiresIn;

	const fullPayload = {
		...payload,
		iat,
		exp,
	};

	const base64UrlEncode = ( obj : any ) => _bytesToBase64Url( enc.encode( JSON.stringify( obj ) ) );

	const headerB64 = base64UrlEncode( header );
	const payloadB64 = base64UrlEncode( fullPayload );
	const data = `${headerB64}.${payloadB64}`;

	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode( secret ),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		[ 'sign' ],
	);

	const signatureBuffer = await crypto.subtle.sign(
		'HMAC',
		key,
		enc.encode( data ),
	);

	const signatureB64 = _bytesToBase64Url( new Uint8Array( signatureBuffer ) );

	return `${data}.${signatureB64}`;
};

type JwtPayload = {
	iat : number;
	exp : number;
	[key : string] : any;
};

/**
 * Add base64 padding if needed
 */
function _addBase64Padding( str : string ) : string {
	return str + '='.repeat( ( 4 - str.length % 4 ) % 4 );
}

export const jwtVerify = async ( token : string, secret : string ) : Promise<JwtPayload | null> => {
	// Input validation
	if ( !token || !secret ) return null;
	// Validate the secret's own strength before hashing it (see jwtCreate for why).
	if ( secret.length < 32 ) return null; // Minimum 32 chars for security
	secret = await sha256( secret ); // Hash secret to ensure proper length

	const parts = token.split( '.' );
	if ( parts.length !== 3 ) return null;

	const [ headerB64, payloadB64, signatureB64 ] = parts;
	if ( !headerB64 || !payloadB64 || !signatureB64 ) return null;

	// Decode and validate header
	let header : any;
	try {
		const headerJson = new TextDecoder().decode(
			Uint8Array.from( atob( _addBase64Padding( headerB64.replace( /-/g, '+' ).replace( /_/g, '/' ) ) ), ( c ) => c.charCodeAt( 0 ) ),
		);
		header = JSON.parse( headerJson );
	} catch ( e ) {
		return null;
	}

	// Validate algorithm to prevent algorithm confusion attacks
	if ( header.alg !== 'HS256' || header.typ !== 'JWT' ) {
		return null;
	}

	const enc = new TextEncoder();
	const data = `${headerB64}.${payloadB64}`;

	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode( secret ),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		[ 'verify' ],
	);

	// Properly handle base64 padding for signature
	const signature = Uint8Array.from(
		atob( _addBase64Padding( signatureB64.replace( /-/g, '+' ).replace( /_/g, '/' ) ) ),
		( c ) => c.charCodeAt( 0 ),
	);

	const isValid = await crypto.subtle.verify(
		'HMAC',
		key,
		signature,
		enc.encode( data ),
	);

	if ( !isValid ) return null;

	// Decode payload safely
	let payload : JwtPayload;
	try {
		const payloadJson = new TextDecoder().decode(
			Uint8Array.from( atob( _addBase64Padding( payloadB64.replace( /-/g, '+' ).replace( /_/g, '/' ) ) ), ( c ) => c.charCodeAt( 0 ) ),
		);
		payload = JSON.parse( payloadJson );
	} catch ( e ) {
		return null;
	}

	// Validate payload structure
	if ( typeof payload !== 'object' || payload === null ) return null;
	if ( typeof payload.iat !== 'number' || typeof payload.exp !== 'number' ) return null;

	// Check expiration
	const now = Math.floor( Date.now() / 1000 );
	if ( payload.exp && now >= payload.exp ) {
		return null;
	}

	return payload;
};

/**
 * Symmetric XOR cipher + Hex encoding.
 * Used for obfuscating data synchronously.
 *
 * NOTE: far less secure than proper encryption methods.
 */
export const obfuscate = ( text : string, key : string ) : string => {
	if ( !text ) return text;

	let result = '';
	for ( let i = 0; i < text.length; i++ ) {
		// XOR the character code with the key's character code
		const charCode = text.charCodeAt( i ) ^ key.charCodeAt( i % key.length );
		// Convert to hex to ensure it is DB-safe string storage
		result += charCode.toString( 16 ).padStart( 2, '0' );
	}
	return result;
};

/**
 * Reverse XOR (Hex -> XOR -> String).
 * Used for deobfuscating data synchronously.
 *
 * NOTE: far less secure than proper encryption methods.
 */
export const deobfuscate = ( hex : string, key : string ) : string => {
	if ( !hex ) return hex;

	let result = '';
	for ( let i = 0; i < hex.length; i += 2 ) {
		// Parse hex back to number
		const charCode = parseInt( hex.substring( i, i + 2 ), 16 );
		// XOR again reverses the operation
		result += String.fromCharCode( charCode ^ key.charCodeAt( ( i / 2 ) % key.length ) );
	}
	return result;
};

// Utility functions for encrypting/decrypting data using Web Crypto API (AES-GCM)
const _CRYPT_ALGO = { name: 'AES-GCM', length: 256 };

// Cache of derived keys, keyed by the SHA-256 fingerprint of the secret.
// Derivation is deterministic (fixed salt), so caching is safe.
// Keys are non-extractable and the cache lives only for the isolate lifetime.
const _KEY_CACHE = new Map<string, CryptoKey>();
const _KEY_CACHE_MAX = 32;

// Returns the SHA-256 hex digest of a secret, used as cache key so the
// plaintext secret is never retained as a Map key
const _secretFingerprint = async ( secret : string ) : Promise<string> => {
	const digest = await crypto.subtle.digest( 'SHA-256', new TextEncoder().encode( secret ) );
	return [ ...new Uint8Array( digest ) ].map( ( b ) => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
};

// Derive a CryptoKey from a secret using PBKDF2 (cached per secret)
const getKey = async ( secret : string ) : Promise<CryptoKey> => {
	const fingerprint = await _secretFingerprint( secret );
	const cached = _KEY_CACHE.get( fingerprint );
	if ( cached ) return cached;

	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		enc.encode( secret ),
		{ name: 'PBKDF2' },
		false,
		[ 'deriveKey' ],
	);

	const key = await crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: enc.encode( 'liwe3-credentials-salt' ), // This should be a fixed salt for consistency
			iterations: 100000,
			hash: 'SHA-256',
		},
		keyMaterial,
		_CRYPT_ALGO,
		false,
		[ 'encrypt', 'decrypt' ],
	);

	// Simple FIFO eviction to keep the cache bounded
	if ( _KEY_CACHE.size >= _KEY_CACHE_MAX ) _KEY_CACHE.delete( _KEY_CACHE.keys().next().value! );
	_KEY_CACHE.set( fingerprint, key );

	return key;
};

export async function encryptData( data : Record<string, any>, secret : string ) : Promise<string> {
	const key = await getKey( secret );
	const iv = crypto.getRandomValues( new Uint8Array( 12 ) ); // 12 bytes IV per GCM
	const encodedData = new TextEncoder().encode( JSON.stringify( data ) );

	const encryptedBuffer = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		encodedData,
	);

	// Output format: iv:ciphertext (base64)
	const ivHex = btoa( String.fromCharCode( ...iv ) );
	const cipherHex = btoa( String.fromCharCode( ...new Uint8Array( encryptedBuffer ) ) );

	return `${ivHex}:${cipherHex}`;
}

const _BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes raw bytes as an unpadded RFC 4648 base32 string
 */
function _base32Encode( bytes : Uint8Array ) : string {
	let bits = 0;
	let value = 0;
	let output = '';

	for ( const byte of bytes ) {
		value = ( value << 8 ) | byte;
		bits += 8;

		while ( bits >= 5 ) {
			output += _BASE32_ALPHABET[( value >>> ( bits - 5 ) ) & 31];
			bits -= 5;
		}
	}

	if ( bits > 0 ) output += _BASE32_ALPHABET[( value << ( 5 - bits ) ) & 31];

	return output;
}

/**
 * Decodes a (padded or unpadded, upper or lower case) RFC 4648 base32 string to raw bytes
 */
function _base32Decode( input : string ) : Uint8Array<ArrayBuffer> {
	const clean = input.toUpperCase().replace( /[^A-Z2-7]/g, '' );
	let bits = 0;
	let value = 0;
	const output : number[] = [];

	for ( const char of clean ) {
		const idx = _BASE32_ALPHABET.indexOf( char );
		if ( idx === -1 ) continue;

		value = ( value << 5 ) | idx;
		bits += 5;

		if ( bits >= 8 ) {
			output.push( ( value >>> ( bits - 8 ) ) & 0xff );
			bits -= 8;
		}
	}

	return new Uint8Array( output );
}

/**
 * Generates a random base32-encoded TOTP secret (RFC 6238)
 *
 * @param {number} [byteLength=20] - Number of random bytes backing the secret (160 bits by default)
 * @returns {string} Base32-encoded secret, suitable for storage and for building an otpauth:// URL
 */
export function totpSecretGenerate( byteLength : number = 20 ) : string {
	return _base32Encode( crypto.getRandomValues( new Uint8Array( byteLength ) ) );
}

/**
 * Computes an HOTP code (RFC 4226) for a given counter, per the algorithm TOTP builds on
 */
async function _hotp( secretBytes : Uint8Array<ArrayBuffer>, counter : number, digits : number ) : Promise<string> {
	const counterBuffer = new ArrayBuffer( 8 );
	const view = new DataView( counterBuffer );
	view.setUint32( 0, Math.floor( counter / 2 ** 32 ) );
	view.setUint32( 4, counter >>> 0 );

	const key = await crypto.subtle.importKey(
		'raw',
		secretBytes,
		{ name: 'HMAC', hash: 'SHA-1' },
		false,
		[ 'sign' ],
	);

	const signature = new Uint8Array( await crypto.subtle.sign( 'HMAC', key, counterBuffer ) );

	const offset = signature[signature.length - 1] & 0x0f;
	const code = (
		( ( signature[offset] & 0x7f ) << 24 )
		| ( ( signature[offset + 1] & 0xff ) << 16 )
		| ( ( signature[offset + 2] & 0xff ) << 8 )
		| ( signature[offset + 3] & 0xff )
	) % ( 10 ** digits );

	return code.toString().padStart( digits, '0' );
}

/**
 * Generates a TOTP code (RFC 6238) for a base32 secret at a given point in time
 *
 * @param {string} base32Secret - Base32-encoded shared secret
 * @param {number} [time=Date.now()] - Time in milliseconds to generate the code for
 * @param {number} [digits=6] - Number of digits in the generated code
 * @param {number} [period=30] - Time step in seconds
 * @returns {Promise<string>} The generated numeric code, zero-padded to `digits`
 */
export async function totpGenerate( base32Secret : string, time : number = Date.now(), digits : number = 6, period : number = 30 ) : Promise<string> {
	const counter = Math.floor( Math.floor( time / 1000 ) / period );
	return _hotp( _base32Decode( base32Secret ), counter, digits );
}

/**
 * Verifies a TOTP code against a base32 secret, tolerating clock skew of `window` steps on either side
 *
 * @param {string} base32Secret - Base32-encoded shared secret
 * @param {string} code - The code submitted by the user
 * @param {number} [time=Date.now()] - Time in milliseconds to verify the code against
 * @param {number} [window=1] - Number of time steps of tolerance on either side of the current step
 * @param {number} [digits=6] - Number of digits in the expected code
 * @param {number} [period=30] - Time step in seconds
 * @returns {Promise<boolean>} True if the code matches any step within the tolerance window
 */
export async function totpVerify(
	base32Secret : string,
	code : string,
	time : number = Date.now(),
	window : number = 1,
	digits : number = 6,
	period : number = 30,
) : Promise<boolean> {
	if ( !code || !/^\d+$/.test( code ) || code.length !== digits ) return false;

	for ( let w = -window; w <= window; w++ ) {
		const candidate = await totpGenerate( base32Secret, time + w * period * 1000, digits, period );
		if ( _constantTimeEquals( candidate, code ) ) return true;
	}

	return false;
}

/**
 * Builds an otpauth:// URL for a TOTP secret, encodable as a QR code by an authenticator app
 *
 * @param {string} secret - Base32-encoded shared secret
 * @param {string} label - Account label, typically the username
 * @param {string} issuer - Issuer name, typically the application name
 * @returns {string} otpauth:// URL
 */
export function totpOtpauthUrl( secret : string, label : string, issuer : string ) : string {
	const encodedLabel = encodeURIComponent( `${issuer}:${label}` );
	const encodedIssuer = encodeURIComponent( issuer );

	return `otpauth://totp/${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

export async function decryptData( encryptedStr : string, secret : string ) : Promise<Record<string, any>> {
	const [ ivHex, cipherHex ] = encryptedStr.split( ':' );
	if ( !ivHex || !cipherHex ) throw new Error( 'Invalid encrypted format' );

	const key = await getKey( secret );

	const iv = Uint8Array.from( atob( ivHex ), ( c ) => c.charCodeAt( 0 ) );
	const cipher = Uint8Array.from( atob( cipherHex ), ( c ) => c.charCodeAt( 0 ) );

	try {
		const decryptedBuffer = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv },
			key,
			cipher,
		);

		const decoded = new TextDecoder().decode( decryptedBuffer );
		return JSON.parse( decoded );
	} catch ( e ) {
		console.error( 'Decryption failed', e );
		throw new Error( 'Failed to decrypt data' );
	}
}
