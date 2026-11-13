import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UploadMultipartPart } from '../types';

/*=== f2c_start upload_part_headers ===*/
import { keyInDomain } from './utils';
/*=== f2c_end upload_part_headers ===*/

/**
 * Upload a part of the file.
 * Part is uploaded in raw binary data
 * Headers must contain these special headers:
 *   - X-Upload-Id
 *   - X-Key
 *   - X-Part-Number
 *
 * Body is a raw binary data
 *
 *  *                                      Returns: {partNumber: number, etag: string}
 *
 * @permissions upload.send_file
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UploadMultipartPart>>} Result object with success status and data or error details
 */
export const upload_part = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<UploadMultipartPart>> => {
	/*=== f2c_start upload_part ===*/
	// authorization is on the route gate (see index.ts)

	if ( !ctx.c ) return responseError( 'No context provided', 500, 'ERROR_NO_CONTEXT' );

	// Read metadata from headers
	const uploadId = ctx.c?.req.header( 'X-Upload-Id' );
	const key = ctx.c?.req.header( 'X-Key' );
	const partNumber = parseInt( ctx.c?.req.header( 'X-Part-Number' ) ?? '0', 10 );

	if ( !uploadId || !key || !partNumber ) return responseError( 'Missing required headers: X-Upload-Id, X-Key, X-Part-Number', 400, 'ERROR_MISSING_HEADERS' );
	const user = await ctx.user();
	if ( !keyInDomain( user?.domain ?? '_', key ) || key.indexOf( '|' ) === -1 ) return responseError( 'The key belongs to another domain', 403, ERR_PERMISSION_DENIED );

	const binaryData = await ctx.c?.req.arrayBuffer();

	if ( !binaryData || binaryData.byteLength === 0 ) return responseError( 'Empty request body', 400, 'ERROR_EMPTY_BODY' );

	const multipartUpload = ctx.app.env.UPLOAD_BUCKET.resumeMultipartUpload( key, uploadId );
	const uploadedPart = await multipartUpload.uploadPart( partNumber, binaryData );

	return responseSuccess( {
		partNumber: uploadedPart.partNumber,
		etag: uploadedPart.etag,
	} );
	/*=== f2c_end upload_part ===*/
};
