import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { Wallet } from '../types';

/**
 * Schema for Update wallet information such as name, description, or active status.

**Note:** Normal users can update their wallet information, while administrators have the ability to modify other users' wallet details as needed. This feature allows for easy customization and organization within the platform.

**Note:** Balance cannot be modified through this endpoint. Use credit/debit endpoints for balance changes.

**Required permissions:** `wallet.edit`
 *
 * @property {string} id - Wallet ID (required)
 * @property {[string]} name - New wallet name
 * @property {[string]} description - New wallet description
 * @property {[boolean]} is_active - Set wallet active status
 * @property {[string]} metadata - Update wallet metadata
 */
const WalletEditSchema = z.object( {
	id: z.string(),
	name: z.string().optional(),
	description: z.string().optional(),
	is_active: zodBoolean.optional(),
	metadata: z.any().optional(),
} );

/** Parameters for wallet_edit */
export type WalletEditParams = z.infer<typeof WalletEditSchema>;

/*=== f2c_start wallet_edit_headers ===*/
import { has_perms, liwe_event_emit } from '@backend/liwe3';
import { wallet_wallets } from '../schema';
import { WALLET_PERM_ADMIN, WALLET_PERM_EDIT } from '../perms';
import { WALLET_EVENT_UPDATE } from '../events';
/*=== f2c_end wallet_edit_headers ===*/

/**
 * Update wallet information such as name, description, or active status.
 *
 * **Note:** Normal users can update their wallet information, while administrators have the ability to modify other users' wallet details as needed. This feature allows for easy customization and organization within the platform.
 *
 * **Note:** Balance cannot be modified through this endpoint. Use credit/debit endpoints for balance changes.
 *
 * **Required permissions:** `wallet.edit`
 *
 * @permissions wallet.edit
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {WalletEditParams} params - Request parameters
 * @param {string} params.id - Wallet ID
 * @param {string} ?params.name - New wallet name
 * @param {string} ?params.description - New wallet description
 * @param {boolean} ?params.is_active - Set wallet active status
 * @param {string} ?params.metadata - Update wallet metadata
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<Wallet>>} Result object with success status and data or error details
 */
export const wallet_edit = async ( ctx : LiWECtx, params : WalletEditParams, sys? : LiWESysParams ) : Promise<LiWEResponse<Wallet>> => {
	const validation = paramsValidation<WalletEditParams>( WalletEditSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id, name, description, is_active, metadata } = validation.data;

	/*=== f2c_start wallet_edit ===*/
	// User authentication check
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

	// Permission check
	if ( !( await has_perms( ctx, [ WALLET_PERM_EDIT ] ) ) ) {
		return responseError( 'Permission denied', 403, 'PERMISSION_DENIED' );
	}

	try {
		// Query the wallet with domain filtering
		const wallet = await ctx.app.db
			.select()
			.from( wallet_wallets )
			.where( and(
				eq( wallet_wallets.id, id ),
				eq( wallet_wallets.domain, user.domain ?? '_' ),
			) )
			.get();

		if ( !wallet ) return responseError( 'Wallet not found', 404, 'WALLET_NOT_FOUND' );

		// Check if user owns the wallet OR has admin permission
		const hasAdminPerm = await has_perms( ctx, [ WALLET_PERM_ADMIN ] );
		if ( wallet.id_user !== user.id && !hasAdminPerm ) {
			return responseError( 'Permission denied', 403, 'PERMISSION_DENIED' );
		}

		// Build update object with only provided fields
		const updateData : Record<string, any> = {};
		if ( name !== undefined ) updateData.name = name;
		if ( description !== undefined ) updateData.description = description;
		if ( is_active !== undefined ) updateData.is_active = is_active;
		if ( metadata !== undefined ) updateData.metadata = metadata;

		// Check if there are any fields to update
		if ( Object.keys( updateData ).length === 0 ) {
			return responseError( 'No fields to update', 400, 'NO_UPDATES' );
		}

		// Update the wallet
		await ctx.app.db
			.update( wallet_wallets )
			.set( updateData )
			.where( eq( wallet_wallets.id, id ) )
			.run();

		// Retrieve the updated wallet
		const updated = await ctx.app.db
			.select()
			.from( wallet_wallets )
			.where( eq( wallet_wallets.id, id ) )
			.get();

		if ( !updated ) return responseError( 'Failed to retrieve updated wallet', 500, 'RETRIEVAL_ERROR' );

		// Convert to result type
		const result : Wallet = {
			id: updated.id,
			domain: updated.domain,
			id_user: updated.id_user,
			name: updated.name,
			currency_code: updated.currency_code,
			balance: updated.balance,
			description: updated.description ?? undefined,
			is_active: updated.is_active,
			metadata: updated.metadata ?? undefined,
			created: updated.created,
			updated: updated.updated,
		};

		// Emit event BEFORE responseSuccess
		await liwe_event_emit( ctx, WALLET_EVENT_UPDATE, {
			id: result.id,
			domain: user.domain ?? '_',
			id_user: result.id_user,
			updates: updateData,
		} );

		return responseSuccess( result );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to update wallet: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end wallet_edit ===*/
};
