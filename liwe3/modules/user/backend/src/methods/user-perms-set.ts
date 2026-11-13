import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User } from '../types';

/**
 * Schema for Set the permissions to the user.
Permissions are overwritten completely.
 *
 * @property {string} id_user - The user ID (required)
 * @property {string[]} perms - The perms to be set (required)
 */
const UserPermsSetSchema = z.object( {
	id_user: z.string(),
	perms: z.string().array(),
} );

/** Parameters for user_perms_set */
export type UserPermsSetParams = z.infer<typeof UserPermsSetSchema>;

/*=== f2c_start user_perms_set_headers ===*/
import { users } from '../schema';

import { ERR_DB_ERROR, capabilities, has_perms_sync, sessionListIds, sessionUpdateMetadata } from '@backend/liwe3';
import { USER_PERM_PERMS } from '../perms';

/**
 * Push a fresh permission set into every active KV session of a user.
 *
 * `ctx.user()` reads permissions from the session metadata snapshot taken at
 * login, not from the DB, so a permission change stays invisible to the
 * affected user until this runs (or the user logs in again). Best-effort: a
 * KV failure here must not fail the permission update itself.
 *
 * @param {LiWECtx} ctx - The request context (for `app.kv` and `app.name`)
 * @param {string} id_user - The user whose sessions must be refreshed
 * @param {string[]} perms - The new permission set to store on each session
 * @returns {Promise<void>}
 */
const _propagate_perms_to_sessions = async ( ctx : LiWECtx, id_user : string, perms : string[] ) : Promise<void> => {
	try {
		const session_ids = await sessionListIds( ctx.app.kv, id_user );
		if ( !session_ids.length ) return;

		await Promise.all(
			session_ids.map( ( sid ) => sessionUpdateMetadata( ctx.app.kv, ctx.app.name, sid, { perms } ) ),
		);
	} catch ( error ) {
		const msg = error instanceof Error ? error.message : String( error );
		console.warn( `user_perms_set: could not refresh active sessions for ${id_user}: ${msg}` );
	}
};
/*=== f2c_end user_perms_set_headers ===*/

/**
 * Set the permissions to the user.
 * Permissions are overwritten completely.
 *
 * @permissions user.perms
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserPermsSetParams} params - Request parameters
 * @param {string} params.id_user - The user ID
 * @param {string[]} params.perms - The perms to be set
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User>>} Result object with success status and data or error details
 */
export const user_perms_set = async ( ctx : LiWECtx, params : UserPermsSetParams, sys? : LiWESysParams ) : Promise<LiWEResponse<User>> => {
	const validation = paramsValidation<UserPermsSetParams>( UserPermsSetSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_user, perms } = validation.data;

	/*=== f2c_start user_perms_set ===*/
	try {
		if ( !sys?.skip_permissions_check ) {
			const user = await ctx.user();
			if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );

			// authorization is on the route gate (see index.ts)
		}

		// Check if user exists
		const existingUser = await ctx.app.db.select().from( users ).where( eq( users.id, id_user ) ).get();
		if ( !existingUser ) {
			return responseError( 'User not found', 404, 'USER_NOT_FOUND' );
		}

		// Multi-tenant guard + privilege-escalation guard. Only a 'system.admin'
		// may cross domain boundaries or hand out 'system.*' permissions. Everyone
		// else may only rewrite the perms of a user of their own domain, must
		// actually hold 'user.perms' (defense in depth on top of the route gate),
		// and cannot escalate anyone - not even a domain admin - to a system role.
		// No owner carve-out here on purpose: self-editing perms is the escalation
		// path we are closing.
		if ( !sys?.skip_permissions_check ) {
			const cap = await capabilities( ctx, { crossDomain: [ 'system.admin' ] } );

			if ( !cap.crossDomain ) {
				const caller = await ctx.user();
				const sameDomain = ( caller?.domain ?? null ) === ( existingUser.domain ?? null );

				if ( !sameDomain ) return responseError( 'Cannot set permissions for a user outside your domain', 403, ERR_PERMISSION_DENIED );
				if ( !has_perms_sync( caller, [ USER_PERM_PERMS ] ) ) return responseError( 'Not allowed to set user permissions', 403, ERR_PERMISSION_DENIED );
				if ( perms.some( ( p : string ) => p.startsWith( 'system.' ) ) ) return responseError( 'Cannot grant system-level permissions', 403, ERR_PERMISSION_DENIED );
			}
		}

		// Update user permissions in database (permissions will be stored as JSON array)
		await ctx.app.db
			.update( users )
			.set( {
				perms,
			} )
			.where( eq( users.id, id_user ) )
			.run();

		// Fetch updated user data
		const updatedUser = await ctx.app.db.select().from( users ).where( eq( users.id, id_user ) ).get();
		if ( !updatedUser ) return responseError( 'Failed to retrieve updated user', 500, ERR_DB_ERROR );

		// Make the new perms effective immediately for any already-logged-in session
		await _propagate_perms_to_sessions( ctx, id_user, perms );

		// Return user data without sensitive fields
		updatedUser.password = null;
		updatedUser.domain = null;
		return responseSuccess( updatedUser as any );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Database error: ${error.message}`, 500, 'DATABASE_ERROR' );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_perms_set ===*/
};
