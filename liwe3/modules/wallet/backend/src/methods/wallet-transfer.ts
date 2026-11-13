import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { WalletTransferResult } from '../types';

/**
 * Schema for Transfer funds from one wallet to another.

Both wallets must:
- Belong to the same domain
- Use the same currency_code
- Source wallet must have sufficient balance

Creates two transaction records (debit from source, credit to destination) for complete audit trail.

**Required permissions:** `wallet.transfer`
 *
 * @property {string} id_wallet_from - Source wallet ID (required)
 * @property {string} id_wallet_to - Destination wallet ID (required)
 * @property {number} amount - Amount to transfer (must be positive, precision 1000) (required)
 * @property {string} description - Transfer description (required)
 * @property {[string]} metadata - Optional transfer metadata
 */
const WalletTransferSchema = z.object( {
	id_wallet_from: z.string(),
	id_wallet_to: z.string(),
	amount: z.coerce.number(),
	description: z.string(),
	metadata: z.any().optional(),
} );

/** Parameters for wallet_transfer */
export type WalletTransferParams = z.infer<typeof WalletTransferSchema>;

/*=== f2c_start wallet_transfer_headers ===*/
import { has_perms, liwe_event_emit, mkid } from '@backend/liwe3';
import { sql } from 'drizzle-orm';
import { wallet_transactions, wallet_wallets } from '../schema';
import { WALLET_PERM_TRANSFER } from '../perms';
import { WALLET_EVENT_TRANSFER } from '../events';
import { WalletTransaction } from '../types';
/*=== f2c_end wallet_transfer_headers ===*/

/**
 * Transfer funds from one wallet to another.
 *
 * Both wallets must:
 * - Belong to the same domain
 * - Use the same currency_code
 * - Source wallet must have sufficient balance
 *
 * Creates two transaction records (debit from source, credit to destination) for complete audit trail.
 *
 * **Required permissions:** `wallet.transfer`
 *
 * @permissions wallet.transfer
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {WalletTransferParams} params - Request parameters
 * @param {string} params.id_wallet_from - Source wallet ID
 * @param {string} params.id_wallet_to - Destination wallet ID
 * @param {number} params.amount - Amount to transfer (must be positive, precision 1000)
 * @param {string} params.description - Transfer description
 * @param {string} ?params.metadata - Optional transfer metadata
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<WalletTransferResult>>} Result object with success status and data or error details
 */
export const wallet_transfer = async ( ctx : LiWECtx, params : WalletTransferParams, sys? : LiWESysParams ) : Promise<LiWEResponse<WalletTransferResult>> => {
	const validation = paramsValidation<WalletTransferParams>( WalletTransferSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_wallet_from, id_wallet_to, amount, description, metadata } = validation.data;

	/*=== f2c_start wallet_transfer ===*/
	// User authentication check
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

	// Permission check
	if ( !( await has_perms( ctx, [ WALLET_PERM_TRANSFER ] ) ) ) {
		return responseError( 'Permission denied', 403, 'PERMISSION_DENIED' );
	}

	// Validate amount is positive
	if ( amount <= 0 ) {
		return responseError( 'Amount must be positive', 400, 'INVALID_AMOUNT' );
	}

	// Validate source and destination are different
	if ( id_wallet_from === id_wallet_to ) {
		return responseError( 'Cannot transfer to the same wallet', 400, 'SAME_WALLET' );
	}

	try {
		// Query both wallets with domain filtering
		let walletFrom = await ctx.app.db
			.select()
			.from( wallet_wallets )
			.where( and(
				eq( wallet_wallets.id, id_wallet_from ),
				eq( wallet_wallets.domain, user.domain ?? '_' ),
			) )
			.get();

		if ( !walletFrom ) return responseError( 'Source wallet not found', 404, 'SOURCE_WALLET_NOT_FOUND' );

		let walletTo = await ctx.app.db
			.select()
			.from( wallet_wallets )
			.where( and(
				eq( wallet_wallets.id, id_wallet_to ),
				eq( wallet_wallets.domain, user.domain ?? '_' ),
			) )
			.get();

		if ( !walletTo ) return responseError( 'Destination wallet not found', 404, 'DESTINATION_WALLET_NOT_FOUND' );

		// Validate both wallets are active
		if ( !walletFrom.is_active ) {
			return responseError( 'Source wallet is not active', 400, 'SOURCE_WALLET_INACTIVE' );
		}
		if ( !walletTo.is_active ) {
			return responseError( 'Destination wallet is not active', 400, 'DESTINATION_WALLET_INACTIVE' );
		}

		// Validate both wallets use the same currency
		if ( walletFrom.currency_code !== walletTo.currency_code ) {
			return responseError( 'Wallets must use the same currency', 400, 'CURRENCY_MISMATCH' );
		}

		// Atomic dual-wallet transfer: the two balance UPDATEs and the two audit-trail
		// INSERTs run in a SINGLE D1 batch, so a DB error or worker crash can never leave
		// balances moved without the matching pair of wallet_transactions rows.
		// Every statement is guarded, so a concurrent change to either wallet turns the
		// whole batch into a no-op and we retry:
		//  - each UPDATE requires this wallet's balance AND (via EXISTS) the other wallet's
		//    balance to still match what we read;
		//  - each INSERT ... SELECT reads from wallet_wallets and only yields its row once
		//    the matching UPDATE has landed (it checks the post-transfer balance).
		const WALLET_BALANCE_MAX_RETRIES = 5;
		const debitTransactionId = mkid( 'wtxn' );
		const creditTransactionId = mkid( 'wtxn' );
		let balanceFromBefore = 0;
		let balanceFromAfter = 0;
		let balanceToBefore = 0;
		let balanceToAfter = 0;
		let updated = false;

		for ( let attempt = 0; attempt < WALLET_BALANCE_MAX_RETRIES; attempt++ ) {
			if ( attempt > 0 ) {
				walletFrom = await ctx.app.db
					.select()
					.from( wallet_wallets )
					.where( and(
						eq( wallet_wallets.id, id_wallet_from ),
						eq( wallet_wallets.domain, user.domain ?? '_' ),
					) )
					.get();

				if ( !walletFrom ) return responseError( 'Source wallet not found', 404, 'SOURCE_WALLET_NOT_FOUND' );

				walletTo = await ctx.app.db
					.select()
					.from( wallet_wallets )
					.where( and(
						eq( wallet_wallets.id, id_wallet_to ),
						eq( wallet_wallets.domain, user.domain ?? '_' ),
					) )
					.get();

				if ( !walletTo ) return responseError( 'Destination wallet not found', 404, 'DESTINATION_WALLET_NOT_FOUND' );
			}

			// Validate source wallet has sufficient balance
			if ( walletFrom.balance < amount ) {
				return responseError( 'Insufficient balance in source wallet', 400, 'INSUFFICIENT_BALANCE' );
			}

			balanceFromBefore = walletFrom.balance;
			balanceFromAfter = balanceFromBefore - amount;
			balanceToBefore = walletTo.balance;
			balanceToAfter = balanceToBefore + amount;

			const debitDescription = `Transfer to ${walletTo.name}: ${description}`;
			const creditDescription = `Transfer from ${walletFrom.name}: ${description}`;
			const metadataJson = metadata ? JSON.stringify( metadata ) : null;

			const [ fromUpdateResult, toUpdateResult ] = await ctx.app.db.batch( [
				ctx.app.db
					.update( wallet_wallets )
					.set( { balance: balanceFromAfter } )
					.where( and(
						eq( wallet_wallets.id, id_wallet_from ),
						eq( wallet_wallets.balance, balanceFromBefore ),
						sql`EXISTS (SELECT 1 FROM wallet_wallets WHERE id = ${id_wallet_to} AND balance = ${balanceToBefore})`,
					) )
					.returning( { id: wallet_wallets.id } ),
				ctx.app.db
					.update( wallet_wallets )
					.set( { balance: balanceToAfter } )
					.where( and(
						eq( wallet_wallets.id, id_wallet_to ),
						eq( wallet_wallets.balance, balanceToBefore ),
						sql`EXISTS (SELECT 1 FROM wallet_wallets WHERE id = ${id_wallet_from} AND balance = ${balanceFromAfter})`,
					) )
					.returning( { id: wallet_wallets.id } ),
				// Debit audit row: emitted only if the source-wallet UPDATE above landed
				// (post-transfer balance check), so a lost CAS race writes no phantom rows.
				ctx.app.db
					.insert( wallet_transactions )
					.select(
						ctx.app.db
							.select( {
								id: sql<string>`${debitTransactionId}`.as( 'id' ),
								domain: sql<string>`${user.domain ?? '_'}`.as( 'domain' ),
								id_wallet: sql<string>`${walletFrom.id}`.as( 'id_wallet' ),
								id_user: sql<string>`${walletFrom.id_user}`.as( 'id_user' ),
								transaction_type: sql<string>`'debit'`.as( 'transaction_type' ),
								amount: sql<number>`${amount}`.as( 'amount' ),
								balance_before: sql<number>`${balanceFromBefore}`.as( 'balance_before' ),
								balance_after: sql<number>`${balanceFromAfter}`.as( 'balance_after' ),
								description: sql<string>`${debitDescription}`.as( 'description' ),
								id_related_transaction: sql<string>`${creditTransactionId}`.as( 'id_related_transaction' ),
								metadata: sql<string>`${metadataJson}`.as( 'metadata' ),
							} )
							.from( wallet_wallets )
							.where( and(
								eq( wallet_wallets.id, id_wallet_from ),
								eq( wallet_wallets.balance, balanceFromAfter ),
							) ),
					),
				// Credit audit row: same guard against the destination-wallet UPDATE.
				ctx.app.db
					.insert( wallet_transactions )
					.select(
						ctx.app.db
							.select( {
								id: sql<string>`${creditTransactionId}`.as( 'id' ),
								domain: sql<string>`${user.domain ?? '_'}`.as( 'domain' ),
								id_wallet: sql<string>`${walletTo.id}`.as( 'id_wallet' ),
								id_user: sql<string>`${walletTo.id_user}`.as( 'id_user' ),
								transaction_type: sql<string>`'credit'`.as( 'transaction_type' ),
								amount: sql<number>`${amount}`.as( 'amount' ),
								balance_before: sql<number>`${balanceToBefore}`.as( 'balance_before' ),
								balance_after: sql<number>`${balanceToAfter}`.as( 'balance_after' ),
								description: sql<string>`${creditDescription}`.as( 'description' ),
								id_related_transaction: sql<string>`${debitTransactionId}`.as( 'id_related_transaction' ),
								metadata: sql<string>`${metadataJson}`.as( 'metadata' ),
							} )
							.from( wallet_wallets )
							.where( and(
								eq( wallet_wallets.id, id_wallet_to ),
								eq( wallet_wallets.balance, balanceToAfter ),
							) ),
					),
			] );

			if ( fromUpdateResult.length > 0 && toUpdateResult.length > 0 ) {
				updated = true;
				break;
			}
		}

		if ( !updated ) {
			return responseError( 'Wallet balance changed concurrently, please retry', 409, 'CONCURRENT_UPDATE' );
		}

		// Shape the persisted rows for the response (both were written inside the batch above).
		// Create debit transaction record (from source wallet)
		const debitTransaction = {
			id: debitTransactionId,
			domain: user.domain ?? '_',
			id_wallet: walletFrom.id,
			id_user: walletFrom.id_user,
			transaction_type: 'debit',
			amount,
			balance_before: balanceFromBefore,
			balance_after: balanceFromAfter,
			description: `Transfer to ${walletTo.name}: ${description}`,
			id_related_transaction: creditTransactionId,
			metadata: metadata ?? null,
		};

		// Create credit transaction record (to destination wallet)
		const creditTransaction = {
			id: creditTransactionId,
			domain: user.domain ?? '_',
			id_wallet: walletTo.id,
			id_user: walletTo.id_user,
			transaction_type: 'credit',
			amount,
			balance_before: balanceToBefore,
			balance_after: balanceToAfter,
			description: `Transfer from ${walletFrom.name}: ${description}`,
			id_related_transaction: debitTransactionId,
			metadata: metadata ?? null,
		};

		// Prepare result
		const result : WalletTransferResult = {
			success: true,
			debit_transaction: {
				id: debitTransaction.id,
				domain: debitTransaction.domain,
				id_wallet: debitTransaction.id_wallet,
				id_user: debitTransaction.id_user,
				transaction_type: debitTransaction.transaction_type,
				amount: debitTransaction.amount,
				balance_before: debitTransaction.balance_before,
				balance_after: debitTransaction.balance_after,
				description: debitTransaction.description,
				id_related_transaction: debitTransaction.id_related_transaction ?? undefined,
				metadata: debitTransaction.metadata ?? undefined,
			},
			credit_transaction: {
				id: creditTransaction.id,
				domain: creditTransaction.domain,
				id_wallet: creditTransaction.id_wallet,
				id_user: creditTransaction.id_user,
				transaction_type: creditTransaction.transaction_type,
				amount: creditTransaction.amount,
				balance_before: creditTransaction.balance_before,
				balance_after: creditTransaction.balance_after,
				description: creditTransaction.description,
				id_related_transaction: creditTransaction.id_related_transaction ?? undefined,
				metadata: creditTransaction.metadata ?? undefined,
			},
		};

		// Emit event BEFORE responseSuccess
		await liwe_event_emit( ctx, WALLET_EVENT_TRANSFER, {
			id_wallet_from: walletFrom.id,
			id_wallet_to: walletTo.id,
			id_transaction_debit: debitTransactionId,
			id_transaction_credit: creditTransactionId,
			domain: user.domain ?? '_',
			amount,
			currency_code: walletFrom.currency_code,
			description,
		} );

		return responseSuccess( result );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to transfer funds: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end wallet_transfer ===*/
};
