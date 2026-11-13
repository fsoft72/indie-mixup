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
