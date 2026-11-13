import { type LiWECtx, LiWEResponse, responseError, responseSuccess } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED } from '@backend/liwe3';

/**
 * Exits test mode: switches the app back to the main DB.
 *
 * Guards: DEV_MODE must be 'true', user must be admin.
 *
 * @param {LiWECtx} ctx - The request context
 * @returns {Promise<LiWEResponse<{ test_mode: boolean }>>}
 */
export const system_test_exit = async ( ctx : LiWECtx ) : Promise<LiWEResponse<{ test_mode : boolean }>> => {
	// Guard: dev mode only
	if ( ctx.app.env?.DEV_MODE !== 'true' ) {
		return responseError( 'Test mode is only available in dev environment', 403 );
	}

	// Guard: admin auth
	const user = await ctx.user();
	if ( !user ) return responseError( ERR_UNAUTHORIZED, 401 );
	if ( !user.perms?.includes( 'system.admin' ) ) return responseError( ERR_PERMISSION_DENIED, 403 );

	// If not in test mode, no-op
	if ( !ctx.app.isTestMode ) {
		return responseSuccess( { test_mode: false } );
	}

	ctx.app.useMainDB();

	return responseSuccess( { test_mode: false } );
};
