import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { WalletBalance } from '../types';

/**
 * Schema for Credit (add) funds to a wallet. Creates a transaction record for audit trail.

The `amount` must be positive. A transaction description and optional metadata can be included for record-keeping.

**Required permissions:** `wallet.transact`
 *
 * @property {string} id_wallet - Wallet ID to credit (required)
 * @property {number} amount - Amount to credit (must be positive, precision 1000) (required)
 * @property {string} description - Transaction description (required)
 * @property {[string]} metadata - Optional transaction metadata
 */
const WalletCreditSchema = z.object( {
	id_wallet: z.string(),
	amount: z.coerce.number(),
	description: z.string(),
	metadata: z.any().optional(),
} );

/** Parameters for wallet_credit */
export type WalletCreditParams = z.infer<typeof WalletCreditSchema>;

/*=== f2c_start wallet_credit_headers ===*/
import { has_perms, liwe_event_emit, mkid } from '@backend/liwe3';
import { wallet_transactions, wallet_wallets } from '../schema';
import { WALLET_PERM_TRANSACT } from '../perms';
import { WALLET_EVENT_CREDIT } from '../events';
/*=== f2c_end wallet_credit_headers ===*/

/**
 * Credit (add) funds to a wallet. Creates a transaction record for audit trail.
 *
 * The `amount` must be positive. A transaction description and optional metadata can be included for record-keeping.
 *
 * **Required permissions:** `wallet.transact`
 *
 * @permissions wallet.transact
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {WalletCreditParams} params - Request parameters
 * @param {string} params.id_wallet - Wallet ID to credit
 * @param {number} params.amount - Amount to credit (must be positive, precision 1000)
 * @param {string} params.description - Transaction description
 * @param {string} ?params.metadata - Optional transaction metadata
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<WalletBalance>>} Result object with success status and data or error details
 */
export const wallet_credit = async ( ctx : LiWECtx, params : WalletCreditParams, sys? : LiWESysParams ) : Promise<LiWEResponse<WalletBalance>> => {
	const validation = paramsValidation<WalletCreditParams>( WalletCreditSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_wallet, amount, description, metadata } = validation.data;

	/*=== f2c_start wallet_credit ===*/
	// User authentication check
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

	// Permission check
	if ( !( await has_perms( ctx, [ WALLET_PERM_TRANSACT ] ) ) ) {
		return responseError( 'Permission denied', 403, 'PERMISSION_DENIED' );
	}

	// Validate amount is positive
	if ( amount <= 0 ) {
		return responseError( 'Amount must be positive', 400, 'INVALID_AMOUNT' );
	}

	try {
		// Query the wallet with domain filtering
		let wallet = await ctx.app.db
			.select()
			.from( wallet_wallets )
			.where( and(
				eq( wallet_wallets.id, id_wallet ),
				eq( wallet_wallets.domain, user.domain ?? '_' ),
			) )
			.get();

		if ( !wallet ) return responseError( 'Wallet not found', 404, 'WALLET_NOT_FOUND' );

		// Check if wallet is active
		if ( !wallet.is_active ) {
			return responseError( 'Wallet is not active', 400, 'WALLET_INACTIVE' );
		}

		// Optimistic-locked balance update: retry on concurrent modification.
		// The UPDATE only applies if the balance still matches what we just read
		// (balance = balanceBefore), so a concurrent debit/credit/transfer on the
		// same wallet cannot silently overwrite this one (lost update).
		const WALLET_BALANCE_MAX_RETRIES = 5;
		let balanceBefore = 0;
		let balanceAfter = 0;
		let updated = false;

		for ( let attempt = 0; attempt < WALLET_BALANCE_MAX_RETRIES; attempt++ ) {
			if ( attempt > 0 ) {
				wallet = await ctx.app.db
					.select()
					.from( wallet_wallets )
					.where( and(
						eq( wallet_wallets.id, id_wallet ),
						eq( wallet_wallets.domain, user.domain ?? '_' ),
					) )
					.get();

				if ( !wallet ) return responseError( 'Wallet not found', 404, 'WALLET_NOT_FOUND' );
			}

			balanceBefore = wallet.balance;
			balanceAfter = balanceBefore + amount;

			const updateResult = await ctx.app.db
				.update( wallet_wallets )
				.set( { balance: balanceAfter } )
				.where( and(
					eq( wallet_wallets.id, id_wallet ),
					eq( wallet_wallets.balance, balanceBefore ),
				) )
				.returning( { id: wallet_wallets.id } );

			if ( updateResult.length > 0 ) {
				updated = true;
				break;
			}
		}

		if ( !updated ) {
			return responseError( 'Wallet balance changed concurrently, please retry', 409, 'CONCURRENT_UPDATE' );
		}

		// Create transaction record (safe now: the balance update above is confirmed applied)
		const transactionId = mkid( 'wtxn' );
		const newTransaction = {
			id: transactionId,
			domain: user.domain ?? '_',
			id_wallet: wallet.id,
			id_user: wallet.id_user,
			transaction_type: 'credit',
			amount,
			balance_before: balanceBefore,
			balance_after: balanceAfter,
			description,
			id_related_transaction: null,
			metadata: metadata ?? null,
		};

		await ctx.app.db
			.insert( wallet_transactions )
			.values( newTransaction );

		// Prepare result
		const result : WalletBalance = {
			id_wallet: wallet.id,
			balance: balanceAfter,
			currency_code: wallet.currency_code,
		};

		// Emit event BEFORE responseSuccess
		await liwe_event_emit( ctx, WALLET_EVENT_CREDIT, {
			id_wallet: wallet.id,
			id_transaction: transactionId,
			domain: user.domain ?? '_',
			id_user: wallet.id_user,
			amount,
			balance_before: balanceBefore,
			balance_after: balanceAfter,
			currency_code: wallet.currency_code,
		} );

		return responseSuccess( result );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to credit wallet: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end wallet_credit ===*/
};
