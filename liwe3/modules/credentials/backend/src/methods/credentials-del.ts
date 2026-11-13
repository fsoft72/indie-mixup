import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, can_act_on, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Delete a credentials
 *
 * @property {string} id - Credentials id (required)
 */
const CredentialsDelSchema = z.object( {
	id: z.string(),
} );

/** Parameters for credentials_del */
export type CredentialsDelParams = z.infer<typeof CredentialsDelSchema>;

/*=== f2c_start credentials_del_headers ===*/

import { credentials_items } from '../schema';
import { liwe_event_emit } from '@backend/liwe3';
import { CREDENTIALS_PERM_ADMIN } from '../perms';

import { CREDENTIALS_EVENT_DELETE } from '../events';
/*=== f2c_end credentials_del_headers ===*/

/**
 * Delete a credentials
 *
 * @permissions credentials.delete
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {CredentialsDelParams} params - Request parameters
 * @param {string} params.id - Credentials id
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const credentials_del = async ( ctx : LiWECtx, params : CredentialsDelParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<CredentialsDelParams>( CredentialsDelSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id } = validation.data;

	/*=== f2c_start credentials_del ===*/

	// User authentication check
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

	// authorization is on the route gate (see index.ts)

	try {
		// Load the credential first, scoped to the caller's domain.
		const existing = await ctx.app.db
			.select()
			.from( credentials_items )
			.where( and(
				eq( credentials_items.id, id ),
				eq( credentials_items.domain, user.domain ?? '_' ),
			) )
			.get();

		if ( !existing ) return responseError( 'Credential not found', 404, 'NOT_FOUND' );

		// Ownership isolation: within the domain, only the owner (or a caller
		// holding 'credentials.admin' / 'system.admin') may delete the credential.
		if ( !await can_act_on( ctx, [ CREDENTIALS_PERM_ADMIN ], existing.id_owner ) ) return responseError( 'Not allowed to delete this credential', 403, ERR_PERMISSION_DENIED );

		// Delete the credential
		await ctx.app.db
			.delete( credentials_items )
			.where( and(
				eq( credentials_items.id, id ),
				eq( credentials_items.domain, user.domain ?? '_' ),
			) )
			.run();

		await liwe_event_emit( ctx, CREDENTIALS_EVENT_DELETE, { id } );

		return responseSuccess( true );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to delete credential: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end credentials_del ===*/
};
