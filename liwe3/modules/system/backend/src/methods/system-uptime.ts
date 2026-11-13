import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/*=== f2c_start system_uptime_headers ===*/
const SYSTEM_START_TIME = Date.now();
/*=== f2c_end system_uptime_headers ===*/

/**
 * Returns the system uptime (in seconds)
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<number>>} Result object with success status and data or error details
 */
export const system_uptime = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<number>> => {
	/*=== f2c_start system_uptime ===*/
	try {
		// Calculate uptime in seconds
		const currentTime = Date.now();
		const uptimeMs = currentTime - SYSTEM_START_TIME;
		const uptimeSeconds = Math.floor( uptimeMs / 1000 );

		return responseSuccess( uptimeSeconds );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'CALCULATION_ERROR' );
	}
	/*=== f2c_end system_uptime ===*/
};
