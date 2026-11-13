// zod validation error is in the format:
/*
[
  {
	"origin": "string",
	"code": "too_small",
	"minimum": 5,
	"inclusive": true,
	"path": [
	  "username"
	],
	"message": "Too small: expected string to have >=5 characters"
  },
  {
	"origin": "string",
	"code": "invalid_format",
	"format": "email",
	"pattern": "/^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$/",
	"path": [
	  "email"
	],
	"message": "Invalid email address"
  },
  {
	"origin": "string",
	"code": "too_small",
	"minimum": 5,
	"inclusive": true,
	"path": [
	  "password"
	],
	"message": "Too small: expected string to have >=5 characters"
  }
]
*/

import { z } from 'zod';

// We want to convert it to a more user-friendly format: a list of errors per field
// Invalid user data: username: Too small: expected string to have >=5 characters;
// email: Invalid email address; password: Too small: expected string to have >=5 characters

export const zodErrorToString = ( error : any ) : string[] => {
	if ( !error ) return [ 'Unknown error' ];

	if ( error.error ) error = error.error;
	if ( error.message && typeof error.message === 'string' ) error = error.message;

	// if error starts with "[" and ends with "]", it's probably a JSON string
	if ( typeof error === 'string' && error.startsWith( '[' ) && error.endsWith( ']' ) ) {
		try {
			const parsed = JSON.parse( error );
			if ( Array.isArray( parsed ) ) {
				error = parsed;
			} else {
				return [ error ];
			}
		} catch ( e ) {
			return [ error ];
		}
	}

	// If error is not an array at this point, return it as a string
	if ( !Array.isArray( error ) ) {
		return [ String( error ) ];
	}

	const messages : string[] = [];

	error.forEach( ( field ) => {
		if ( field && typeof field === 'object' ) {
			const fieldName = field.path && field.path.length > 0 ? field.path[0] : '';
			const message = field.message || 'Unknown error';
			messages.push( `${fieldName}: ${message}` );
		}
	} );

	return messages.length > 0 ? messages : [ 'Unknown error' ];
};

// Define the reusable boolean processor
export const zodBoolean = z.preprocess( ( val ) => {
	if ( typeof val === 'string' ) {
		const lowerVal = val.toLowerCase();
		if ( lowerVal === 'true' || lowerVal === '1' ) return true;
		if ( lowerVal === 'false' || lowerVal === '0' ) return false;
	}
	return val;
}, z.boolean() );
