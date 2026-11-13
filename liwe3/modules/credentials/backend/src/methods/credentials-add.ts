import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { CredentialsItem } from '../types';

/**
 * Schema for Add a new credentials to the system.
If `data_enc` is passed to the endpoint, it will be encoded in the system before being saved.
 *
 * @property {string} name - Credentials name (required)
 * @property {string} type - Credentials type (required)
 * @property {string} metadata - Credentials metadata (required)
 * @property {[string]} data_enc - Credentials data to be encoded
 */
const CredentialsAddSchema = z.object( {
	name: z.string(),
	type: z.string(),
	metadata: z.any(),
	data_enc: z.any().optional(),
} );

/** Parameters for credentials_add */
export type CredentialsAddParams = z.infer<typeof CredentialsAddSchema>;

/*=== f2c_start credentials_add_headers ===*/

import { encryptData, liwe_event_emit, mkid } from '@backend/liwe3';
import { credentials_items } from '../schema';

import { CREDENTIALS_EVENT_CREATE } from '../events';
/*=== f2c_end credentials_add_headers ===*/

/**
 * Add a new credentials to the system.
 * If `data_enc` is passed to the endpoint, it will be encoded in the system before being saved.
 *
 * @permissions credentials.create
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {CredentialsAddParams} params - Request parameters
 * @param {string} params.name - Credentials name
 * @param {string} params.type - Credentials type
 * @param {string} params.metadata - Credentials metadata
 * @param {string} ?params.data_enc - Credentials data to be encoded
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<CredentialsItem>>} Result object with success status and data or error details
 */
export const credentials_add = async ( ctx : LiWECtx, params : CredentialsAddParams, sys? : LiWESysParams ) : Promise<LiWEResponse<CredentialsItem>> => {
	const validation = paramsValidation<CredentialsAddParams>( CredentialsAddSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { name, type, metadata, data_enc } = validation.data;

	/*=== f2c_start credentials_add ===*/

	// User authentication check
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

	// authorization is on the route gate (see index.ts)

	try {
		// Encrypt data_enc if provided
		let encryptedData : string | undefined;
		if ( data_enc ) {
			const secret = ctx.app.cfg.site.secret;
			if ( !secret ) return responseError( 'Encryption secret not configured', 500, 'CONFIG_ERROR' );
			encryptedData = await encryptData( data_enc, secret );
		}

		// Create new credential record
		const newCredential = {
			id: mkid( 'cred' ),
			domain: user.domain ?? '_',
			id_owner: user.id,
			name,
			type,
			metadata,
			data_enc: encryptedData,
		};

		// Insert into database
		await ctx.app.db.insert( credentials_items ).values( newCredential ).run();

		// Retrieve the created record
		const created = await ctx.app.db
			.select()
			.from( credentials_items )
			.where( eq( credentials_items.id, newCredential.id ) )
			.get();

		if ( !created ) return responseError( 'Failed to retrieve created credential', 500, 'RETRIEVAL_ERROR' );

		// Convert to CredentialsItem type (handle null vs undefined for optional fields)
		const result : CredentialsItem = {
			id: created.id,
			domain: created.domain,
			id_owner: created.id_owner,
			name: created.name,
			type: created.type,
			metadata: created.metadata,
			data_enc: undefined, // Do not return encrypted data
		};

		await liwe_event_emit( ctx, CREDENTIALS_EVENT_CREATE, result );

		return responseSuccess( result );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to add credential: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end credentials_add ===*/
};
