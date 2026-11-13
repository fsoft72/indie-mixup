import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, can_act_on, paramsValidation } from '@backend/liwe3';

import { CredentialsItem } from '../types';

/**
 * Schema for Modify an existing credentials
 *
 * @property {string} id - Credentials ID (required)
 * @property {[string]} name - name parameter
 * @property {[string]} metadata - metadata parameter
 * @property {[string]} data_enc - data_enc parameter
 */
const CredentialsEditSchema = z.object( {
	id: z.string(),
	name: z.string().optional(),
	metadata: z.any().optional(),
	data_enc: z.any().optional(),
} );

/** Parameters for credentials_edit */
export type CredentialsEditParams = z.infer<typeof CredentialsEditSchema>;

/*=== f2c_start credentials_edit_headers ===*/

import { encryptData, liwe_event_emit } from '@backend/liwe3';
import { credentials_items } from '../schema';
import { CREDENTIALS_PERM_ADMIN, CREDENTIALS_PERM_CREATE } from '../perms';
/*=== f2c_end credentials_edit_headers ===*/

/**
 * Modify an existing credentials
 *
 * @permissions credentials.create
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {CredentialsEditParams} params - Request parameters
 * @param {string} params.id - Credentials ID
 * @param {string} ?params.name - name parameter
 * @param {string} ?params.metadata - metadata parameter
 * @param {string} ?params.data_enc - data_enc parameter
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<CredentialsItem>>} Result object with success status and data or error details
 */
export const credentials_edit = async ( ctx : LiWECtx, params : CredentialsEditParams, sys? : LiWESysParams ) : Promise<LiWEResponse<CredentialsItem>> => {
	const validation = paramsValidation<CredentialsEditParams>( CredentialsEditSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id, name, metadata, data_enc } = validation.data;

	/*=== f2c_start credentials_edit ===*/

	// User authentication and permission check
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

	// authorization is on the route gate (see index.ts)

	try {
		// Check if the credential exists and belongs to the user's domain
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
		// holding 'credentials.admin' / 'system.admin') may modify the credential.
		if ( !await can_act_on( ctx, [ CREDENTIALS_PERM_ADMIN ], existing.id_owner ) ) return responseError( 'Not allowed to modify this credential', 403, ERR_PERMISSION_DENIED );

		// Build update object with only provided fields
		const updateData : Record<string, any> = {};

		if ( name !== undefined ) updateData.name = name;
		if ( metadata !== undefined ) updateData.metadata = metadata;

		// Encrypt data_enc if provided
		if ( data_enc !== undefined ) {
			const secret = ctx.app.cfg.site.secret;
			if ( !secret ) return responseError( 'Encryption secret not configured', 500, 'CONFIG_ERROR' );
			updateData.data_enc = await encryptData( data_enc, secret );
		}

		// Update the credential
		await ctx.app.db
			.update( credentials_items )
			.set( updateData )
			.where( and(
				eq( credentials_items.id, id ),
				eq( credentials_items.domain, user.domain ?? '_' ),
			) )
			.run();

		// Retrieve the updated record
		const updated = await ctx.app.db
			.select()
			.from( credentials_items )
			.where( eq( credentials_items.id, id ) )
			.get();

		if ( !updated ) return responseError( 'Failed to retrieve updated credential', 500, 'RETRIEVAL_ERROR' );

		// Convert to CredentialsItem type (do not expose encrypted data)
		const result : CredentialsItem = {
			id: updated.id,
			domain: updated.domain,
			id_owner: updated.id_owner,
			name: updated.name,
			type: updated.type,
			metadata: updated.metadata,
			data_enc: undefined, // Do not return encrypted data
		};

		await liwe_event_emit( ctx, CREDENTIALS_PERM_CREATE, result );

		return responseSuccess( result );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to update credential: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end credentials_edit ===*/
};
