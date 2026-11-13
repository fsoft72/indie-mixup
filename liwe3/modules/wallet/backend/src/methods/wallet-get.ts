import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { Wallet } from '../types';

/**
 * Schema for Retrieve detailed information about a specific wallet.

Users can only access their own wallets unless they have `wallet.admin` permission.

**Required permissions:** Logged-in user (owns wallet) or `wallet.admin`
 *
 * @property {string} id - Wallet ID (required)
 */
const WalletGetSchema = z.object( {
	id: z.string(),
} );

/** Parameters for wallet_get */
export type WalletGetParams = z.infer<typeof WalletGetSchema>;

/*=== f2c_start wallet_get_headers ===*/
import { has_perms } from '@backend/liwe3';
import { wallet_wallets } from '../schema';
import { WALLET_PERM_ADMIN } from '../perms';
/*=== f2c_end wallet_get_headers ===*/

/**
 * Retrieve detailed information about a specific wallet.
 *
 * Users can only access their own wallets unless they have `wallet.admin` permission.
 *
 * **Required permissions:** Logged-in user (owns wallet) or `wallet.admin`
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {WalletGetParams} params - Request parameters
 * @param {string} params.id - Wallet ID
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<Wallet>>} Result object with success status and data or error details
 */
export const wallet_get = async ( ctx : LiWECtx, params : WalletGetParams, sys? : LiWESysParams ) : Promise<LiWEResponse<Wallet>> => {
	const validation = paramsValidation<WalletGetParams>( WalletGetSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id } = validation.data;

	/*=== f2c_start wallet_get ===*/
	// User authentication check
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

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

		// Convert to result type
		const result : Wallet = {
			id: wallet.id,
			domain: wallet.domain,
			id_user: wallet.id_user,
			name: wallet.name,
			currency_code: wallet.currency_code,
			balance: wallet.balance,
			description: wallet.description ?? undefined,
			is_active: wallet.is_active,
			metadata: wallet.metadata ?? undefined,
			created: wallet.created,
			updated: wallet.updated,
		};

		return responseSuccess( result );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to get wallet: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end wallet_get ===*/
};
