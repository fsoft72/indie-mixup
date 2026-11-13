import { type LiWEResponse, apiClient } from '@frontend/liwe3';

import type { LiWEActionOptions } from '@frontend/liwe3';
import type { CredentialsItem } from './types';

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

export const credentials_add = async ( params : {
	name : string;
	type : string;
	metadata : any;
	data_enc? : any;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<CredentialsItem>> => {
	const res = await _internalCall<typeof params, CredentialsItem>( apiClient.post, '/api/credentials/add', params, options );

	/*=== f2c_start credentials_add ===*/

	// Add custom code here
	/*=== f2c_end credentials_add ===*/

	return res;
};

export const credentials_edit = async ( params : {
	id : string;
	name? : string;
	metadata? : any;
	data_enc? : any;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<CredentialsItem>> => {
	const res = await _internalCall<typeof params, CredentialsItem>( apiClient.patch, '/api/credentials/edit', params, options );

	/*=== f2c_start credentials_edit ===*/

	// Add custom code here
	/*=== f2c_end credentials_edit ===*/

	return res;
};

export const credentials_del = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.delete, '/api/credentials/del', params, options );

	/*=== f2c_start credentials_del ===*/

	// Add custom code here
	/*=== f2c_end credentials_del ===*/

	return res;
};

export const credentials_list = async ( params : {
	type? : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<CredentialsItem>> => {
	const res = await _internalCall<typeof params, CredentialsItem>( apiClient.get, '/api/credentials/list', params, options );

	/*=== f2c_start credentials_list ===*/

	// Add custom code here
	/*=== f2c_end credentials_list ===*/

	return res;
};

/*=== f2c_start __actions ===*/

// Add custom actions here
/*=== f2c_end __actions ===*/
