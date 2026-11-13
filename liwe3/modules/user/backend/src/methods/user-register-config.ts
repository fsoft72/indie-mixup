import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UserRegisterConfig } from '../types';

/*=== f2c_start user_register_config_headers ===*/

// Custom imports here
/*=== f2c_end user_register_config_headers ===*/

/**
 * Public. Tells the sign up form whether registration is open, whether it creates a domain and whether an auth code is asked. The auth code itself is never returned.
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UserRegisterConfig>>} Result object with success status and data or error details
 */
export const user_register_config = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<UserRegisterConfig>> => {
	/*=== f2c_start user_register_config ===*/
	const cfg = ctx.app.cfg.user;
	const enabled = cfg?.allowRegistration === true;

	// The auth code itself is never returned: only whether it is asked
	return responseSuccess( {
		enabled,
		create_domain: enabled && cfg?.createDomain === true,
		auth_code_required: enabled && ( cfg?.registrationAuthCode ?? '' ) !== '',
	} );
	/*=== f2c_end user_register_config ===*/
};
