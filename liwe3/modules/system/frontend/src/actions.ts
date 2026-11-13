import { type LiWEResponse, apiClient } from '@frontend/liwe3';

import type { LiWEActionOptions } from '@frontend/liwe3';
import type { SystemConfigGroup, SystemDomain, SystemDomainAdmin } from './types';

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

export const system_domains_list = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<SystemDomain[]>> => {
	const res = await _internalCall<undefined, SystemDomain[]>( apiClient.get, '/api/system/domains/list', undefined, options );

	/*=== f2c_start system_domains_list ===*/

	// Add custom code here
	/*=== f2c_end system_domains_list ===*/

	return res;
};

export const system_admin_domain_add = async ( params : {
	code : string;
	name : string;
	visible? : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<SystemDomain>> => {
	const res = await _internalCall<typeof params, SystemDomain>( apiClient.post, '/api/system/admin/domain/add', params, options );

	/*=== f2c_start system_admin_domain_add ===*/

	// Add custom code here
	/*=== f2c_end system_admin_domain_add ===*/

	return res;
};

export const system_admin_domain_del = async ( params : {
	code : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.delete, '/api/system/admin/domain/del', params, options );

	/*=== f2c_start system_admin_domain_del ===*/

	// Add custom code here
	/*=== f2c_end system_admin_domain_del ===*/

	return res;
};

export const system_admin_domains_list = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<SystemDomainAdmin[]>> => {
	const res = await _internalCall<undefined, SystemDomainAdmin[]>( apiClient.get, '/api/system/admin/domains/list', undefined, options );

	/*=== f2c_start system_admin_domains_list ===*/

	// Add custom code here
	/*=== f2c_end system_admin_domains_list ===*/

	return res;
};

export const system_email_test = async ( params : {
	email : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.post, '/api/system/email/test', params, options );

	/*=== f2c_start system_email_test ===*/

	// Add custom code here
	/*=== f2c_end system_email_test ===*/

	return res;
};

export const system_admin_permissions_list = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<any>> => {
	const res = await _internalCall<undefined, any>( apiClient.get, '/api/system/admin/permissions/list', undefined, options );

	/*=== f2c_start system_admin_permissions_list ===*/

	// Add custom code here
	/*=== f2c_end system_admin_permissions_list ===*/

	return res;
};

export const system_domain_create_invite = async ( params : {
	code : string;
	expire : number;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<string>> => {
	const res = await _internalCall<typeof params, string>( apiClient.get, '/api/system/domain/create/invite', params, options );

	/*=== f2c_start system_domain_create_invite ===*/

	// Add custom code here
	/*=== f2c_end system_domain_create_invite ===*/

	return res;
};

export const system_uptime = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<number>> => {
	const res = await _internalCall<undefined, number>( apiClient.get, '/api/system/uptime', undefined, options );

	/*=== f2c_start system_uptime ===*/

	// Add custom code here
	/*=== f2c_end system_uptime ===*/

	return res;
};

export const system_admin_domain_create_root = async ( params : {
	name : string;
	total_max_tiers : number;
	code : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<SystemDomainAdmin>> => {
	const res = await _internalCall<typeof params, SystemDomainAdmin>( apiClient.post, '/api/system/admin/domain/create_root', params, options );

	/*=== f2c_start system_admin_domain_create_root ===*/

	// Add custom code here
	/*=== f2c_end system_admin_domain_create_root ===*/

	return res;
};

export const system_domain_subdomain_create = async ( params : {
	name : string;
	tiers_allocated : number;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<SystemDomain>> => {
	const res = await _internalCall<typeof params, SystemDomain>( apiClient.post, '/api/system/domain/subdomain/create', params, options );

	/*=== f2c_start system_domain_subdomain_create ===*/

	// Add custom code here
	/*=== f2c_end system_domain_subdomain_create ===*/

	return res;
};

export const system_domain_subdomain_list_managed = async ( params : {
	deep? : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<SystemDomainAdmin[]>> => {
	const res = await _internalCall<typeof params, SystemDomainAdmin[]>( apiClient.get, '/api/system/domain/subdomain/list_managed', params, options );

	/*=== f2c_start system_domain_subdomain_list_managed ===*/

	// Add custom code here
	/*=== f2c_end system_domain_subdomain_list_managed ===*/

	return res;
};

export const system_domain_user_assign_role = async ( params : {
	id_user : string;
	role : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.post, '/api/system/domain/user/assign_role', params, options );

	/*=== f2c_start system_domain_user_assign_role ===*/

	// Add custom code here
	/*=== f2c_end system_domain_user_assign_role ===*/

	return res;
};

export const system_admin_config_fields = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<SystemConfigGroup[]>> => {
	const res = await _internalCall<undefined, SystemConfigGroup[]>( apiClient.get, '/api/system/admin/config/fields', undefined, options );

	/*=== f2c_start system_admin_config_fields ===*/

	// Add custom code here

	/*=== f2c_end system_admin_config_fields ===*/

	return res;
};

export const system_admin_config_set = async ( params : {
	values : any;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<SystemConfigGroup[]>> => {
	const res = await _internalCall<typeof params, SystemConfigGroup[]>( apiClient.post, '/api/system/admin/config/set', params, options );

	/*=== f2c_start system_admin_config_set ===*/

	// Add custom code here

	/*=== f2c_end system_admin_config_set ===*/

	return res;
};

export const system_admin_config_reset = async ( params : {
	keys : string[];
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<SystemConfigGroup[]>> => {
	const res = await _internalCall<typeof params, SystemConfigGroup[]>( apiClient.post, '/api/system/admin/config/reset', params, options );

	/*=== f2c_start system_admin_config_reset ===*/

	// Add custom code here

	/*=== f2c_end system_admin_config_reset ===*/

	return res;
};

/*=== f2c_start __actions ===*/

// Add custom actions here
/*=== f2c_end __actions ===*/
