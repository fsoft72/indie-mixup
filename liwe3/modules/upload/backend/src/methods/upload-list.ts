import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UploadFileList } from '../types';

/**
 * Schema for List all files inside a specific folder
If the list is too long, it will be truncated. In this case, the call will return `truncated` set to true and a `cursor` string that can be passed to another call to `/upload/list` to obtain another part of the list
 *
 * @property {string} folder - The folder to be listed (required)
 * @property {[string]} cursor - The cursor for truncated lists
 * @property {[number]} limit - Maximum number of objects to retrieve per call
 */
const UploadListSchema = z.object( {
	folder: z.string(),
	cursor: z.string().optional(),
	limit: z.coerce.number().optional(),
} );

/** Parameters for upload_list */
export type UploadListParams = z.infer<typeof UploadListSchema>;

/*=== f2c_start upload_list_headers ===*/
import { R2Object } from '@cloudflare/workers-types';
import { keyFullFolder, keyInDomain } from './utils';
/*=== f2c_end upload_list_headers ===*/

/**
 * List all files inside a specific folder
 * If the list is too long, it will be truncated. In this case, the call will return `truncated` set to true and a `cursor` string that can be passed to another call to `/upload/list` to obtain another part of the list
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {UploadListParams} params - Request parameters
 * @param {string} params.folder - The folder to be listed
 * @param {string} ?params.cursor - The cursor for truncated lists
 * @param {number} ?params.limit - Maximum number of objects to retrieve per call
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UploadFileList>>} Result object with success status and data or error details
 */
export const upload_list = async ( ctx : LiWECtx, params : UploadListParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UploadFileList>> => {
	const validation = paramsValidation<UploadListParams>( UploadListSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { folder, cursor, limit } = validation.data;

	/*=== f2c_start upload_list ===*/
	const user = await ctx.user();

	if ( !user ) return responseError( 'User not authenticated', 401, 'ERROR_NOT_AUTHENTICATED' );

	if ( !keyInDomain( user.domain ?? '_', folder ) ) return responseError( 'The key belongs to another domain', 403, ERR_PERMISSION_DENIED );
	const prefix = keyFullFolder( user.domain ?? '_', folder );
	console.log( '=== LIST: ', { prefix } );
	const listed = await ctx.app.env.UPLOAD_BUCKET.list( { prefix, cursor, limit } );
	const res : UploadFileList = {
		truncated: listed.truncated,
		cursor: listed.cursor,
		objects: [],
	};

	listed.objects.forEach( ( obj : R2Object ) => {
		res.objects.push( {
			key: obj.key,
			etag: obj.etag,
			size: obj.size,
			version: obj.version,
			uploaded: obj.uploaded,
		} );
	} );

	return responseSuccess( res );
	/*=== f2c_end upload_list ===*/
};
