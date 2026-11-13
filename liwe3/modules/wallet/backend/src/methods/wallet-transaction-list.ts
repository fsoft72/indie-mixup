import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { WalletTransaction } from '../types';

/**
 * Schema for Return transaction history for a specific wallet with pagination support.

Transactions are returned in descending order (newest first) by default.

Optional filters:
- `transaction_type`: Filter by 'credit', 'debit', or 'transfer'
- `date_start` / `date_end`: Filter by date range

**Required permissions:** Logged-in user (owns wallet) or `wallet.admin`
 *
 * @property {string} id_wallet - Wallet ID (required)
 * @property {[number]} offset - Pagination offset
 * @property {[number]} limit - Pagination limit (max results per page)
 * @property {[string]} transaction_type - Filter by transaction type: 'credit', 'debit', 'transfer'
 * @property {[string]} date_start - Filter transactions from this date
 * @property {[string]} date_end - Filter transactions until this date
 */
const WalletTransactionListSchema = z.object( {
	id_wallet: z.string(),
	offset: z.coerce.number().optional().default( 0 ),
	limit: z.coerce.number().optional().default( 50 ),
	transaction_type: z.string().optional(),
	date_start: z.coerce.date().optional(),
	date_end: z.coerce.date().optional(),
} );

/** Parameters for wallet_transaction_list */
export type WalletTransactionListParams = z.infer<typeof WalletTransactionListSchema>;

/*=== f2c_start wallet_transaction_list_headers ===*/
import { has_perms } from '@backend/liwe3';
import { desc, gte, lte } from 'drizzle-orm';
import { wallet_transactions, wallet_wallets } from '../schema';
import { WALLET_PERM_ADMIN } from '../perms';
import { WalletTransferResult } from '../types';
/*=== f2c_end wallet_transaction_list_headers ===*/

/**
 * Return transaction history for a specific wallet with pagination support.
 *
 * Transactions are returned in descending order (newest first) by default.
 *
 * Optional filters:
 * - `transaction_type`: Filter by 'credit', 'debit', or 'transfer'
 * - `date_start` / `date_end`: Filter by date range
 *
 * **Required permissions:** Logged-in user (owns wallet) or `wallet.admin`
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {WalletTransactionListParams} params - Request parameters
 * @param {string} params.id_wallet - Wallet ID
 * @param {number} ?params.offset - Pagination offset
 * @param {number} ?params.limit - Pagination limit (max results per page)
 * @param {string} ?params.transaction_type - Filter by transaction type: 'credit', 'debit', 'transfer'
 * @param {string} ?params.date_start - Filter transactions from this date
 * @param {string} ?params.date_end - Filter transactions until this date
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<WalletTransaction[]>>} Result object with success status and data or error details
 */
export const wallet_transaction_list = async ( ctx : LiWECtx, params : WalletTransactionListParams, sys? : LiWESysParams ) : Promise<LiWEResponse<WalletTransaction[]>> => {
	const validation = paramsValidation<WalletTransactionListParams>( WalletTransactionListSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_wallet, offset, limit, transaction_type, date_start, date_end } = validation.data;

	/*=== f2c_start wallet_transaction_list ===*/
	// User authentication check
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

	try {
		// First, verify the wallet exists and user has access to it
		const wallet = await ctx.app.db
			.select()
			.from( wallet_wallets )
			.where( and(
				eq( wallet_wallets.id, id_wallet ),
				eq( wallet_wallets.domain, user.domain ?? '_' ),
			) )
			.get();

		if ( !wallet ) return responseError( 'Wallet not found', 404, 'WALLET_NOT_FOUND' );

		// Check if user owns the wallet OR has admin permission
		const hasAdminPerm = await has_perms( ctx, [ WALLET_PERM_ADMIN ] );
		if ( wallet.id_user !== user.id && !hasAdminPerm ) {
			return responseError( 'Permission denied', 403, 'PERMISSION_DENIED' );
		}

		// Build query conditions dynamically
		const conditions = [
			eq( wallet_transactions.domain, user.domain ?? '_' ),
			eq( wallet_transactions.id_wallet, id_wallet ),
		];

		// Add optional filters
		if ( transaction_type !== undefined ) {
			conditions.push( eq( wallet_transactions.transaction_type, transaction_type ) );
		}
		if ( date_start !== undefined ) {
			conditions.push( gte( wallet_transactions.created, date_start ) );
		}
		if ( date_end !== undefined ) {
			conditions.push( lte( wallet_transactions.created, date_end ) );
		}

		// Query transactions with filters, pagination, and sorting
		const transactions = await ctx.app.db
			.select()
			.from( wallet_transactions )
			.where( and( ...conditions ) )
			.orderBy( desc( wallet_transactions.created ) )
			.limit( limit )
			.offset( offset );

		// Convert to result type
		const result : WalletTransaction[] = transactions.map( ( txn ) => ( {
			id: txn.id,
			domain: txn.domain,
			id_wallet: txn.id_wallet,
			id_user: txn.id_user,
			transaction_type: txn.transaction_type,
			amount: txn.amount,
			balance_before: txn.balance_before,
			balance_after: txn.balance_after,
			description: txn.description,
			id_related_transaction: txn.id_related_transaction ?? undefined,
			metadata: txn.metadata ?? undefined,
			created: txn.created,
			updated: txn.updated,
		} ) );

		return responseSuccess( result );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to list transactions: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end wallet_transaction_list ===*/
};
