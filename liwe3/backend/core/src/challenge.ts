import { sha256 } from './crypto';

/**
 * takes a list of strings and returns a valid challenge
 */
export const challenge_create = async ( secret : string, params : string[], debug = false ) => {
	const s : string[] = params.map( ( p ) => ( p || '' )?.toString().toLowerCase() );
	s.sort();
	s.push( secret );

	let ckey = s.join( '-' );

	// remove multiple '-' characters
	ckey = ckey.replace( /-{2,}/g, '-' );

	// remove all starting '-' characters
	while ( ckey[0] == '-' ) ckey = ckey.substring( 1 );

	if ( debug ) console.log( '=== CHALLENGE: Create: ', ckey );

	return await sha256( ckey );
};

/**
 * takes a list of strings and check it agains the provided challenge
 *
 * @param challenge	the challenge to check
 * @param params	the list of strings to check
 *
 * @returns true if the challenge is valid
 */
export const challenge_check = async ( challenge : string, secret : string, params : string[], debug = false ) => {
	debug = true;
	const ch = await challenge_create( secret, params, debug );

	if ( debug ) console.log( `=== CHALLENGE: Received:  ${challenge} - Valid: ${ch}` );

	return ch === challenge;
};
