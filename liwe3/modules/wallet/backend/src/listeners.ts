/**
 * @fileoverview Wallet event listeners.
 *
 * Registers the `wallet.call.*` callable handlers other modules use to
 * read/mutate a user's points wallet by `id_user`, without needing to
 * know the wallet's own id. Each user has at most one points wallet per
 * domain (currency_code = WALLET_POINTS_CURRENCY), created lazily on
 * first balance lookup, credit, or debit.
 */

import { type LiWECtx, liwe_event_emit, liwe_event_register, mkid, responseError, responseSuccess } from '@backend/liwe3';
import { and, eq, gte } from 'drizzle-orm';
import { wallet_transactions, wallet_wallets } from './schema';
import { WALLET_EVENT_CREDIT, WALLET_EVENT_DEBIT } from './events';

/** Currency code used for the points wallet other modules (e.g. m3wallet) transact against */
const WALLET_POINTS_CURRENCY = 'POINTS';
const WALLET_POINTS_NAME = 'Points wallet';

/**
 * Finds the user's points wallet for the given domain, creating it
 * (with a zero balance) if it doesn't exist yet.
 */
const _findOrCreatePointsWallet = async ( ctx : LiWECtx, id_user : string, domain : string ) => {
	const existing = await ctx.app.db.select().from( wallet_wallets ).where( and(
		eq( wallet_wallets.domain, domain ),
		eq( wallet_wallets.id_user, id_user ),
		eq( wallet_wallets.currency_code, WALLET_POINTS_CURRENCY ),
	) ).get();

	if ( existing ) return existing;

	const newWallet = {
		id: mkid( 'wall' ),
		domain,
		id_user,
		name: WALLET_POINTS_NAME,
		currency_code: WALLET_POINTS_CURRENCY,
		balance: 0,
		description: null,
		is_active: true,
		metadata: null,
	};

	await ctx.app.db.insert( wallet_wallets ).values( newWallet ).run();

	const created = await ctx.app.db.select().from( wallet_wallets ).where( eq( wallet_wallets.id, newWallet.id ) ).get();

	return created!;
};

/**
 * Initializes wallet event listeners.
 *
 * Registers:
 * - `wallet.call.balance.get` -- returns `{ balance }` for the user's points wallet
 * - `wallet.call.credit` -- credits the user's points wallet, returns `{ id_wallet, balance, currency_code }`
 * - `wallet.call.debit` -- debits the user's points wallet, returns `{ id_wallet, balance, currency_code }`
 * - `wallet.call.users.above_balance` -- returns `{ users: [{ id_user, balance, iban }] }` for the domain's points wallets
 */
export const listeners_init = () => {
	console.log( '    - wallet listeners' );

	liwe_event_register( 'wallet.call.balance.get', async ( ctx : LiWECtx, event_data : any ) => {
		const { id_user, domain } = event_data;
		if ( !id_user ) return responseError( 'Missing id_user', 400, 'MISSING_PARAM' );

		try {
			const wallet = await _findOrCreatePointsWallet( ctx, id_user, domain || '_' );
			return responseSuccess( { balance: wallet.balance } );
		} catch ( error ) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			console.error( `Wallet listener error (balance.get): ${msg}` );
			return responseError( msg, 500 );
		}
	} );

	liwe_event_register( 'wallet.call.credit', async ( ctx : LiWECtx, event_data : any ) => {
		const { id_user, amount, domain, description } = event_data;
		if ( !id_user ) return responseError( 'Missing id_user', 400, 'MISSING_PARAM' );
		if ( typeof amount !== 'number' || amount <= 0 ) return responseError( 'Amount must be positive', 400, 'INVALID_AMOUNT' );

		try {
			const d = domain || '_';
			const wallet = await _findOrCreatePointsWallet( ctx, id_user, d );

			const balance_before = wallet.balance;
			const balance_after = balance_before + amount;

			await ctx.app.db.update( wallet_wallets )
				.set( { balance: balance_after } )
				.where( eq( wallet_wallets.id, wallet.id ) )
				.run();

			const transactionId = mkid( 'wtxn' );

			await ctx.app.db.insert( wallet_transactions ).values( {
				id: transactionId,
				domain: d,
				id_wallet: wallet.id,
				id_user,
				transaction_type: 'credit',
				amount,
				balance_before,
				balance_after,
				description: description || 'Credit via wallet.call.credit',
				id_related_transaction: null,
				metadata: null,
			} ).run();

			await liwe_event_emit( ctx, WALLET_EVENT_CREDIT, {
				id_wallet: wallet.id,
				id_transaction: transactionId,
				domain: d,
				id_user,
				amount,
				balance_before,
				balance_after,
				currency_code: wallet.currency_code,
			} );

			return responseSuccess( { id_wallet: wallet.id, balance: balance_after, currency_code: wallet.currency_code } );
		} catch ( error ) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			console.error( `Wallet listener error (credit): ${msg}` );
			return responseError( msg, 500 );
		}
	} );

	liwe_event_register( 'wallet.call.debit', async ( ctx : LiWECtx, event_data : any ) => {
		const { id_user, amount, domain, description } = event_data;
		if ( !id_user ) return responseError( 'Missing id_user', 400, 'MISSING_PARAM' );
		if ( typeof amount !== 'number' || amount <= 0 ) return responseError( 'Amount must be positive', 400, 'INVALID_AMOUNT' );

		try {
			const d = domain || '_';
			const wallet = await _findOrCreatePointsWallet( ctx, id_user, d );

			if ( wallet.balance < amount ) return responseError( 'Insufficient balance', 400, 'INSUFFICIENT_BALANCE' );

			const balance_before = wallet.balance;
			const balance_after = balance_before - amount;

			await ctx.app.db.update( wallet_wallets )
				.set( { balance: balance_after } )
				.where( eq( wallet_wallets.id, wallet.id ) )
				.run();

			const transactionId = mkid( 'wtxn' );

			await ctx.app.db.insert( wallet_transactions ).values( {
				id: transactionId,
				domain: d,
				id_wallet: wallet.id,
				id_user,
				transaction_type: 'debit',
				amount,
				balance_before,
				balance_after,
				description: description || 'Debit via wallet.call.debit',
				id_related_transaction: null,
				metadata: null,
			} ).run();

			await liwe_event_emit( ctx, WALLET_EVENT_DEBIT, {
				id_wallet: wallet.id,
				id_transaction: transactionId,
				domain: d,
				id_user,
				amount,
				balance_before,
				balance_after,
				currency_code: wallet.currency_code,
			} );

			return responseSuccess( { id_wallet: wallet.id, balance: balance_after, currency_code: wallet.currency_code } );
		} catch ( error ) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			console.error( `Wallet listener error (debit): ${msg}` );
			return responseError( msg, 500 );
		}
	} );

	liwe_event_register( 'wallet.call.users.above_balance', async ( ctx : LiWECtx, event_data : any ) => {
		const { min_balance, domain } = event_data;
		if ( typeof min_balance !== 'number' ) return responseError( 'Missing min_balance', 400, 'MISSING_PARAM' );

		try {
			const d = domain || '_';

			const wallets = await ctx.app.db.select().from( wallet_wallets ).where( and(
				eq( wallet_wallets.domain, d ),
				eq( wallet_wallets.currency_code, WALLET_POINTS_CURRENCY ),
				gte( wallet_wallets.balance, min_balance ),
			) );

			// The wallet module has no IBAN concept - callers that need a payout
			// IBAN (e.g. m3wallet's year-end conversion) must resolve it themselves.
			const users = wallets.map( ( w ) => ( { id_user: w.id_user, balance: w.balance, iban: '' } ) );

			return responseSuccess( { users } );
		} catch ( error ) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			console.error( `Wallet listener error (users.above_balance): ${msg}` );
			return responseError( msg, 500 );
		}
	} );
};
