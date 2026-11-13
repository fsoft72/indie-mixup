import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User } from '../types';

/**
 * Schema for List all users in the system
 *
 * @property {[number]} offset - Pagination start row
 * @property {[number]} limit - Pagination rows to return
 */
const UserListSchema = z.object( {
	offset: z.coerce.number().optional(),
	limit: z.coerce.number().optional(),
} );

/** Parameters for user_list */
export type UserListParams = z.infer<typeof UserListSchema>;

/*=== f2c_start user_list_headers ===*/
import { users } from '../schema';

import { capabilities } from '@backend/liwe3';
/*=== f2c_end user_list_headers ===*/

/**
 * List all users in the system
 *
 * @permissions user.list
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserListParams} params - Request parameters
 * @param {number} ?params.offset - Pagination start row
 * @param {number} ?params.limit - Pagination rows to return
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User[]>>} Result object with success status and data or error details
 */
export const user_list = async ( ctx : LiWECtx, params : UserListParams, sys? : LiWESysParams ) : Promise<LiWEResponse<User[]>> => {
	const validation = paramsValidation<UserListParams>( UserListSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { offset, limit } = validation.data;

	/*=== f2c_start user_list ===*/
	const u = await ctx.user();

	if ( !u ) return responseError( 'User not authenticated', 401, ERR_UNAUTHORIZED );

	// authorization is on the route gate (see index.ts)

	let query = ctx.app.db.select().from( users );

	// scope widening (case C): a system admin sees every domain, everyone else
	// only their own. Fixes the previous `||` that wrongly restricted an admin
	// whose domain was not literally 'system'.
	const cap = await capabilities( ctx, { seeAllDomains: [ 'system.admin' ] } );
	if ( !cap.seeAllDomains ) query.where( eq( users.domain, u.domain ?? '--' ) );

	let realLimit : number | undefined = limit;
	if ( offset !== undefined && limit === undefined ) realLimit = 100; // Default limit when offset is provided

	// add offset and limit if provided
	if ( offset !== undefined ) query = query.offset( offset ) as any;
	if ( limit !== undefined ) query = query.limit( limit ?? realLimit ) as any;

	const users_list = await query.all();

	return responseSuccess( users_list as any );
	/*=== f2c_end user_list ===*/
};
