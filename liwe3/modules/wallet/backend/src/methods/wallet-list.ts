import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { Wallet } from '../types';

/**
 * Schema for Return a list of all wallets belonging to the authenticated user.

Optional filters:
- `currency_code`: Filter by specific currency/points type
- `is_active`: Filter by active/inactive status

Results are sorted by creation date (newest first) by default.

**Required permissions:** Logged-in user
 *
 * @property {[string]} currency_code - Filter by currency code
 * @property {[boolean]} is_active - Filter by active status
 */
const WalletListSchema = z.object( {
	currency_code: z.string().optional(),
	is_active: zodBoolean.optional(),
} );

/** Parameters for wallet_list */
export type WalletListParams = z.infer<typeof WalletListSchema>;

/*=== f2c_start wallet_list_headers ===*/
import { desc } from 'drizzle-orm';
import { wallet_wallets } from '../schema';
/*=== f2c_end wallet_list_headers ===*/

/**
 * Return a list of all wallets belonging to the authenticated user.
 *
 * Optional filters:
 * - `currency_code`: Filter by specific currency/points type
 * - `is_active`: Filter by active/inactive status
 *
 * Results are sorted by creation date (newest first) by default.
 *
 * **Required permissions:** Logged-in user
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {WalletListParams} params - Request parameters
 * @param {string} ?params.currency_code - Filter by currency code
 * @param {boolean} ?params.is_active - Filter by active status
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<Wallet[]>>} Result object with success status and data or error details
 */
export const wallet_list = async ( ctx : LiWECtx, params : WalletListParams, sys? : LiWESysParams ) : Promise<LiWEResponse<Wallet[]>> => {
	const validation = paramsValidation<WalletListParams>( WalletListSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { currency_code, is_active } = validation.data;

	/*=== f2c_start wallet_list ===*/
	// User authentication check
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

	try {
		// Build query conditions dynamically
		const conditions = [
			eq( wallet_wallets.domain, user.domain ?? '_' ),
			eq( wallet_wallets.id_user, user.id ),
		];

		// Add optional filters
		if ( currency_code !== undefined ) {
			conditions.push( eq( wallet_wallets.currency_code, currency_code ) );
		}
		if ( is_active !== undefined && is_active !== null ) {
			conditions.push( eq( wallet_wallets.is_active, is_active ) );
		}

		// Query wallets with filters and sorting
		const wallets = await ctx.app.db
			.select()
			.from( wallet_wallets )
			.where( and( ...conditions ) )
			.orderBy( desc( wallet_wallets.created ) );

		// Convert to result type
		const result : Wallet[] = wallets.map( ( wallet ) => ( {
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
		} ) );

		return responseSuccess( result );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Failed to list wallets: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end wallet_list ===*/
};
