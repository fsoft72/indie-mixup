/**
 * @fileoverview Anonymous visitor identification and deterministic ids (no personal data stored in clear).
 */

const _sha256 = async ( text : string ) : Promise<string> => {
	const bytes = new TextEncoder().encode( text );
	const digest = await crypto.subtle.digest( 'SHA-256', bytes );

	return Array.from( new Uint8Array( digest ), ( b ) => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
};

/**
 * Hash that identifies an anonymous visitor: the cookie id when present, otherwise the IP, otherwise a shared fixed bucket.
 *
 * @param cookie - Random visitor id from the cookie, if any
 * @param ip - Client IP, if known
 * @param secret - Server secret used as salt
 * @returns A 64 character hexadecimal hash
 */
export const visitorHash = async ( cookie : string | null, ip : string | null, secret : string ) : Promise<string> => {
	const source = cookie ? `c:${cookie}` : ip ? `i:${ip}` : 'anon';

	return _sha256( `${secret}|${source}` );
};

/**
 * Deterministic id of an event: it is the deduplication key (one per game, kind, visitor and UTC day).
 *
 * @param idGame - Game id
 * @param kind - `view` or `download`
 * @param visitor - Visitor hash
 * @param day - UTC day `YYYY-MM-DD`
 * @returns An id of 36 characters
 */
export const eventId = async ( idGame : string, kind : 'view' | 'download', visitor : string, day : string ) : Promise<string> =>
	`ige.${( await _sha256( `${idGame}|${kind}|${visitor}|${day}` ) ).slice( 0, 32 )}`;

/**
 * Deterministic id of a remix report: one report per (reported game, original game) pair.
 *
 * @param idGame - Reported game id
 * @param idOriginal - Original game id
 * @returns An id of 36 characters
 */
export const remixReportId = async ( idGame : string, idOriginal : string ) : Promise<string> => `irr.${( await _sha256( `${idGame}|${idOriginal}` ) ).slice( 0, 32 )}`;
