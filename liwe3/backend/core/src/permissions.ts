import { z } from 'zod';
import type { LiWECtx } from './ctx';
import type { LiWEUser } from './types';

export const SystemPermissionSchema = z.object( {
	name: z.string().min( 3 ).max( 100 ),
	description: z.string().min( 3 ).max( 255 ),
} );

export type SystemPermission = z.infer<typeof SystemPermissionSchema>;

export const SystemPermissionsRegisterSchema = z.object( {
	module: z.string().min( 3 ).max( 100 ),
	perms: z.array( SystemPermissionSchema ).min( 1 ),
} );

export type SystemPermissionsRegisterParams = z.infer<typeof SystemPermissionsRegisterSchema>;

// Global permissions registry to store module permissions
// This will be populated by modules calling system_permissions_register
const PERMISSIONS_REGISTRY : Record<string, SystemPermission[]> = {};

/**
 * Register permissions for a module
 *
 * This function is called by every module during the initialization phase.
 * The module calls this function to pass its permissions and descriptions to the system.
 *
 * This data is consumed by `/system/admin/permissions/list` endpoint
 *
 * @param {string} module - The module name
 * @returns {boolean} - Success status
 */
export const permissions_register = ( _params : SystemPermissionsRegisterParams ) : boolean => {
	const validation = SystemPermissionsRegisterSchema.safeParse( _params );
	if ( !validation.success ) {
		console.error( `=== System: Failed to register permissions for module '${_params.module}': ${validation.error.message}` );
		return false;
	}

	const params = validation.data;
	PERMISSIONS_REGISTRY[params.module] = [ ...params.perms ];

	console.log( `    - Registered ${Object.keys( params.perms ).length} permissions for module '${params.module}'` );

	return true;
};

export const permissions_list_full = () : Record<string, SystemPermission[]> => {
	return PERMISSIONS_REGISTRY;
};

/**
 * Permission check against an already-resolved user. Same rules as `has_perms`,
 * without the `await ctx.user()`: use it when the user is already in hand and
 * several checks are needed (see `capabilities`).
 *
 * @param user - the resolved user, or null
 * @param perms - permission names; caller passes at least one
 * @returns true if the user satisfies at least one of `perms`
 */
export const has_perms_sync = ( user : LiWEUser | null, perms : string[] ) : boolean => {
	if ( !perms || !Array.isArray( perms ) || perms.length === 0 ) return false;

	// 'public' / 'anyone' pass regardless of the user
	if ( perms.includes( 'public' ) || perms.includes( 'anyone' ) ) return true;

	if ( !user ) return false;

	const user_perms = user.perms;
	if ( !user_perms || !Array.isArray( user_perms ) ) return false;

	// system.admin is the wildcard
	if ( user_perms.includes( 'system.admin' ) ) return true;

	// 'logged' / 'is-logged' pass for any authenticated user with at least one perm
	if ( perms.includes( 'logged' ) || perms.includes( 'is-logged' ) ) return user_perms.length > 0;

	return perms.some( ( perm ) => user_perms!.includes( perm ) );
};

/**
 * Check whether the current user has at least one of the given permissions.
 *
 * @param {LiWECtx} ctx - The request context holding the current user
 * @param {string[]} perms - Permission names to check
 * @returns {Promise<boolean>} True if the user satisfies at least one
 */
export const has_perms = async ( ctx : LiWECtx, perms : string[] ) : Promise<boolean> => {
	// ctx.user() is memoized per request, so this never triggers a second KV fetch
	return has_perms_sync( await ctx.user(), perms );
};

/**
 * Resolves several capabilities in one pass, reusing the memoized session.
 * Makes code that behaves differently per permission read like a decision table
 * rather than a chain of `has_perms` awaits.
 *
 * @param ctx - the request context
 * @param spec - map of capability name -> the permissions that grant it
 * @returns map of the same keys -> boolean
 *
 * @example
 * const cap = await capabilities( ctx, { seeAllDomains: [ 'system.admin' ] } );
 * if ( !cap.seeAllDomains ) query.where( eq( users.domain, u.domain ) );
 */
export const capabilities = async <T extends Record<string, string[]>>( ctx : LiWECtx, spec : T ) : Promise<Record<keyof T, boolean>> => {
	const user = await ctx.user();
	const out = {} as Record<keyof T, boolean>;
	for ( const key of Object.keys( spec ) as Array<keyof T> ) {
		out[key] = has_perms_sync( user, spec[key] );
	}
	return out;
};

/**
 * Authorization for the recurring "has the permission OR owns the resource"
 * pattern. The gate on the route is only the necessary minimum; this is the
 * in-method decision once the row (and its owner) is known.
 *
 * @param ctx - the request context
 * @param perms - permissions that grant the action to a non-owner
 * @param ownerId - the resource owner's user id (null/undefined when unknown)
 * @returns true when the caller owns the resource or holds one of `perms`
 */
export const can_act_on = async ( ctx : LiWECtx, perms : string[], ownerId? : string | null ) : Promise<boolean> => {
	const user = await ctx.user();
	if ( !user ) return false;
	if ( ownerId && ownerId === user.id ) return true;
	return has_perms_sync( user, perms );
};
