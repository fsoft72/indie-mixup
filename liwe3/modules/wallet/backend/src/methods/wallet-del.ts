import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Permanently delete a wallet and all its transaction history.

**Warning:** This action cannot be undone. Consider deactivating the wallet instead if you need to preserve history.

**Required permissions:** `wallet.delete`
 *
 * @property {string} id - Wallet ID to delete (required)
 */
const WalletDelSchema = z.object( {
	id: z.string(),
} );

/** Parameters for wallet_del */
export type WalletDelParams = z.infer<typeof WalletDelSchema>;

/*=== f2c_start wallet_del_headers ===*/
import { has_perms, liwe_event_emit } from '@backend/liwe3';
import { wallet_transactions, wallet_wallets } from '../schema';
import { WALLET_PERM_DELETE } from '../perms';
import { WALLET_EVENT_DELETE } from '../events';
/*=== f2c_end wallet_del_headers ===*/

/**
 * Permanently delete a wallet and all its transaction history.
 *
 * **Warning:** This action cannot be undone. Consider deactivating the wallet instead if you need to preserve history.
 *
 * **Required permissions:** `wallet.delete`
 *
 * @permissions wallet.delete
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {WalletDelParams} params - Request parameters
 * @param {string} params.id - Wallet ID to delete
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const wallet_del = async ( ctx : LiWECtx, params : WalletDelParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<WalletDelParams>( WalletDelSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id } = validation.data;

	/*=== f2c_start wallet_del ===*/
	// User authentication check
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

	// Permission check
	if ( !( await has_perms( ctx, [ WALLET_PERM_DELETE ] ) ) ) {
		return responseError( 'Permission denied', 403, 'PERMISSION_DENIED' );
	}

	try {
		// Query the wallet with domain filtering to ensure it exists and belongs to the domain
		const wallet = await ctx.app.db
			.select()
			.from( wallet_wallets )
			.where( and(
				eq( wallet_wallets.id, id ),
				eq( wallet_wallets.domain, user.domain ?? '_' ),
			) )
			.get();

		if ( !wallet ) return responseError( 'Wallet not found', 404, 'WALLET_NOT_FOUND' );

		// Delete wallet and all its transactions atomically
		await ctx.app.db.batch( [
			ctx.app.db
				.delete( wallet_transactions )
				.where( eq( wallet_transactions.id_wallet, id ) ),
			ctx.app.db
				.delete( wallet_wallets )
				.where( eq( wallet_wallets.id, id ) ),
		] );

		// Emit event BEFORE responseSuccess
		await liwe_event_emit( ctx, WALLET_EVENT_DELETE, {
			id: wallet.id,
			domain: user.domain ?? '_',
			id_user: wallet.id_user,
			currency_code: wallet.currency_code,
			name: wallet.name,
		} );

		return responseSuccess( true );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to delete wallet: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end wallet_del ===*/
};
