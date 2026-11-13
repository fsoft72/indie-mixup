import { type LiWEResponse, apiClient } from '@frontend/liwe3';

import type { LiWEActionOptions } from '@frontend/liwe3';
import type { Wallet, WalletBalance, WalletTransaction, WalletTransferResult } from './types';

/*=== f2c_start actions ===*/

// Add custom imports here
/*=== f2c_end actions ===*/

/**
 * Internal helper function to handle API calls with optional hooks
 * @param method - The API client method to call (e.g., apiClient.get, apiClient.post)
 * @param url - The API endpoint URL
 * @param params - Optional parameters to send with the request
 * @param options - Optional hooks (beforeSend, afterSend, errorHandling)
 * @returns Promise resolving to LiWEResponse
 */
const _internalCall = async <P, R>(
	method : ( url : string, data? : any ) => Promise<any>,
	url : string,
	params? : P,
	options? : LiWEActionOptions,
) : Promise<LiWEResponse<R>> => {
	// Call beforeSend if defined
	let processedParams = params;

	if ( options?.beforeSend && params !== undefined ) {
		processedParams = await options.beforeSend( params );
	}

	// Make API call
	let res : LiWEResponse<R> = await method( url, processedParams );

	// Check for errors
	if ( !res.ok && options?.errorHandling ) {
		options.errorHandling( res );
		return res;
	}

	// Call afterSend if defined
	if ( options?.afterSend ) {
		res = await options.afterSend( res );
		// Check for errors after afterSend
		if ( !res.ok && options?.errorHandling ) {
			options.errorHandling( res );
			return res;
		}
	}

	return res;
};

export const wallet_create = async ( params : {
	name : string;
	currency_code : string;
	description? : string;
	metadata? : any;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<Wallet>> => {
	const res = await _internalCall<typeof params, Wallet>( apiClient.post, '/api/wallet/create', params, options );

	/*=== f2c_start wallet_create ===*/

	// Add custom code here
	/*=== f2c_end wallet_create ===*/

	return res;
};

export const wallet_list = async ( params : {
	currency_code? : string;
	is_active? : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<Wallet[]>> => {
	const res = await _internalCall<typeof params, Wallet[]>( apiClient.get, '/api/wallet/list', params, options );

	/*=== f2c_start wallet_list ===*/

	// Add custom code here
	/*=== f2c_end wallet_list ===*/

	return res;
};

export const wallet_get = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<Wallet>> => {
	const res = await _internalCall<typeof params, Wallet>( apiClient.get, '/api/wallet/get', params, options );

	/*=== f2c_start wallet_get ===*/

	// Add custom code here
	/*=== f2c_end wallet_get ===*/

	return res;
};

export const wallet_edit = async ( params : {
	id : string;
	name? : string;
	description? : string;
	is_active? : boolean;
	metadata? : any;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<Wallet>> => {
	const res = await _internalCall<typeof params, Wallet>( apiClient.patch, '/api/wallet/edit', params, options );

	/*=== f2c_start wallet_edit ===*/

	// Add custom code here
	/*=== f2c_end wallet_edit ===*/

	return res;
};

export const wallet_del = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.delete, '/api/wallet/del', params, options );

	/*=== f2c_start wallet_del ===*/

	// Add custom code here
	/*=== f2c_end wallet_del ===*/

	return res;
};

export const wallet_credit = async ( params : {
	id_wallet : string;
	amount : number;
	description : string;
	metadata? : any;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<WalletBalance>> => {
	const res = await _internalCall<typeof params, WalletBalance>( apiClient.post, '/api/wallet/credit', params, options );

	/*=== f2c_start wallet_credit ===*/

	// Add custom code here
	/*=== f2c_end wallet_credit ===*/

	return res;
};

export const wallet_debit = async ( params : {
	id_wallet : string;
	amount : number;
	description : string;
	metadata? : any;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<WalletBalance>> => {
	const res = await _internalCall<typeof params, WalletBalance>( apiClient.post, '/api/wallet/debit', params, options );

	/*=== f2c_start wallet_debit ===*/

	// Add custom code here
	/*=== f2c_end wallet_debit ===*/

	return res;
};

export const wallet_transfer = async ( params : {
	id_wallet_from : string;
	id_wallet_to : string;
	amount : number;
	description : string;
	metadata? : any;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<WalletTransferResult>> => {
	const res = await _internalCall<typeof params, WalletTransferResult>( apiClient.post, '/api/wallet/transfer', params, options );

	/*=== f2c_start wallet_transfer ===*/

	// Add custom code here
	/*=== f2c_end wallet_transfer ===*/

	return res;
};

export const wallet_transaction_list = async ( params : {
	id_wallet : string;
	offset? : number;
	limit? : number;
	transaction_type? : string;
	date_start? : datetime;
	date_end? : datetime;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<WalletTransaction[]>> => {
	const res = await _internalCall<typeof params, WalletTransaction[]>( apiClient.get, '/api/wallet/transaction/list', params, options );

	/*=== f2c_start wallet_transaction_list ===*/

	// Add custom code here
	/*=== f2c_end wallet_transaction_list ===*/

	return res;
};

export const wallet_balance = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<WalletBalance>> => {
	const res = await _internalCall<typeof params, WalletBalance>( apiClient.get, '/api/wallet/balance', params, options );

	/*=== f2c_start wallet_balance ===*/

	// Add custom code here
	/*=== f2c_end wallet_balance ===*/

	return res;
};

/*=== f2c_start __actions ===*/

// Add custom actions here
/*=== f2c_end __actions ===*/
