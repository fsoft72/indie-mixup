import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { CredentialsItem } from '../types';

/**
 * Schema for List all available credentials
 *
 * @property {[string]} type - Filter credentials by type
 */
const CredentialsListSchema = z.object( {
	type: z.string().optional(),
} );

/** Parameters for credentials_list */
export type CredentialsListParams = z.infer<typeof CredentialsListSchema>;

/*=== f2c_start credentials_list_headers ===*/

import { credentials_items } from '../schema';
/*=== f2c_end credentials_list_headers ===*/

/**
 * List all available credentials
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {CredentialsListParams} params - Request parameters
 * @param {string} ?params.type - Filter credentials by type
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<CredentialsItem>>} Result object with success status and data or error details
 */
export const credentials_list = async ( ctx : LiWECtx, params : CredentialsListParams, sys? : LiWESysParams ) : Promise<LiWEResponse<CredentialsItem>> => {
	const validation = paramsValidation<CredentialsListParams>( CredentialsListSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { type } = validation.data;

	/*=== f2c_start credentials_list ===*/

	// User authentication check
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

	try {
		// Build query conditions
		const conditions = [ eq( credentials_items.domain, user.domain ?? '_' ) ];

		// Add type filter if provided
		if ( type ) {
			conditions.push( eq( credentials_items.type, type ) );
		}

		// Query credentials
		const items = await ctx.app.db
			.select()
			.from( credentials_items )
			.where( and( ...conditions ) );

		// Map to CredentialsItem type without exposing encrypted data
		const results : CredentialsItem[] = items.map( ( item ) => ( {
			id: item.id,
			domain: item.domain,
			id_owner: item.id_owner,
			name: item.name,
			type: item.type,
			metadata: item.metadata,
			data_enc: undefined, // Do not return encrypted data
		} ) );

		return responseSuccess( results as any );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to list credentials: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end credentials_list ===*/
};
