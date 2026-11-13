import { type LiWEResponse, apiClient } from '@frontend/liwe3';

import type { LiWEActionOptions } from '@frontend/liwe3';
import type { Notification, NotificationSetting } from './types';

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

export const notifier_add = async ( params : {
	id_user : string;
	event_type : string;
	title : string;
	message : string;
	notification_type? : string;
	data? : any;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<Notification>> => {
	const res = await _internalCall<typeof params, Notification>( apiClient.post, '/api/notifier/add', params, options );

	/*=== f2c_start notifier_add ===*/

	// Add custom code here
	/*=== f2c_end notifier_add ===*/

	return res;
};

export const notifier_list = async ( params : {
	limit? : number;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<Notification[]>> => {
	const res = await _internalCall<typeof params, Notification[]>( apiClient.get, '/api/notifier/list', params, options );

	/*=== f2c_start notifier_list ===*/

	// Add custom code here
	/*=== f2c_end notifier_list ===*/

	return res;
};

export const notifier_dismiss = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.post, '/api/notifier/dismiss', params, options );

	/*=== f2c_start notifier_dismiss ===*/

	// Add custom code here
	/*=== f2c_end notifier_dismiss ===*/

	return res;
};

export const notifier_snooze = async ( params : {
	id : string;
	days? : number;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<any>> => {
	const res = await _internalCall<typeof params, any>( apiClient.post, '/api/notifier/snooze', params, options );

	/*=== f2c_start notifier_snooze ===*/

	// Add custom code here
	/*=== f2c_end notifier_snooze ===*/

	return res;
};

export const notifier_settings_delete = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.delete, '/api/notifier/settings/delete', params, options );

	/*=== f2c_start notifier_settings_delete ===*/

	// Add custom code here
	/*=== f2c_end notifier_settings_delete ===*/

	return res;
};

export const notifier_settings_get = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<NotificationSetting[]>> => {
	const res = await _internalCall<undefined, NotificationSetting[]>( apiClient.get, '/api/notifier/settings/get', undefined, options );

	/*=== f2c_start notifier_settings_get ===*/

	// Add custom code here
	/*=== f2c_end notifier_settings_get ===*/

	return res;
};

export const notifier_settings_update = async ( params : {
	event_type : string;
	enabled : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<NotificationSetting>> => {
	const res = await _internalCall<typeof params, NotificationSetting>( apiClient.patch, '/api/notifier/settings/update', params, options );

	/*=== f2c_start notifier_settings_update ===*/

	// Add custom code here
	/*=== f2c_end notifier_settings_update ===*/

	return res;
};

/*=== f2c_start __actions ===*/

// Add custom actions here
/*=== f2c_end __actions ===*/
