/**
 * @fileoverview Common utilities for user module methods
 */

// Core imports
export { LiWEApp, LiWEResponse, LiWESysParams, responseError, responseSuccess, zodBoolean } from '@backend/liwe3';
export type { LiWECtx } from '@backend/liwe3';

// Database operation imports
export { eq, and, ne, desc, asc, count, avg, sql, inArray, or, like, isNull } from 'drizzle-orm';

// Schema imports
// == Import your schema tables here

// Zod for validation
export { z } from 'zod';

/*=== f2c_start utils ===*/

import type { LiWEApp, LiWECtx } from '@backend/liwe3';
import { mkid, sha256 } from '@backend/liwe3';
import { eq, lt, sql } from 'drizzle-orm';
import { user_refresh_tokens, users } from '../schema';

/**
 * Normalises an email for storage and lookup: trimmed and lowercase. Every email is stored in this form, so the
 * lookups can compare the column directly and use the index on `users.email`.
 *
 * @param email - the email as typed, or null / undefined
 * @returns the normalised email, or an empty string when there is none
 */
export const email_normalize = ( email : string | null | undefined ) : string => ( email ?? '' ).trim().toLowerCase();

/** Grace window kept before a consumed/expired refresh-token row is collected. */
const REFRESH_TOKEN_GC_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Issues a refresh token: inserts a row storing only the sha256 hex digest of
 * the token and returns the cleartext value to hand back to the caller.
 *
 * @param {LiWECtx} ctx - The request context
 * @param {string} id_user - Owning user id
 * @param {number} expiresInSeconds - Lifetime of the token
 * @param {string} [familyId] - Rotation family to continue; omit to start a new one
 * @returns {Promise<string>} The cleartext refresh token
 */
export const refresh_token_issue = async ( ctx : LiWECtx, id_user : string, expiresInSeconds : number, familyId? : string ) : Promise<string> => {
	const token = mkid( 'refr' );
	const now = Date.now();

	await ctx.app.db.insert( user_refresh_tokens ).values( {
		id: mkid( 'urt' ),
		id_user,
		token_hash: await sha256( token ),
		family_id: familyId ?? mkid( 'urtf' ),
		expires_at: now + expiresInSeconds * 1000,
		used_at: null,
		created: now,
	} ).run();

	return token;
};

/**
 * Increments `users.token_version`, which invalidates every JWT already issued
 * for that user: `sessionResolve` rejects a JWT whose `tokenVersion` no longer
 * matches the stored one.
 *
 * @param {LiWECtx} ctx - The request context
 * @param {string} id_user - The user whose sessions must be invalidated
 */
export const bump_token_version = async ( ctx : LiWECtx, id_user : string ) : Promise<void> => {
	await ctx.app.db.update( users )
		.set( { token_version: sql`coalesce(${users.token_version}, 0) + 1` } )
		.where( eq( users.id, id_user ) )
		.run();
};

/**
 * Deletes refresh-token rows whose expiry is more than the grace window in the
 * past. Consumed-but-not-yet-expired rows are kept so a replay stays detectable.
 *
 * @param {LiWECtx} ctx - A context (typically a system ctx from the scheduled handler)
 * @returns {Promise<number>} Number of rows removed
 */
export const refresh_tokens_gc = async ( ctx : LiWECtx ) : Promise<number> => {
	const cutoff = Date.now() - REFRESH_TOKEN_GC_GRACE_MS;
	const res : any = await ctx.app.db.delete( user_refresh_tokens )
		.where( lt( user_refresh_tokens.expires_at, cutoff ) )
		.run();

	return res?.meta?.changes ?? 0;
};

/**
 * Merges two permission lists into a deduplicated union.
 * Never removes a permission present in `current`.
 *
 * @param {string[] | null | undefined} current - Existing permissions
 * @param {string[] | null | undefined} additional - Permissions to add
 * @returns {string[]} Deduplicated union of both lists
 */
export const union_perms = ( current : string[] | null | undefined, additional : string[] | null | undefined ) : string[] => {
	return Array.from( new Set( [ ...( current ?? [] ), ...( additional ?? [] ) ] ) );
};

/**
 * Resolves the tenant domain from the request's Host header, for pre-login
 * endpoints where no session/domain is available yet (e.g. OAuth authorize).
 *
 * `acme.sito.com` -> `acme`. Apex (`sito.com`) and `www.sito.com` fall back
 * to the system domain, same as `app.cfg.system.domain` elsewhere.
 *
 * @param {LiWEApp} app - The LiWE application instance (for the system domain fallback)
 * @param {string | undefined | null} host - The raw Host header value
 * @returns {string} The resolved tenant domain code
 */
export const resolveDomainFromHost = ( app : LiWEApp, host : string | undefined | null ) : string => {
	const systemDomain = app.cfg.system.domain ?? 'system';
	if ( !host ) return systemDomain;

	const hostname = host.split( ':' )[0];
	const labels = hostname.split( '.' );

	if ( labels.length < 3 || labels[0] === 'www' ) return systemDomain;

	return labels[0];
};
/*=== f2c_end utils ===*/
