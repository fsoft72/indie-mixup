import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UploadMultipartComplete } from '../types';

/**
 * Schema for upload_complete parameters
 *
 * @property {string} uploadId - The upload id (required)
 * @property {string} key - The file key (required)
 * @property {string} parts - Parts description (required)
 */
const UploadCompleteSchema = z.object( {
	uploadId: z.string(),
	key: z.string(),
	parts: z.any(),
} );

/** Parameters for upload_complete */
export type UploadCompleteParams = z.infer<typeof UploadCompleteSchema>;

/*=== f2c_start upload_complete_headers ===*/

import { liwe_event_emit } from '@backend/liwe3';
import { UPLOAD_EVENT_FILE_COMPLETE } from '../events';
import { keyInDomain } from './utils';
/*=== f2c_end upload_complete_headers ===*/

/**
 * Complete multipart upload
 *
 * @permissions upload.send_file
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {UploadCompleteParams} params - Request parameters
 * @param {string} params.uploadId - The upload id
 * @param {string} params.key - The file key
 * @param {string} params.parts - Parts description
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UploadMultipartComplete>>} Result object with success status and data or error details
 */
export const upload_complete = async ( ctx : LiWECtx, params : UploadCompleteParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UploadMultipartComplete>> => {
	const validation = paramsValidation<UploadCompleteParams>( UploadCompleteSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { uploadId, key, parts } = validation.data;

	/*=== f2c_start upload_complete ===*/
	// authorization is on the route gate (see index.ts)

	const user = await ctx.user();
	if ( !keyInDomain( user?.domain ?? '_', key ) || key.indexOf( '|' ) === -1 ) return responseError( 'The key belongs to another domain', 403, ERR_PERMISSION_DENIED );

	console.log( `=== UPLOAD COMPLETE: Completing multipart upload: ${key}, ${parts.length} parts` );

	const multipartUpload = ctx.app.env.UPLOAD_BUCKET.resumeMultipartUpload( key, uploadId );

	// Complete the upload - R2 will automatically delete all uploaded parts
	// and assemble them into the final object
	const object = await multipartUpload.complete( parts );

	console.log( `=== Upload completed successfully: ${object.key}, size: ${object.size} bytes` );

	const data = {
		success: true,
		key: object.key,
		size: object.size,
		etag: object.etag,
	};

	// emit event for upload complete
	await liwe_event_emit( ctx, UPLOAD_EVENT_FILE_COMPLETE, data );

	// Send to thumbnail queue if available
	if ( ctx.app.env.THUMBNAIL_QUEUE ) {
		try {
			await ctx.app.env.THUMBNAIL_QUEUE.send( {
				key: object.key,
				uploadId: uploadId,
				domain: user?.domain ?? '_',
				action: 'upload.thumbnail',
			} );
			console.log( `=== Queued thumbnail generation for: ${object.key}` );
		} catch ( e ) {
			console.error( `=== Failed to queue thumbnail generation: ${e}` );
		}
	}

	return responseSuccess( data );
	/*=== f2c_end upload_complete ===*/
};
