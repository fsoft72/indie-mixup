import z from 'zod';
import { LiWEResponse, responseError } from './response';
import { ERR_VALIDATION } from './error-codes';

/**
 * Filters the keys of an object `obj` based on the
 * specified fields in `type_def`.
 * If a key is not in `type_def`, it is removed from `obj`.
 */
export const keys_filter = ( obj : any, type_def : any ) => {
	if ( !obj ) return;

	Object.keys( obj ).forEach( ( k ) => {
		// if the key is not in the type definition, remove it
		const el = type_def[k];
		if ( !el ) {
			delete obj[k];
			return;
		}

		// if the key is private, remove it
		if ( el.priv === true ) {
			delete obj[k];
			return;
		}

		// If we expect a string, but the result is an array
		// we keep only the first element
		if ( el.type == 'string' && Array.isArray( obj[k] ) ) {
			if ( obj[k].length === 0 ) {
				obj[k] = '';
			} else {
				obj[k] = obj[k][0];
			}
		}
	} );
};

/**
 * returns a new object with only the keys that are not undefined
 *
 * @param dct	the object with keys that can be undefined
 *
 * @returns a new object with valid keys
 */
export const keys_valid = ( dct : any ) => {
	const res : any = {};
	Object.keys( dct ).forEach( ( k ) => {
		if ( dct[k] === undefined ) return;

		res[k] = dct[k];
	} );

	return res;
};

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject( item : any ) {
	if ( typeof item === 'undefined' || item === null ) return false;
	if ( item === '' ) return false;
	if ( item instanceof Date ) return false;
	return ( item && typeof item === 'object' && !Array.isArray( item ) );
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function merge( target : any, ...sources : any[] ) : any {
	if ( !sources.length ) return target;
	const source = sources.shift();

	if ( isObject( target ) && isObject( source ) ) {
		for ( const key in source ) {
			if ( isObject( source[key] ) ) {
				if ( !target[key] ) Object.assign( target, { [key]: {} } );
				merge( target[key], source[key] );
			} else {
				Object.assign( target, { [key]: source[key] } );
			}
		}
	}

	return merge( target, ...sources );
}

/**
 * Validate parameters against a schema.
 *
 * @param schema The schema to validate against.
 * @param params The parameters to validate.
 *
 * @returns An object with a `success` property and a `data` or `error` property.
 */
export const paramsValidation = <T>(
	schema : z.ZodSchema<T>,
	params : unknown,
) : { success : true; data : T } | { success : false; error : LiWEResponse<never> } => {
	const validation = schema.safeParse( params );
	if ( !validation.success ) {
		const msg = JSON.parse( validation.error.message );
		return {
			success: false,
			error: responseError( 'Invalid parameters', 400, ERR_VALIDATION, 'error', {
				context: {
					error: msg,
					receivedParams: params,
					issues: validation.error.issues,
				},
			} ),
		};
	}
	return { success: true, data: validation.data };
};
