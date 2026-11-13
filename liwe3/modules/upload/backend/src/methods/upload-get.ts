import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Return a file by key
The key can be a full key with domain (eg. `domain|path|original_filename`) or a partial name without domain, like `path|original_filename`. In the second case, the domain will be added by the endpoint before retrieval.
Endpoint tries to set the right mime-type and filename

The optional `variant` may be `file` | `thumb`    if it is `thumb` the image thumbnail is returned.
 *
 * @property {string} key - The full or partial key (required)
 * @property {[string]} variant - The `variant` for the file
 */
const UploadGetSchema = z.object( {
	key: z.string(),
	variant: z.string().optional(),
} );

/** Parameters for upload_get */
export type UploadGetParams = z.infer<typeof UploadGetSchema>;

/*=== f2c_start upload_get_headers ===*/
import { keyExp, serveHeaders } from './utils';
/*=== f2c_end upload_get_headers ===*/

/**
 * Return a file by key
 * The key can be a full key with domain (eg. `domain|path|original_filename`) or a partial name without domain, like `path|original_filename`. In the second case, the domain will be added by the endpoint before retrieval.
 * Endpoint tries to set the right mime-type and filename
 *
 * The optional `variant` may be `file` | `thumb`    if it is `thumb` the image thumbnail is returned.
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {UploadGetParams} params - Request parameters
 * @param {string} params.key - The full or partial key
 * @param {string} ?params.variant - The `variant` for the file
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const upload_get = async ( ctx : LiWECtx, params : UploadGetParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<UploadGetParams>( UploadGetSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { key, variant } = validation.data;

	/*=== f2c_start upload_get ===*/
	// count how many "|" the key has
	const pipeCount = ( key?.match( /\|/g ) || [] ).length;
	const isKeyFull = pipeCount === 2;
	let finalKey = key;

	if ( !isKeyFull ) finalKey = `${ctx.app.cfg.system.domain ?? '_'}|${key}`;

	// 2. Determine Bucket and Key
	let bucket = ctx.app.env.UPLOAD_BUCKET;

	if ( variant === 'thumb' ) {
		const thumbBucket = ctx.app.env.THUMBNAIL_BUCKET || ctx.app.env.UPLOAD_BUCKET;
		// Reconstruct the thumbnail key the same way queue_create_thumbnail writes it
		const parts = keyExp( finalKey );
		const thumbKey = `${parts.domain}|thumbnails/${parts.fullPath}|${parts.originalFileName}`;

		const thumbObject = await thumbBucket.get( thumbKey );
		if ( thumbObject ) {
			// 3a. Thumbnail is available - stream it
			return _streamObject( thumbObject );
		}

		// Thumbnail not generated yet (async queue job) or generation failed:
		// fall back to the original file so the preview still renders.
		console.warn( `upload_get: thumbnail missing for '${finalKey}', serving original` );
	}

	// 3b. Fetch the original from R2 (honouring a Range request: Safari and iOS refuse to play video without it)
	const rangeHeader = ctx.c?.req.header( 'range' );
	const object = await bucket.get( finalKey, rangeHeader ? { range: ctx.c!.req.raw.headers } : undefined );

	if ( !object ) return responseError( 'File not found', 404, 'FILE_NOT_FOUND' );

	// 4. Return stream with correct headers
	const streamed = _streamObject( object );
	if ( !streamed.response ) return streamed;
	streamed.response.headers.set( 'accept-ranges', 'bytes' );

	const range = ( object as { range? : { offset? : number; length? : number; suffix? : number } } ).range;
	if ( !rangeHeader || !range ) return streamed;

	const size = object.size;
	const offset = range.offset ?? ( range.suffix !== undefined ? Math.max( 0, size - range.suffix ) : 0 );
	const length = range.length ?? ( size - offset );
	const partialHeaders = new Headers( streamed.response.headers );
	partialHeaders.set( 'content-range', `bytes ${offset}-${offset + length - 1}/${size}` );
	partialHeaders.set( 'content-length', String( length ) );
	streamed.response = new Response( object.body, { status: 206, headers: partialHeaders } );
	return streamed;
	/*=== f2c_end upload_get ===*/
};

/** One year, in seconds - upload keys are immutable so the thumbnail/original never changes. */
const CACHE_DURATION_SECONDS = 31536000;

/**
 * Wrap an R2 object body in a cache-friendly streaming LiWEResponse.
 *
 * @param {R2ObjectBody} object - The R2 object to stream back to the client
 * @returns {LiWEResponse<boolean>} A success response carrying the raw `Response` stream
 */
const _streamObject = ( object : any ) : LiWEResponse<boolean> => {
	const headers = new Headers();
	object.writeHttpMetadata( headers );
	headers.set( 'etag', object.httpEtag );
	// Uploads are served from the app origin: never let an uploaded HTML / SVG run as a page (serveHeaders)
	serveHeaders( headers, String( object.key ?? '' ) );
	// max-age is for the browser; s-maxage overrides it for Cloudflare/CDNs.
	headers.set(
		'Cache-Control',
		`public, max-age=${CACHE_DURATION_SECONDS}, s-maxage=${CACHE_DURATION_SECONDS}, immutable`,
	);

	const response = responseSuccess( true );
	response.response = new Response( object.body, { headers } );
	return response;
};
