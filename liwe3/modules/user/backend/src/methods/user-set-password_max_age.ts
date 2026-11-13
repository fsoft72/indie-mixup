import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User } from '../types';

/**
 * Schema for Sets the number of days after which the user must change the password. 0 means the password never expires for this user, a missing `days` clears the value so the global cfg.user.passwordMaxAgeDays applies. Same permission and multi-tenant rules as /user/set/password.
 *
 * @property {string} id - User ID (required)
 * @property {[number]} days - Days after which the password expires. 0: never. Missing: use the global default
 */
const UserSetPasswordMaxAgeSchema = z.object( {
	id: z.string(),
	days: z.coerce.number().optional(),
} );

/** Parameters for user_set_password_max_age */
export type UserSetPasswordMaxAgeParams = z.infer<typeof UserSetPasswordMaxAgeSchema>;

/*=== f2c_start user_set_password_max_age_headers ===*/
import { users } from '../schema';
import { ERR_DB_ERROR, capabilities } from '@backend/liwe3';

// Upper bound, ten years: anything above is a typo
const MAX_PASSWORD_MAX_AGE_DAYS = 3650;
/*=== f2c_end user_set_password_max_age_headers ===*/

/**
 * Sets the number of days after which the user must change the password. 0 means the password never expires for this user, a missing `days` clears the value so the global cfg.user.passwordMaxAgeDays applies. Same permission and multi-tenant rules as /user/set/password.
 *
 * @permissions user.password
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserSetPasswordMaxAgeParams} params - Request parameters
 * @param {string} params.id - User ID
 * @param {number} ?params.days - Days after which the password expires. 0: never. Missing: use the global default
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User>>} Result object with success status and data or error details
 */
export const user_set_password_max_age = async ( ctx : LiWECtx, params : UserSetPasswordMaxAgeParams, sys? : LiWESysParams ) : Promise<LiWEResponse<User>> => {
	const validation = paramsValidation<UserSetPasswordMaxAgeParams>( UserSetPasswordMaxAgeSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id, days } = validation.data;

	/*=== f2c_start user_set_password_max_age ===*/

	// The schema above coerces a null `days` to 0 (never expires): read the raw value and treat null as "clear"
	const clear = days === undefined || ( params as { days? : number | null } ).days === null;

	if ( !clear && ( !Number.isInteger( days ) || days! < 0 || days! > MAX_PASSWORD_MAX_AGE_DAYS ) ) {
		return responseError( `days must be an integer between 0 and ${MAX_PASSWORD_MAX_AGE_DAYS}`, 400, 'INVALID_PASSWORD_MAX_AGE' );
	}

	try {
		// authorization (user.password) is on the route gate, see index.ts
		const caller = sys?.skip_permissions_check ? null : await ctx.user();
		if ( !sys?.skip_permissions_check && !caller ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );

		const existingUser = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
		if ( !existingUser ) return responseError( 'User not found', 404, 'USER_NOT_FOUND' );

		// Multi-tenant guard: only a 'system.admin' may cross domain boundaries
		if ( !sys?.skip_permissions_check ) {
			const cap = await capabilities( ctx, { crossDomain: [ 'system.admin' ] } );
			const sameDomain = ( caller?.domain ?? null ) === ( existingUser.domain ?? null );
			if ( !cap.crossDomain && !sameDomain ) return responseError( 'Cannot change a user outside your domain', 403, ERR_PERMISSION_DENIED );
		}

		// A missing (or null) `days` is NULL: the user follows the global cfg.user.passwordMaxAgeDays
		await ctx.app.db.update( users ).set( { password_max_age_days: clear ? null : days } ).where( eq( users.id, id ) ).run();

		const updatedUser = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
		if ( !updatedUser ) return responseError( 'Failed to retrieve updated user', 500, ERR_DB_ERROR );

		updatedUser.password = null;
		updatedUser.domain = null;
		return responseSuccess( updatedUser as any );
	} catch ( error ) {
		if ( error instanceof Error ) return responseError( `Database error: ${error.message}`, 500, ERR_DB_ERROR );
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_set_password_max_age ===*/
};
