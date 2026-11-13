import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User } from '../types';

/**
 * Schema for This endpoint is used to create a new admin, without using the interface.
This is a dangerous endpoint that can be disabled by settings.

 *
 * @property {string} username - Admin username (required)
 * @property {string} password - Admin password (required)
 * @property {string} key - Secret admin operations key (required)
 */
const UserCreateAdminSchema = z.object( {
	username: z.string(),
	password: z.string(),
	key: z.string(),
} );

/** Parameters for user_create_admin */
export type UserCreateAdminParams = z.infer<typeof UserCreateAdminSchema>;

/*=== f2c_start user_create_admin_headers ===*/
import { email_normalize } from './utils';
import { users } from '../schema';
import { mkid } from '@backend/liwe3';
import { hashPassword } from '@backend/liwe3/src/crypto';
/*=== f2c_end user_create_admin_headers ===*/

/**
 * This endpoint is used to create a new admin, without using the interface.
 * This is a dangerous endpoint that can be disabled by settings.
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserCreateAdminParams} params - Request parameters
 * @param {string} params.username - Admin username
 * @param {string} params.password - Admin password
 * @param {string} params.key - Secret admin operations key
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User>>} Result object with success status and data or error details
 */
export const user_create_admin = async ( ctx : LiWECtx, params : UserCreateAdminParams, sys? : LiWESysParams ) : Promise<LiWEResponse<User>> => {
	const validation = paramsValidation<UserCreateAdminParams>( UserCreateAdminSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { username, password, key } = validation.data;

	/*=== f2c_start user_create_admin ===*/
	try {
		if ( key != ctx.app.cfg.site.adminKey ) return responseError( 'Invalid admin key', 403, 'INVALID_ADMIN_KEY' );

		// Check if username already exists
		const existingUser = await ctx.app.db.select().from( users ).where( eq( users.username, username ) ).get();
		if ( existingUser ) return responseError( 'Username already exists', 409, 'USER_EXISTS' );

		// Create admin user data
		const adminUserData : User = {
			id: mkid( 'user' ),
			domain: 'system',
			username: username,
			password: await hashPassword( password ),
			password_changed_at: Date.now(),
			perms: [ 'system.admin' ] as any,
			email: email_normalize( `${username}@example.com` ),
			enabled: true,
			level: 100,
			name: 'Admin',
			lastname: 'User',
			email_verified: true,
			two_factor_enabled: false,
			password_expired: false,
		};

		// Insert admin user into database
		await ctx.app.db.insert( users ).values( adminUserData ).run();
		const user = await ctx.app.db.select().from( users ).where( eq( users.id, adminUserData.id! ) ).get();

		if ( !user ) return responseError( 'Admin user creation failed', 500 );

		// Return user data without sensitive fields
		user.password = null;
		return responseSuccess( user as any );
	} catch ( error ) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during admin user creation';
		return responseError( errorMessage, 500, 'ADMIN_CREATION_ERROR' );
	}
	/*=== f2c_end user_create_admin ===*/
};
