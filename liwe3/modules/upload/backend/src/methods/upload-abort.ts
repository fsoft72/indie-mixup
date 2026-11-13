import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Abort multipart upload and cleanup parts
 *
 * @property {string} uploadId - The upload id (required)
 * @property {string} key - The file key (required)
 */
const UploadAbortSchema = z.object( {
	uploadId: z.string(),
	key: z.string(),
} );

/** Parameters for upload_abort */
export type UploadAbortParams = z.infer<typeof UploadAbortSchema>;

/*=== f2c_start upload_abort_headers ===*/

import { liwe_event_emit } from '@backend/liwe3';
import { UPLOAD_EVENT_ABORT } from '../events';
import { keyInDomain } from './utils';
/*=== f2c_end upload_abort_headers ===*/

/**
 * Abort multipart upload and cleanup parts
 *
 * @permissions upload.send_file
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {UploadAbortParams} params - Request parameters
 * @param {string} params.uploadId - The upload id
 * @param {string} params.key - The file key
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const upload_abort = async ( ctx : LiWECtx, params : UploadAbortParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<UploadAbortParams>( UploadAbortSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { uploadId, key } = validation.data;

	/*=== f2c_start upload_abort ===*/
	// authorization is on the route gate (see index.ts)

	const user = await ctx.user();
	if ( !keyInDomain( user?.domain ?? '_', key ) || key.indexOf( '|' ) === -1 ) return responseError( 'The key belongs to another domain', 403, ERR_PERMISSION_DENIED );

	const multipartUpload = ctx.app.env.UPLOAD_BUCKET.resumeMultipartUpload( key, uploadId );

	// Abort the upload - this will delete all uploaded parts and free up storage
	await multipartUpload.abort();

	await liwe_event_emit( ctx, UPLOAD_EVENT_ABORT );

	return responseSuccess( true );
	/*=== f2c_end upload_abort ===*/
};
