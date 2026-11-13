import { type LiWEResponse, apiClient } from '@frontend/liwe3';

import type { LiWEActionOptions } from '@frontend/liwe3';
import type { UploadFileList, UploadMultipartComplete, UploadMultipartInfo, UploadMultipartPart } from './types';

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

export const upload_initiate = async ( params : {
	fileName : string;
	fileType : string;
	folder? : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<UploadMultipartInfo>> => {
	const res = await _internalCall<typeof params, UploadMultipartInfo>( apiClient.post, '/api/upload/initiate', params, options );

	/*=== f2c_start upload_initiate ===*/

	// Add custom code here

	/*=== f2c_end upload_initiate ===*/

	return res;
};

export const upload_part = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<UploadMultipartPart>> => {
	const res = await _internalCall<undefined, UploadMultipartPart>( apiClient.post, '/api/upload/part', undefined, options );

	/*=== f2c_start upload_part ===*/

	// Add custom code here

	/*=== f2c_end upload_part ===*/

	return res;
};

export const upload_complete = async ( params : {
	uploadId : string;
	key : string;
	parts : any;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<UploadMultipartComplete>> => {
	const res = await _internalCall<typeof params, UploadMultipartComplete>( apiClient.post, '/api/upload/complete', params, options );

	/*=== f2c_start upload_complete ===*/

	// Add custom code here

	/*=== f2c_end upload_complete ===*/

	return res;
};

export const upload_abort = async ( params : {
	uploadId : string;
	key : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.post, '/api/upload/abort', params, options );

	/*=== f2c_start upload_abort ===*/

	// Add custom code here

	/*=== f2c_end upload_abort ===*/

	return res;
};

export const upload_list = async ( params : {
	folder : string;
	cursor? : string;
	limit? : number;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<UploadFileList>> => {
	const res = await _internalCall<typeof params, UploadFileList>( apiClient.get, '/api/upload/list', params, options );

	/*=== f2c_start upload_list ===*/

	// Add custom code here

	/*=== f2c_end upload_list ===*/

	return res;
};

export const upload_del = async ( params : {
	pattern : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.delete, '/api/upload/del', params, options );

	/*=== f2c_start upload_del ===*/

	// Add custom code here

	/*=== f2c_end upload_del ===*/

	return res;
};

export const upload_get = async ( params : {
	key : string;
	variant? : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.get, '/api/upload/get', params, options );

	/*=== f2c_start upload_get ===*/

	// Add custom code here

	/*=== f2c_end upload_get ===*/

	return res;
};

/*=== f2c_start __actions ===*/

// Add custom actions here

/*=== f2c_end __actions ===*/
