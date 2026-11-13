import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Wallet table schema for Drizzle ORM
 */
export const wallet_wallets = sqliteTable( 'wallet_wallets', {
	// Wallet unique ID
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// Domain this wallet belongs to
	domain: text( 'domain', { length: 64 } ).notNull(),

	// User ID who owns this wallet
	id_user: text( 'id_user', { length: 64 } ).notNull(),

	// Wallet display name
	name: text( 'name', { length: 255 } ).notNull(),

	// Currency or points type code (e.g., 'USD', 'POINTS', 'CREDITS')
	currency_code: text( 'currency_code', { length: 16 } ).notNull(),

	// Current wallet balance (precision 1000)
	balance: integer( 'balance' ).notNull(),

	// Optional wallet description
	description: text( 'description' ),

	// Whether the wallet is active
	is_active: integer( 'is_active', { mode: 'boolean' } ).notNull().default( false ),

	// Optional metadata for the wallet
	metadata: text( 'metadata', { mode: 'json' } ).$type<any>(),

	// Wallet created date
	created: integer( 'created' ).notNull().$type<Date>().default( sql`CURRENT_TIMESTAMP` ),

	// Wallet updated date
	updated: integer( 'updated' ).notNull().$type<Date>().default( sql`CURRENT_TIMESTAMP` ),
}, ( table : any ) => [
	// Index on domain field for efficient domain-based queries
	index( 'idx_wallet_wallets_domain' ).on( table.domain ),

	// Index on id_user field for efficient id_user-based queries
	index( 'idx_wallet_wallets_id_user' ).on( table.id_user ),

	// Index on currency_code field for efficient currency_code-based queries
	index( 'idx_wallet_wallets_currency_code' ).on( table.currency_code ),

	// Index on is_active field for efficient is_active-based queries
	index( 'idx_wallet_wallets_is_active' ).on( table.is_active ),

	// Index on created field for sorting by creation date
	index( 'idx_wallet_wallets_created' ).on( table.created ),

	// Index on updated field for sorting by update date
	index( 'idx_wallet_wallets_updated' ).on( table.updated ),
] );

/**
 * Type inference for Wallet table select operations
 */
export type WalletDB = typeof wallet_wallets.$inferSelect;

/**
 * WalletTransaction table schema for Drizzle ORM
 */
export const wallet_transactions = sqliteTable( 'wallet_transactions', {
	// Transaction unique ID
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// Domain this transaction belongs to
	domain: text( 'domain', { length: 64 } ).notNull(),

	// Wallet ID this transaction belongs to
	id_wallet: text( 'id_wallet', { length: 64 } ).notNull(),

	// User ID who owns the wallet
	id_user: text( 'id_user', { length: 64 } ).notNull(),

	// Transaction type: 'credit', 'debit', 'transfer'
	transaction_type: text( 'transaction_type', { length: 16 } ).notNull(),

	// Transaction amount (always positive, precision 1000)
	amount: integer( 'amount' ).notNull(),

	// Wallet balance before transaction (precision 1000)
	balance_before: integer( 'balance_before' ).notNull(),

	// Wallet balance after transaction (precision 1000)
	balance_after: integer( 'balance_after' ).notNull(),

	// Transaction description
	description: text( 'description' ).notNull(),

	// Related transaction ID (for transfers)
	id_related_transaction: text( 'id_related_transaction', { length: 64 } ),

	// Optional transaction metadata
	metadata: text( 'metadata', { mode: 'json' } ).$type<any>(),

	// WalletTransaction created date
	created: integer( 'created' ).notNull().$type<Date>().default( sql`CURRENT_TIMESTAMP` ),

	// WalletTransaction updated date
	updated: integer( 'updated' ).notNull().$type<Date>().default( sql`CURRENT_TIMESTAMP` ),
}, ( table : any ) => [
	// Index on domain field for efficient domain-based queries
	index( 'idx_wallet_transactions_domain' ).on( table.domain ),

	// Index on id_wallet field for efficient id_wallet-based queries
	index( 'idx_wallet_transactions_id_wallet' ).on( table.id_wallet ),

	// Index on id_user field for efficient id_user-based queries
	index( 'idx_wallet_transactions_id_user' ).on( table.id_user ),

	// Index on transaction_type field for efficient transaction_type-based queries
	index( 'idx_wallet_transactions_transaction_type' ).on( table.transaction_type ),

	// Index on id_related_transaction field for efficient id_related_transaction-based queries
	index( 'idx_wallet_transactions_id_related_transaction' ).on( table.id_related_transaction ),

	// Index on created field for sorting by creation date
	index( 'idx_wallet_transactions_created' ).on( table.created ),

	// Index on updated field for sorting by update date
	index( 'idx_wallet_transactions_updated' ).on( table.updated ),
] );

/**
 * Type inference for WalletTransaction table select operations
 */
export type WalletTransactionDB = typeof wallet_transactions.$inferSelect;
