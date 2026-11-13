import { LiWEApp, type LiWECtx, ext2mime } from '@backend/liwe3';
import { Message } from '@cloudflare/workers-types';
import { createThumbnail } from '@liwe3/thumbnailer';
import { keyBuild, keyExp } from './methods/utils';

/** Mime types the thumbnailer (jsquash) can actually decode. */
const THUMBNAILABLE_MIME_TYPES = [ 'image/jpeg', 'image/jpg', 'image/png' ];

const queue_create_thumbnail = async ( ctx : LiWECtx, message : Message ) => {
	const { key, domain } = message.body as any;

	const mimeType = ext2mime( key );

	// Not a supported image: ack so the message is not retried forever
	// (no dead-letter queue is configured). upload_get falls back to the original.
	if ( !THUMBNAILABLE_MIME_TYPES.includes( mimeType ) ) {
		console.warn( `[thumbnail] skipping '${key}': unsupported mime type '${mimeType}'` );
		message.ack();
		return;
	}

	try {
		const object = await ctx.app.env.UPLOAD_BUCKET.get( key );
		if ( !object ) {
			// The original is gone - retrying will not help, so ack and drop.
			console.error( `[thumbnail] source file not found in UPLOAD_BUCKET: '${key}'` );
			message.ack();
			return;
		}

		const fileBuffer = await object.arrayBuffer();
		console.log( `[thumbnail] generating for ${domain} / '${key}' (${mimeType}, ${fileBuffer.byteLength} bytes)...` );

		const thumbnailBuffer = await createThumbnail( fileBuffer, 300, 300, mimeType );

		const parts = keyExp( key );
		const thumbKey = `${parts.domain}|thumbnails/${parts.fullPath}|${parts.originalFileName}`;
		await ctx.app.env.THUMBNAIL_BUCKET.put( thumbKey, thumbnailBuffer, {
			httpMetadata: { contentType: 'image/jpeg' },
		} );

		console.log( `[thumbnail] created '${thumbKey}' (${thumbnailBuffer.byteLength} bytes)` );
		message.ack();
	} catch ( error ) {
		// Transient failure (e.g. WASM init, R2 hiccup): do NOT ack, let the queue retry.
		let detail : string;
		if ( error instanceof Error ) {
			detail = error.stack ?? error.message;
		} else {
			try {
				detail = JSON.stringify( error );
			} catch {
				detail = String( error );
			}
		}
		console.error( `[thumbnail] generation failed for '${key}' (${mimeType}): ${detail}` );
	}
};

const delete_thumbnail_logic = async ( ctx : LiWECtx, key : string, domain : string ) => {
	const thumbKey = `${domain}|thumbnails/${key}`;
	const bucket = ( ctx.app.env as any ).THUMBNAIL_BUCKET || ctx.app.env.UPLOAD_BUCKET;
	await bucket.delete( thumbKey );
	console.log( `Thumbnail deleted: ${thumbKey}` );
};

const queue_delete_all = async ( ctx : LiWECtx, message : Message ) => {
	const { key, domain } = message.body as any;
	try {
		await ctx.app.env.UPLOAD_BUCKET.delete( key );
		console.log( `File deleted: ${key}` );
		await delete_thumbnail_logic( ctx, key, domain );
		message.ack();
	} catch ( error ) {
		console.error( `Error deleting file/thumbnail for ${key}:`, error );
	}
};

export const queue_init = ( app : LiWEApp ) => {
	console.log( '    - Queue' );
	app.queueAdd( 'upload.thumbnail', queue_create_thumbnail );
	app.queueAdd( 'upload.delete', queue_delete_all );
};
