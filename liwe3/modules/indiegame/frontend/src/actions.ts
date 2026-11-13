import { type LiWEResponse, apiClient } from '@frontend/liwe3';

import type { LiWEActionOptions } from '@frontend/liwe3';
import type {
	IndieAdminReports,
	IndieDevRankingEntry,
	IndieDeveloper,
	IndieGameCard,
	IndieGameDetail,
	IndieGameRankingEntry,
	IndieGameReport,
	IndieGameTrackResult,
	IndieRemixReport,
} from './types';

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

export const indiegame_list = async ( params : {
	q? : string;
	page? : number;
	limit? : number;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieGameCard[]>> => {
	const res = await _internalCall<typeof params, IndieGameCard[]>( apiClient.get, '/api/indiegame/list', params, options );

	/*=== f2c_start indiegame_list ===*/

	// Add custom code here
	/*=== f2c_end indiegame_list ===*/

	return res;
};

export const indiegame_get = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieGameDetail>> => {
	const res = await _internalCall<typeof params, IndieGameDetail>( apiClient.get, '/api/indiegame/get', params, options );

	/*=== f2c_start indiegame_get ===*/

	// Add custom code here
	/*=== f2c_end indiegame_get ===*/

	return res;
};

export const indiegame_track = async ( params : {
	id_game : string;
	kind : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieGameTrackResult>> => {
	const res = await _internalCall<typeof params, IndieGameTrackResult>( apiClient.post, '/api/indiegame/track', params, options );

	/*=== f2c_start indiegame_track ===*/

	// Add custom code here
	/*=== f2c_end indiegame_track ===*/

	return res;
};

export const indiegame_ranking_games = async ( params : {
	kind : string;
	window : string;
	limit? : number;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieGameRankingEntry[]>> => {
	const res = await _internalCall<typeof params, IndieGameRankingEntry[]>( apiClient.get, '/api/indiegame/ranking/games', params, options );

	/*=== f2c_start indiegame_ranking_games ===*/

	// Add custom code here
	/*=== f2c_end indiegame_ranking_games ===*/

	return res;
};

export const indiegame_ranking_developers = async ( params : {
	kind : string;
	window : string;
	limit? : number;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieDevRankingEntry[]>> => {
	const res = await _internalCall<typeof params, IndieDevRankingEntry[]>( apiClient.get, '/api/indiegame/ranking/developers', params, options );

	/*=== f2c_start indiegame_ranking_developers ===*/

	// Add custom code here
	/*=== f2c_end indiegame_ranking_developers ===*/

	return res;
};

export const indiegame_developer_get = async ( params : {
	id_user : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieDeveloper>> => {
	const res = await _internalCall<typeof params, IndieDeveloper>( apiClient.get, '/api/indiegame/developer/get', params, options );

	/*=== f2c_start indiegame_developer_get ===*/

	// Add custom code here
	/*=== f2c_end indiegame_developer_get ===*/

	return res;
};

export const indiegame_add = async ( params : {
	id? : string;
	name? : string;
	description? : string;
	repo_url? : string;
	screenshots? : any;
	gallery? : any;
	video_urls? : any;
	id_remix_of? : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieGameDetail>> => {
	const res = await _internalCall<typeof params, IndieGameDetail>( apiClient.post, '/api/indiegame/add', params, options );

	/*=== f2c_start indiegame_add ===*/

	// Add custom code here
	/*=== f2c_end indiegame_add ===*/

	return res;
};

export const indiegame_del = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.delete, '/api/indiegame/del', params, options );

	/*=== f2c_start indiegame_del ===*/

	// Add custom code here
	/*=== f2c_end indiegame_del ===*/

	return res;
};

export const indiegame_mine = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieGameCard[]>> => {
	const res = await _internalCall<undefined, IndieGameCard[]>( apiClient.get, '/api/indiegame/mine', undefined, options );

	/*=== f2c_start indiegame_mine ===*/

	// Add custom code here
	/*=== f2c_end indiegame_mine ===*/

	return res;
};

export const indiegame_report = async ( params : {
	id_game : string;
	reason : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieGameReport>> => {
	const res = await _internalCall<typeof params, IndieGameReport>( apiClient.post, '/api/indiegame/report', params, options );

	/*=== f2c_start indiegame_report ===*/

	// Add custom code here
	/*=== f2c_end indiegame_report ===*/

	return res;
};

export const indiegame_remix_report = async ( params : {
	id_game : string;
	id_original : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieRemixReport>> => {
	const res = await _internalCall<typeof params, IndieRemixReport>( apiClient.post, '/api/indiegame/remix/report', params, options );

	/*=== f2c_start indiegame_remix_report ===*/

	// Add custom code here
	/*=== f2c_end indiegame_remix_report ===*/

	return res;
};

export const indiegame_remix_inbox = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieRemixReport[]>> => {
	const res = await _internalCall<undefined, IndieRemixReport[]>( apiClient.get, '/api/indiegame/remix/inbox', undefined, options );

	/*=== f2c_start indiegame_remix_inbox ===*/

	// Add custom code here
	/*=== f2c_end indiegame_remix_inbox ===*/

	return res;
};

export const indiegame_remix_answer = async ( params : {
	id_report : string;
	accept : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieRemixReport>> => {
	const res = await _internalCall<typeof params, IndieRemixReport>( apiClient.post, '/api/indiegame/remix/answer', params, options );

	/*=== f2c_start indiegame_remix_answer ===*/

	// Add custom code here
	/*=== f2c_end indiegame_remix_answer ===*/

	return res;
};

export const indiegame_admin_reports = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieAdminReports>> => {
	const res = await _internalCall<undefined, IndieAdminReports>( apiClient.get, '/api/indiegame/admin/reports', undefined, options );

	/*=== f2c_start indiegame_admin_reports ===*/

	// Add custom code here
	/*=== f2c_end indiegame_admin_reports ===*/

	return res;
};

export const indiegame_admin_hide = async ( params : {
	id : string;
	hidden : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieGameCard>> => {
	const res = await _internalCall<typeof params, IndieGameCard>( apiClient.post, '/api/indiegame/admin/hide', params, options );

	/*=== f2c_start indiegame_admin_hide ===*/

	// Add custom code here
	/*=== f2c_end indiegame_admin_hide ===*/

	return res;
};

export const indiegame_admin_remix_decide = async ( params : {
	id_report : string;
	confirm : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieRemixReport>> => {
	const res = await _internalCall<typeof params, IndieRemixReport>( apiClient.post, '/api/indiegame/admin/remix/decide', params, options );

	/*=== f2c_start indiegame_admin_remix_decide ===*/

	// Add custom code here
	/*=== f2c_end indiegame_admin_remix_decide ===*/

	return res;
};

export const indiegame_admin_report_close = async ( params : {
	id_report : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<IndieGameReport>> => {
	const res = await _internalCall<typeof params, IndieGameReport>( apiClient.post, '/api/indiegame/admin/report/close', params, options );

	/*=== f2c_start indiegame_admin_report_close ===*/

	// Add custom code here
	/*=== f2c_end indiegame_admin_report_close ===*/

	return res;
};

/*=== f2c_start __actions ===*/

// Add custom actions here
/*=== f2c_end __actions ===*/
