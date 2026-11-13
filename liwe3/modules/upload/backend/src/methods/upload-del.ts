import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Remove one or more files from the bucket
At the moment, `pattern` is quite simple: it just supports '*' char

If `pattern` points to a folder name, all files under that folder will be deleted.
 *
 * @property {string} pattern - The pattern of files to be removed (required)
 */
const UploadDelSchema = z.object( {
	pattern: z.string(),
} );

/** Parameters for upload_del */
export type UploadDelParams = z.infer<typeof UploadDelSchema>;

/*=== f2c_start upload_del_headers ===*/

import { deleteTarget, keyAddFolder, keyInDomain } from './utils';
/*=== f2c_end upload_del_headers ===*/

/**
 * Remove one or more files from the bucket
 * At the moment, `pattern` is quite simple: it just supports '*' char
 *
 * If `pattern` points to a folder name, all files under that folder will be deleted.
 *
 * @permissions upload.delete
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {UploadDelParams} params - Request parameters
 * @param {string} params.pattern - The pattern of files to be removed
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const upload_del = async ( ctx : LiWECtx, params : UploadDelParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<UploadDelParams>( UploadDelSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { pattern } = validation.data;

	/*=== f2c_start upload_del ===*/
	// authorization is on the route gate (see index.ts)

	const user = await ctx.user();
	const domain = user?.domain ?? '_';

	// A full key / folder must belong to the caller's domain
	if ( !keyInDomain( domain, pattern.trim() ) ) return responseError( 'The key belongs to another domain', 403, ERR_PERMISSION_DENIED );
	// Only one file or one complete folder: never the whole domain, never a bare prefix of folder names
	const target = deleteTarget( domain, pattern );
	if ( !target ) return responseError( 'A file key or a complete folder name is required', 400, 'ERROR_INVALID_PATTERN' );
	const fullPrefix = target.prefix;
	let deleted = 0;

	let truncated = true;
	let cursor : string | undefined;

	while ( truncated ) {
		console.log( '=== LIST PREFIX: ', fullPrefix );
		const listed = await ctx.app.env.UPLOAD_BUCKET.list( { prefix: fullPrefix, cursor } );
		truncated = listed.truncated;
		cursor = listed.cursor;

		const keysToDelete : string[] = [];
		const thumbsToDelete : string[] = [];

		for ( const obj of listed.objects ) {
			if ( target.exact && obj.key !== target.prefix ) continue;
			thumbsToDelete.push( keyAddFolder( 'thumbnails', obj.key ) );
			keysToDelete.push( obj.key );
		}

		console.log( '=== TO DELETE: ', { keysToDelete, thumbsToDelete } );

		if ( keysToDelete.length > 0 ) {
			await ctx.app.env.UPLOAD_BUCKET.delete( keysToDelete );
			deleted += keysToDelete.length;
			// The thumbnail bucket is optional (no binding in app/backend)
			if ( ctx.app.env.THUMBNAIL_BUCKET ) await ctx.app.env.THUMBNAIL_BUCKET.delete( thumbsToDelete );
		}
	}

	// Nothing matched: tell the caller instead of pretending a delete happened
	if ( !deleted ) return responseError( 'No file or folder matches the pattern', 400, 'ERROR_NO_MATCH' );

	return responseSuccess( true );
	/*=== f2c_end upload_del ===*/
};
