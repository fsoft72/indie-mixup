import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UploadMultipartInfo } from '../types';

/**
 * Schema for Start a multi-part upload

The optional parameter name `folder` is for the virtual destination folder of the bucket. By default, if not specified, it will be `uploads`

The bucket folder will be prefixed by the user `domain` name internally, so for eg. if the user belongs to the 'test' domain and folder is `profiles`, the final folder name will be `test/profiles`
 *
 * @property {string} fileName - The file's filename (required)
 * @property {string} fileType - The file's file type (required)
 * @property {[string]} folder - The destination folder
 */
const UploadInitiateSchema = z.object( {
	fileName: z.string(),
	fileType: z.string(),
	folder: z.string().optional().default( 'uploads' ),
} );

/** Parameters for upload_initiate */
export type UploadInitiateParams = z.infer<typeof UploadInitiateSchema>;

/*=== f2c_start upload_initiate_headers ===*/

import { keyBuild, keyInDomain } from './utils';
/*=== f2c_end upload_initiate_headers ===*/

/**
 * Start a multi-part upload
 *
 * The optional parameter name `folder` is for the virtual destination folder of the bucket. By default, if not specified, it will be `uploads`
 *
 * The bucket folder will be prefixed by the user `domain` name internally, so for eg. if the user belongs to the 'test' domain and folder is `profiles`, the final folder name will be `test/profiles`
 *
 * @permissions upload.send_file
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {UploadInitiateParams} params - Request parameters
 * @param {string} params.fileName - The file's filename
 * @param {string} params.fileType - The file's file type
 * @param {string} ?params.folder - The destination folder
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UploadMultipartInfo>>} Result object with success status and data or error details
 */
export const upload_initiate = async ( ctx : LiWECtx, params : UploadInitiateParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UploadMultipartInfo>> => {
	const validation = paramsValidation<UploadInitiateParams>( UploadInitiateSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { fileName, fileType, folder } = validation.data;

	/*=== f2c_start upload_initiate ===*/
	// authorization is on the route gate (see index.ts)

	// Use a time-based key so uploads are unique, or customize as needed
	const user = await ctx.user();
	if ( !keyInDomain( user?.domain ?? '_', folder ) ) return responseError( 'The key belongs to another domain', 403, ERR_PERMISSION_DENIED );
	const key = keyBuild( user?.domain ?? '_', folder, fileName );

	console.log( '=== INITIATE: ', { key, folder, fileName, fileType } );

	const multipartUpload = await ctx.app.env.UPLOAD_BUCKET.createMultipartUpload( key, {
		httpMetadata: {
			contentType: fileType || 'application/octet-stream',
		},
	} );

	return responseSuccess(
		{
			uploadId: multipartUpload.uploadId,
			key: multipartUpload.key,
		},
	);
	/*=== f2c_end upload_initiate ===*/
};
