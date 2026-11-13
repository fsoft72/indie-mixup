import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { Wallet } from '../types';

/**
 * Schema for Create a new wallet for the authenticated user.

Each wallet has a unique currency/points type identifier, a name for easy recognition, and an optional description.
The initial balance is set to 0 by default.

**Required permissions:** `wallet.create`
 *
 * @property {string} name - Wallet display name (required)
 * @property {string} currency_code - Currency or points type code (e.g., 'USD', 'POINTS', 'CREDITS') (required)
 * @property {[string]} description - Optional wallet description
 * @property {[string]} metadata - Optional metadata for the wallet
 */
const WalletCreateSchema = z.object( {
	name: z.string(),
	currency_code: z.string(),
	description: z.string().optional(),
	metadata: z.any().optional(),
} );

/** Parameters for wallet_create */
export type WalletCreateParams = z.infer<typeof WalletCreateSchema>;

/*=== f2c_start wallet_create_headers ===*/
import { has_perms, liwe_event_emit, mkid } from '@backend/liwe3';
import { wallet_wallets } from '../schema';
import { WALLET_PERM_CREATE } from '../perms';
import { WALLET_EVENT_CREATE } from '../events';
/*=== f2c_end wallet_create_headers ===*/

/**
 * Create a new wallet for the authenticated user.
 *
 * Each wallet has a unique currency/points type identifier, a name for easy recognition, and an optional description.
 * The initial balance is set to 0 by default.
 *
 * **Required permissions:** `wallet.create`
 *
 * @permissions wallet.create
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {WalletCreateParams} params - Request parameters
 * @param {string} params.name - Wallet display name
 * @param {string} params.currency_code - Currency or points type code (e.g., 'USD', 'POINTS', 'CREDITS')
 * @param {string} ?params.description - Optional wallet description
 * @param {string} ?params.metadata - Optional metadata for the wallet
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<Wallet>>} Result object with success status and data or error details
 */
export const wallet_create = async ( ctx : LiWECtx, params : WalletCreateParams, sys? : LiWESysParams ) : Promise<LiWEResponse<Wallet>> => {
	const validation = paramsValidation<WalletCreateParams>( WalletCreateSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { name, currency_code, description, metadata } = validation.data;

	/*=== f2c_start wallet_create ===*/
	// User authentication check
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

	// Permission check
	if ( !( await has_perms( ctx, [ WALLET_PERM_CREATE ] ) ) ) {
		return responseError( 'Permission denied', 403, 'PERMISSION_DENIED' );
	}

	try {
		// Create new wallet record
		const newWallet = {
			id: mkid( 'wall' ),
			domain: user.domain ?? '_',
			id_user: user.id,
			name,
			currency_code,
			balance: 0, // Initial balance is always 0
			description: description ?? null,
			is_active: true, // New wallets are active by default
			metadata: metadata ?? null,
		};

		// Insert into database
		await ctx.app.db.insert( wallet_wallets ).values( newWallet ).run();

		// Retrieve the created record
		const created = await ctx.app.db
			.select()
			.from( wallet_wallets )
			.where( eq( wallet_wallets.id, newWallet.id ) )
			.get();

		if ( !created ) return responseError( 'Failed to create wallet', 500, 'CREATION_ERROR' );

		// Convert to result type
		const result : Wallet = {
			id: created.id,
			domain: created.domain,
			id_user: created.id_user,
			name: created.name,
			currency_code: created.currency_code,
			balance: created.balance,
			description: created.description ?? undefined,
			is_active: created.is_active,
			metadata: created.metadata ?? undefined,
			created: created.created,
			updated: created.updated,
		};

		// Emit event BEFORE responseSuccess
		await liwe_event_emit( ctx, WALLET_EVENT_CREATE, {
			id: result.id,
			domain: user.domain ?? '_',
			id_user: user.id,
			currency_code: result.currency_code,
			name: result.name,
		} );

		return responseSuccess( result );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to create wallet: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end wallet_create ===*/
};
