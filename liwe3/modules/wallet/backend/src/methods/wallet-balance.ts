import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { WalletBalance } from '../types';

/**
 * Schema for Return the current balance for a specific wallet.

This is a lightweight endpoint that only returns the balance value without full wallet details.

**Required permissions:** Logged-in user (owns wallet) or `wallet.admin`
 *
 * @property {string} id - Wallet ID (required)
 */
const WalletBalanceSchema = z.object( {
	id: z.string(),
} );

/** Parameters for wallet_balance */
export type WalletBalanceParams = z.infer<typeof WalletBalanceSchema>;

/*=== f2c_start wallet_balance_headers ===*/
import { has_perms } from '@backend/liwe3';
import { wallet_wallets } from '../schema';
import { WALLET_PERM_ADMIN } from '../perms';
/*=== f2c_end wallet_balance_headers ===*/

/**
 * Return the current balance for a specific wallet.
 *
 * This is a lightweight endpoint that only returns the balance value without full wallet details.
 *
 * **Required permissions:** Logged-in user (owns wallet) or `wallet.admin`
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {WalletBalanceParams} params - Request parameters
 * @param {string} params.id - Wallet ID
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<WalletBalance>>} Result object with success status and data or error details
 */
export const wallet_balance = async ( ctx : LiWECtx, params : WalletBalanceParams, sys? : LiWESysParams ) : Promise<LiWEResponse<WalletBalance>> => {
	const validation = paramsValidation<WalletBalanceParams>( WalletBalanceSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id } = validation.data;

	/*=== f2c_start wallet_balance ===*/
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

		// Return balance information
		const result : WalletBalance = {
			id_wallet: wallet.id,
			balance: wallet.balance,
			currency_code: wallet.currency_code,
		};

		return responseSuccess( result );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to get wallet balance: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end wallet_balance ===*/
};
