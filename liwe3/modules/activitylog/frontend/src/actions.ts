import { type LiWEResponse, apiClient } from '@frontend/liwe3';

import type { LiWEActionOptions } from '@frontend/liwe3';
import type { ActivityLogEvent } from './types';

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

export const activity_log_list = async ( params : {
	offset? : number;
	limit? : number;
	module? : string;
	date_start? : datetime;
	date_end? : datetime;
	full? : boolean;
	sort? : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<ActivityLogEvent[]>> => {
	const res = await _internalCall<typeof params, ActivityLogEvent[]>( apiClient.get, '/api/activity_log/list', params, options );

	/*=== f2c_start activity_log_list ===*/

	// Add custom code here

	/*=== f2c_end activity_log_list ===*/

	return res;
};

export const activity_log_add = async ( params : {
	event : string;
	data? : any;
	module : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<ActivityLogEvent>> => {
	const res = await _internalCall<typeof params, ActivityLogEvent>( apiClient.post, '/api/activity_log/add', params, options );

	/*=== f2c_start activity_log_add ===*/

	// Add custom code here

	/*=== f2c_end activity_log_add ===*/

	return res;
};

export const activity_log_del = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.delete, '/api/activity_log/del', params, options );

	/*=== f2c_start activity_log_del ===*/

	// Add custom code here

	/*=== f2c_end activity_log_del ===*/

	return res;
};

export const activity_log_clear = async ( params : {
	module? : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.delete, '/api/activity_log/clear', params, options );

	/*=== f2c_start activity_log_clear ===*/

	// Add custom code here

	/*=== f2c_end activity_log_clear ===*/

	return res;
};

/*=== f2c_start __actions ===*/

// Add custom actions here

/*=== f2c_end __actions ===*/
