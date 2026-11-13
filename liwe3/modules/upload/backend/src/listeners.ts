import { LiWEApp, type LiWECtx, liwe_event_register, logger, responseError, responseSuccess } from '@backend/liwe3';
import { z } from 'zod';
import { UPLOAD_CALL_COUNT, UPLOAD_CALL_DEL, UPLOAD_CALL_LIST } from './events';
import { upload_del } from './methods';
import { keyFullFolder } from './methods/utils';
import type { UploadFileList } from './types';
import type { R2Object } from '@cloudflare/workers-types';

export const ZUploadCountSchema = z.object( {
	domain: z.string().min( 1 ),
	folders: z.array( z.string() ),
} );

export const ZUploadListCallSchema = z.object( {
	domain: z.string().min( 1 ),
	folder: z.string(),
} );

/**
 * Builds the R2 prefix that matches the files INSIDE a folder (and not the
 * sibling folders sharing the same textual prefix, e.g. "c1" vs "c10").
 *
 * @param domain - the domain of the folder
 * @param folder - the relative folder
 */
const _folderPrefix = ( domain : string, folder : string ) : string => `${keyFullFolder( domain, folder )}/`;

/**
 * Counts all the R2 objects under a prefix, following the cursor until the list is not truncated.
 *
 * @param ctx - the request context
 * @param prefix - the R2 prefix
 */
const _countObjects = async ( ctx : LiWECtx, prefix : string ) : Promise<number> => {
	let total = 0;
	let cursor : string | undefined;

	do {
		const page = await ctx.app.env.UPLOAD_BUCKET.list( { prefix, cursor } );
		total += page.objects.length;
		cursor = page.truncated ? page.cursor : undefined;
	} while ( cursor );

	return total;
};

/**
 * Registers the upload.call.* listeners (callable by other modules via liwe_event_call).
 *
 * @param app - the LiWE application
 */
export const listeners_init = ( app : LiWEApp ) => {
	console.log( '    - listeners' );

	/**
	 * upload.call.count
	 * Payload: { domain, folders }. Returns { counts: Record<folder, number> }, one entry per
	 * requested folder (0 when empty). Folders are relative: the domain prefix is added here.
	 */
	liwe_event_register( UPLOAD_CALL_COUNT, async ( ctx : LiWECtx, event_data : unknown ) => {
		const validated = ZUploadCountSchema.safeParse( event_data );
		if ( !validated.success ) return responseError( validated.error.message, 400, 'ERROR_INVALID_UPLOAD_COUNT_DATA' );

		const { domain, folders } = validated.data;
		const counts : Record<string, number> = {};

		for ( const folder of folders ) {
			counts[folder] = await _countObjects( ctx, _folderPrefix( domain, folder ) );
		}

		return responseSuccess( { counts } );
	} );

	/**
	 * upload.call.list
	 * Payload: { domain, folder }. Returns an UploadFileList (first page; `truncated` and
	 * `cursor` are set when the folder holds more files than one R2 page).
	 */
	liwe_event_register( UPLOAD_CALL_LIST, async ( ctx : LiWECtx, event_data : unknown ) => {
		const validated = ZUploadListCallSchema.safeParse( event_data );
		if ( !validated.success ) return responseError( validated.error.message, 400, 'ERROR_INVALID_UPLOAD_LIST_DATA' );

		const { domain, folder } = validated.data;
		const listed = await ctx.app.env.UPLOAD_BUCKET.list( { prefix: _folderPrefix( domain, folder ) } );

		const res : UploadFileList = {
			truncated: listed.truncated,
			cursor: listed.cursor,
			objects: listed.objects.map( ( obj : R2Object ) => ( {
				key: obj.key,
				etag: obj.etag,
				size: obj.size,
				version: obj.version,
				uploaded: obj.uploaded,
			} ) ),
		};

		return responseSuccess( res );
	} );

	/**
	 * upload.call.del
	 * Payload: { pattern } (same as upload_del). Forwards to upload_del with the caller ctx and returns its response
	 * untouched (the domain check of the pattern is done by the method); an unexpected exception becomes a 500.
	 */
	liwe_event_register( UPLOAD_CALL_DEL, async ( ctx : LiWECtx, event_data : unknown ) => {
		try {
			return await upload_del( ctx, event_data as any );
		} catch ( err ) {
			// the thrown text may carry internals: log it, answer a generic message
			logger.error( 'Upload call failed', err instanceof Error ? err : undefined, { event: UPLOAD_CALL_DEL } );
			return responseError( 'Upload call failed', 500, 'ERROR_UPLOAD_CALL' );
		}
	} );
};
