import decodeJpeg, { init as initJpegDec } from '@jsquash/jpeg/decode';
import encodeJpeg, { init as initJpegEnc } from '@jsquash/jpeg/encode';
import decodePng, { init as initPng } from '@jsquash/png/decode';
import resize, { initResize } from '@jsquash/resize';

// @ts-ignore
import jpegDecWasm from '@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm';
// @ts-ignore
import jpegEncWasm from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm';
// @ts-ignore
import pngWasm from '@jsquash/png/codec/pkg/squoosh_png_bg.wasm';
// @ts-ignore
import resizeWasm from '@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm';

let initialized = false;

const init = async () => {
	if ( initialized ) return;

	await Promise.all( [
		initJpegDec( {
			instantiateWasm: ( info : any, receiveInstance : any ) => {
				WebAssembly.instantiate( jpegDecWasm, info ).then( ( instance ) => {
					receiveInstance( instance, jpegDecWasm );
				} );
				return {};
			},
		} ),
		initJpegEnc( {
			instantiateWasm: ( info : any, receiveInstance : any ) => {
				WebAssembly.instantiate( jpegEncWasm, info ).then( ( instance ) => {
					receiveInstance( instance, jpegEncWasm );
				} );
				return {};
			},
		} ),
		initPng( pngWasm ),
		initResize( resizeWasm ),
	] );

	initialized = true;
};

export const createThumbnail = async ( file : ArrayBuffer, width : number, height : number, mimeType : string ) : Promise<ArrayBuffer> => {
	await init();
	let imageData;

	if ( mimeType === 'image/jpeg' || mimeType === 'image/jpg' ) {
		imageData = await decodeJpeg( file );
	} else if ( mimeType === 'image/png' ) {
		imageData = await decodePng( file );
	} else {
		throw new Error( `Unsupported mime type: ${mimeType}` );
	}

	const ratio = Math.min( width / imageData.width, height / imageData.height );
	const newWidth = Math.round( imageData.width * ratio );
	const newHeight = Math.round( imageData.height * ratio );

	const resizedImage = await resize( imageData, { width: newWidth, height: newHeight } );
	const outputBuffer = await encodeJpeg( resizedImage );

	return outputBuffer;
};
