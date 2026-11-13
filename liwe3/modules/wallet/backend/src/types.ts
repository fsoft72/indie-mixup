import { z } from 'zod';
import { zodBoolean } from '@backend/liwe3';

/*=== f2c_start __types ===*/

// Add custom imports or types here
/*=== f2c_end __types ===*/

/**
 * Schema for Wallet
 *
 * @property {str} id - Wallet unique ID (required, max 64 chars)
 * @property {str} domain - Domain this wallet belongs to (required, max 64 chars)
 * @property {str} id_user - User ID who owns this wallet (required, max 64 chars)
 * @property {str} name - Wallet display name (required, max 255 chars)
 * @property {str} currency_code - Currency or points type code (e.g., 'USD', 'POINTS', 'CREDITS') (required, max 16 chars)
 * @property {num} balance - Current wallet balance (precision 1000) (required)
 * @property {[str]} description - Optional wallet description
 * @property {bool} is_active - Whether the wallet is active (required)
 * @property {[none]} metadata - Optional metadata for the wallet
 * @property {datetime} created - Wallet created date (required)
 * @property {datetime} updated - Wallet updated date (required)
 */
const ZWallet = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	domain: z.string().max( 64, 'Domain must be at most 64 characters' ),
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	name: z.string().max( 255, 'Name must be at most 255 characters' ),
	currency_code: z.string().max( 16, 'Currency_code must be at most 16 characters' ),
	balance: z.coerce.number(),
	description: z.string().optional(),
	is_active: zodBoolean.default( false ),
	metadata: z.any().optional(),
	created: z.coerce.date(),
	updated: z.coerce.date(),
} );

export type Wallet = z.infer<typeof ZWallet>;
export { ZWallet };

/**
 * Schema for WalletTransaction
 *
 * @property {str} id - Transaction unique ID (required, max 64 chars)
 * @property {str} domain - Domain this transaction belongs to (required, max 64 chars)
 * @property {str} id_wallet - Wallet ID this transaction belongs to (required, max 64 chars)
 * @property {str} id_user - User ID who owns the wallet (required, max 64 chars)
 * @property {str} transaction_type - Transaction type: 'credit', 'debit', 'transfer' (required, max 16 chars)
 * @property {num} amount - Transaction amount (always positive, precision 1000) (required)
 * @property {num} balance_before - Wallet balance before transaction (precision 1000) (required)
 * @property {num} balance_after - Wallet balance after transaction (precision 1000) (required)
 * @property {str} description - Transaction description (required)
 * @property {[str]} id_related_transaction - Related transaction ID (for transfers) (max 64 chars)
 * @property {[none]} metadata - Optional transaction metadata
 * @property {datetime} created - WalletTransaction created date (required)
 * @property {datetime} updated - WalletTransaction updated date (required)
 */
const ZWalletTransaction = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	domain: z.string().max( 64, 'Domain must be at most 64 characters' ),
	id_wallet: z.string().max( 64, 'Id_wallet must be at most 64 characters' ),
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	transaction_type: z.string().max( 16, 'Transaction_type must be at most 16 characters' ),
	amount: z.coerce.number(),
	balance_before: z.coerce.number(),
	balance_after: z.coerce.number(),
	description: z.string(),
	id_related_transaction: z.string().max( 64, 'Id_related_transaction must be at most 64 characters' ).optional(),
	metadata: z.any().optional(),
	created: z.coerce.date(),
	updated: z.coerce.date(),
} );

export type WalletTransaction = z.infer<typeof ZWalletTransaction>;
export { ZWalletTransaction };

/**
 * Schema for WalletTransferResult
 *
 * @property {bool} success - Whether transfer succeeded (required)
 * @property {WalletTransaction} debit_transaction - Debit transaction from source wallet (required)
 * @property {WalletTransaction} credit_transaction - Credit transaction to destination wallet (required)
 */
const ZWalletTransferResult = z.object( {
	success: zodBoolean.default( false ),
	debit_transaction: z.any(),
	credit_transaction: z.any(),
} );

export type WalletTransferResult = z.infer<typeof ZWalletTransferResult>;
export { ZWalletTransferResult };

/**
 * Schema for WalletBalance
 *
 * @property {str} id_wallet - Wallet ID (required)
 * @property {num} balance - Current balance (precision 1000) (required)
 * @property {str} currency_code - Currency or points type code (required)
 */
const ZWalletBalance = z.object( {
	id_wallet: z.string(),
	balance: z.coerce.number(),
	currency_code: z.string(),
} );

export type WalletBalance = z.infer<typeof ZWalletBalance>;
export { ZWalletBalance };
