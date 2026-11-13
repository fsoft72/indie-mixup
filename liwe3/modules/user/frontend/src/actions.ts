import { type LiWEResponse, apiClient } from '@frontend/liwe3';

import type { LiWEActionOptions } from '@frontend/liwe3';
import type { TokenRefreshResponse, User, User2FASetup, UserInvite, UserLogin, UserOAUTHProvider, UserRegisterConfig, UserRole } from './types';

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

export const user_add = async ( params : {
	username? : string;
	id? : string;
	email? : string;
	name? : string;
	lastname? : string;
	perms? : string[];
	enabled? : boolean;
	password? : string;
	email_verified? : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<User>> => {
	const res = await _internalCall<typeof params, User>( apiClient.post, '/api/user/add', params, options );

	/*=== f2c_start user_add ===*/

	// Add custom code here
	/*=== f2c_end user_add ===*/

	return res;
};

export const user_create_admin = async ( params : {
	username : string;
	password : string;
	key : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<User>> => {
	const res = await _internalCall<typeof params, User>( apiClient.get, '/api/user/create/admin', params, options );

	/*=== f2c_start user_create_admin ===*/

	// Add custom code here
	/*=== f2c_end user_create_admin ===*/

	return res;
};

export const user_delete = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.delete, '/api/user/delete', params, options );

	/*=== f2c_start user_delete ===*/

	// Add custom code here
	/*=== f2c_end user_delete ===*/

	return res;
};

export const user_list = async ( params : {
	offset? : number;
	limit? : number;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<User[]>> => {
	const res = await _internalCall<typeof params, User[]>( apiClient.get, '/api/user/list', params, options );

	/*=== f2c_start user_list ===*/

	// Add custom code here
	/*=== f2c_end user_list ===*/

	return res;
};

export const user_login = async ( params : {
	username : string;
	password : string;
	domain? : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<UserLogin>> => {
	const res = await _internalCall<typeof params, UserLogin>( apiClient.post, '/api/user/login', params, options );

	/*=== f2c_start user_login ===*/

	// Add custom code here
	/*=== f2c_end user_login ===*/

	return res;
};

export const user_logout = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<undefined, boolean>( apiClient.get, '/api/user/logout', undefined, options );

	/*=== f2c_start user_logout ===*/

	// Add custom code here
	/*=== f2c_end user_logout ===*/

	return res;
};

export const user_me = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<User>> => {
	const res = await _internalCall<undefined, User>( apiClient.get, '/api/user/me', undefined, options );

	/*=== f2c_start user_me ===*/

	// Add custom code here
	/*=== f2c_end user_me ===*/

	return res;
};

export const user_perms_set = async ( params : {
	id_user : string;
	perms : string[];
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<User>> => {
	const res = await _internalCall<typeof params, User>( apiClient.post, '/api/user/perms/set', params, options );

	/*=== f2c_start user_perms_set ===*/

	// Add custom code here
	/*=== f2c_end user_perms_set ===*/

	return res;
};

export const user_invite_create = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<UserInvite>> => {
	const res = await _internalCall<undefined, UserInvite>( apiClient.post, '/api/user/invite/create', undefined, options );

	/*=== f2c_start user_invite_create ===*/

	// Add custom code here
	/*=== f2c_end user_invite_create ===*/

	return res;
};

export const user_change_identity = async ( params : {
	id_user : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<UserLogin>> => {
	const res = await _internalCall<typeof params, UserLogin>( apiClient.get, '/api/user/change/identity', params, options );

	/*=== f2c_start user_change_identity ===*/

	// Add custom code here
	/*=== f2c_end user_change_identity ===*/

	return res;
};

export const user_token_refresh = async ( params : {
	refresh_token : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<TokenRefreshResponse>> => {
	const res = await _internalCall<typeof params, TokenRefreshResponse>( apiClient.post, '/api/user/token/refresh', params, options );

	/*=== f2c_start user_token_refresh ===*/

	// Add custom code here
	/*=== f2c_end user_token_refresh ===*/

	return res;
};

export const user_role_add = async ( params : {
	name : string;
	id? : string;
	description? : string;
	perms? : string[];
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<UserRole>> => {
	const res = await _internalCall<typeof params, UserRole>( apiClient.post, '/api/user/role/add', params, options );

	/*=== f2c_start user_role_add ===*/

	// Add custom code here
	/*=== f2c_end user_role_add ===*/

	return res;
};

export const user_role_del = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.delete, '/api/user/role/del', params, options );

	/*=== f2c_start user_role_del ===*/

	// Add custom code here
	/*=== f2c_end user_role_del ===*/

	return res;
};

export const user_role_list = async ( params : {
	offset? : number;
	limit? : number;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<UserRole[]>> => {
	const res = await _internalCall<typeof params, UserRole[]>( apiClient.get, '/api/user/role/list', params, options );

	/*=== f2c_start user_role_list ===*/

	// Add custom code here
	/*=== f2c_end user_role_list ===*/

	return res;
};

export const user_role_assign = async ( params : {
	id_user : string;
	id_role : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<User>> => {
	const res = await _internalCall<typeof params, User>( apiClient.post, '/api/user/role/assign', params, options );

	/*=== f2c_start user_role_assign ===*/

	// Add custom code here
	/*=== f2c_end user_role_assign ===*/

	return res;
};

export const user_2fa_setup = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<User2FASetup>> => {
	const res = await _internalCall<undefined, User2FASetup>( apiClient.post, '/api/user/2fa/setup', undefined, options );

	/*=== f2c_start user_2fa_setup ===*/

	// Add custom code here
	/*=== f2c_end user_2fa_setup ===*/

	return res;
};

export const user_2fa_enable = async ( params : {
	code : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<string[]>> => {
	const res = await _internalCall<typeof params, string[]>( apiClient.post, '/api/user/2fa/enable', params, options );

	/*=== f2c_start user_2fa_enable ===*/

	// Add custom code here
	/*=== f2c_end user_2fa_enable ===*/

	return res;
};

export const user_2fa_disable = async ( params : {
	password : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.post, '/api/user/2fa/disable', params, options );

	/*=== f2c_start user_2fa_disable ===*/

	// Add custom code here
	/*=== f2c_end user_2fa_disable ===*/

	return res;
};

export const user_2fa_verify = async ( params : {
	pending_token : string;
	code : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<UserLogin>> => {
	const res = await _internalCall<typeof params, UserLogin>( apiClient.post, '/api/user/2fa/verify', params, options );

	/*=== f2c_start user_2fa_verify ===*/

	// Add custom code here
	/*=== f2c_end user_2fa_verify ===*/

	return res;
};

export const user_2fa_admin_disable = async ( params : {
	id_user : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.post, '/api/user/2fa/admin/disable', params, options );

	/*=== f2c_start user_2fa_admin_disable ===*/

	// Add custom code here
	/*=== f2c_end user_2fa_admin_disable ===*/

	return res;
};

export const user_oauth_provider_add = async ( params : {
	id? : string;
	provider : string;
	client_id : string;
	client_secret : string;
	enabled? : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<UserOAUTHProvider>> => {
	const res = await _internalCall<typeof params, UserOAUTHProvider>( apiClient.post, '/api/user/oauth/provider/add', params, options );

	/*=== f2c_start user_oauth_provider_add ===*/

	// Add custom code here
	/*=== f2c_end user_oauth_provider_add ===*/

	return res;
};

export const user_oauth_provider_list = async ( params : {
	offset? : number;
	limit? : number;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<UserOAUTHProvider[]>> => {
	const res = await _internalCall<typeof params, UserOAUTHProvider[]>( apiClient.get, '/api/user/oauth/provider/list', params, options );

	/*=== f2c_start user_oauth_provider_list ===*/

	// Add custom code here
	/*=== f2c_end user_oauth_provider_list ===*/

	return res;
};

export const user_oauth_provider_del = async ( params : {
	id : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.delete, '/api/user/oauth/provider/del', params, options );

	/*=== f2c_start user_oauth_provider_del ===*/

	// Add custom code here
	/*=== f2c_end user_oauth_provider_del ===*/

	return res;
};

export const user_oauth_authorize = async ( params : {
	provider : string;
	redirect_url : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<string>> => {
	const res = await _internalCall<typeof params, string>( apiClient.get, '/api/user/oauth/authorize', params, options );

	/*=== f2c_start user_oauth_authorize ===*/

	// Add custom code here
	/*=== f2c_end user_oauth_authorize ===*/

	return res;
};

export const user_oauth_callback = async ( params : {
	state : string;
	code : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<UserLogin>> => {
	const res = await _internalCall<typeof params, UserLogin>( apiClient.get, '/api/user/oauth/callback', params, options );

	/*=== f2c_start user_oauth_callback ===*/

	// Add custom code here
	/*=== f2c_end user_oauth_callback ===*/

	return res;
};

export const user_set_enabled = async ( params : {
	id : string;
	enabled : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<User>> => {
	const res = await _internalCall<typeof params, User>( apiClient.post, '/api/user/set/enabled', params, options );

	/*=== f2c_start user_set_enabled ===*/

	// Add custom code here
	/*=== f2c_end user_set_enabled ===*/

	return res;
};

export const user_set_email_verified = async ( params : {
	id : string;
	verified : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<User>> => {
	const res = await _internalCall<typeof params, User>( apiClient.post, '/api/user/set/email_verified', params, options );

	/*=== f2c_start user_set_email_verified ===*/

	// Add custom code here
	/*=== f2c_end user_set_email_verified ===*/

	return res;
};

export const user_set_password = async ( params : {
	id : string;
	password : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<User>> => {
	const res = await _internalCall<typeof params, User>( apiClient.post, '/api/user/set/password', params, options );

	/*=== f2c_start user_set_password ===*/

	// Add custom code here
	/*=== f2c_end user_set_password ===*/

	return res;
};

export const user_email_verify = async ( params : {
	token : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.post, '/api/user/email/verify', params, options );

	/*=== f2c_start user_email_verify ===*/

	// Add custom code here
	/*=== f2c_end user_email_verify ===*/

	return res;
};

export const user_email_resend = async ( params : {
	email : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<boolean>> => {
	const res = await _internalCall<typeof params, boolean>( apiClient.post, '/api/user/email/resend', params, options );

	/*=== f2c_start user_email_resend ===*/

	// Add custom code here
	/*=== f2c_end user_email_resend ===*/

	return res;
};

export const user_set_password_expired = async ( params : {
	id : string;
	password_expired : boolean;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<User>> => {
	const res = await _internalCall<typeof params, User>( apiClient.post, '/api/user/set/password_expired', params, options );

	/*=== f2c_start user_set_password_expired ===*/

	// Add custom code here
	/*=== f2c_end user_set_password_expired ===*/

	return res;
};

export const user_password_change_expired = async ( params : {
	pending_token : string;
	password : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<UserLogin>> => {
	const res = await _internalCall<typeof params, UserLogin>( apiClient.post, '/api/user/password/change-expired', params, options );

	/*=== f2c_start user_password_change_expired ===*/

	// Add custom code here
	/*=== f2c_end user_password_change_expired ===*/

	return res;
};

export const user_set_password_max_age = async ( params : {
	id : string;
	days? : number;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<User>> => {
	const res = await _internalCall<typeof params, User>( apiClient.post, '/api/user/set/password_max_age', params, options );

	/*=== f2c_start user_set_password_max_age ===*/

	// Add custom code here
	/*=== f2c_end user_set_password_max_age ===*/

	return res;
};

export const user_register = async ( params : {
	username : string;
	email : string;
	password : string;
	name? : string;
	lastname? : string;
	auth_code? : string;
}, options? : LiWEActionOptions ) : Promise<LiWEResponse<User>> => {
	const res = await _internalCall<typeof params, User>( apiClient.post, '/api/user/register', params, options );

	/*=== f2c_start user_register ===*/

	// Add custom code here
	/*=== f2c_end user_register ===*/

	return res;
};

export const user_register_config = async ( options? : LiWEActionOptions ) : Promise<LiWEResponse<UserRegisterConfig>> => {
	const res = await _internalCall<undefined, UserRegisterConfig>( apiClient.get, '/api/user/register/config', undefined, options );

	/*=== f2c_start user_register_config ===*/

	// Add custom code here
	/*=== f2c_end user_register_config ===*/

	return res;
};

/*=== f2c_start __actions ===*/

// Add custom actions here
/*=== f2c_end __actions ===*/
