import { type LiWEResponse, apiClient } from '@frontend/liwe3';

import type { LiWEActionOptions } from '@frontend/liwe3';
import type { CommentItem } from './types';

/*=== f2c_start actions ===*/
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

export const comments_list = async ( params : {
	module : string;
	id_obj : string;
	sort? : string;
	full? : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<CommentItem[]>> => {
	const res = await _internalCall<typeof params, CommentItem[]>( apiClient.get, '/api/comments/list', params, options );

	/*=== f2c_start comments_list ===*/
	/*=== f2c_end comments_list ===*/

	return res;
};

export const comment_add = async ( params : {
	module : string;
	id_obj : string;
	comment : string;
	id_follow_up? : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<CommentItem>> => {
	const res = await _internalCall<typeof params, CommentItem>( apiClient.post, '/api/comment/add', params, options );

	/*=== f2c_start comment_add ===*/
	/*=== f2c_end comment_add ===*/

	return res;
};

export const comment_del = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.delete, '/api/comment/del', params, options );

	/*=== f2c_start comment_del ===*/
	/*=== f2c_end comment_del ===*/

	return res;
};

/*=== f2c_start __actions ===*/
/*=== f2c_end __actions ===*/
