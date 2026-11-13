/**
 * @fileoverview System configuration dump functionality
 */

import { type LiWECtx, LiWEResponse, responseError, responseSuccess, z } from './utils';

/**
 * Schema for dumping system configuration
 * Requires a key parameter for security
 */
export const SystemConfigDumpSchema = z.object( {
	key: z.string().min( 1, 'Key parameter is required' ),
} );

export type SystemConfigDumpParams = z.infer<typeof SystemConfigDumpSchema>;
export type SystemConfigDumpResult = Record<string, any>;

/**
 * Returns the system configuration as JSON
 *
 * Dumps the entire LiWEApp.cfg configuration object for debugging and inspection purposes.
 * Requires a key parameter for basic security.
 *
 * @param {LiWEApp} app - The LiWE application instance with configuration access
 * @param {SystemConfigDumpParams} params - Parameters containing the required key
 *
 * @returns {Promise<LiWEResponse<SystemConfigDumpResult>>} Result object with success status and configuration data
 *
 * @example
 * const result = await system_config_dump(app, { key: "debug-key" });
 *
 * if (result.ok) {
 *   console.log(`Configuration:`, result.data);
 * }
 */
export const system_config_dump = async ( ctx : LiWECtx, params : SystemConfigDumpParams ) : Promise<LiWEResponse<SystemConfigDumpResult>> => {
	/*=== f2c_start system_config_dump ===*/
	try {
		// Validate the input params
		const validation = SystemConfigDumpSchema.safeParse( params );
		if ( !validation.success ) {
			return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
		}

		// Basic security check - ensure key is provided
		const { key } = validation.data;
		if ( !key ) return responseError( 'Invalid key parameter', 403, 'UNAUTHORIZED' );

		if ( key != ctx.app.cfg.site.debugKey ) return responseError( 'Invalid key parameter', 403, 'UNAUTHORIZED' );

		// Dump the configuration
		const configData = ctx.app.cfg || {};

		return responseSuccess( configData );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DUMP_ERROR' );
	}
	/*=== f2c_end system_config_dump ===*/
};
