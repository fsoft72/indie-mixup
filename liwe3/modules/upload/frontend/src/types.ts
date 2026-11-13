import { z } from 'zod';
import { zodBoolean } from '@frontend/liwe3';

/*=== f2c_start __types ===*/

/**
 * Result of a successful single file upload
 */
export interface SingleFileUploadResult {
	/** The unique key to retrieve the file from R2 */
	key : string;

	/** Original file name */
	originalFileName : string;

	/** File size in bytes */
	size : number;

	/** File MIME type */
	mimeType : string;

	/** ETag of the uploaded file */
	etag : string;

	/** Full URL to retrieve the file */
	url : string;

	/** URL to retrieve thumbnail (if image) */
	thumbnailUrl? : string;
}

/**
 * Error information for failed uploads
 */
export interface SingleFileUploadError {
	/** Error code */
	code : 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'UPLOAD_FAILED' | 'ABORTED' | 'NETWORK_ERROR';

	/** Human-readable error message */
	message : string;

	/** Original error if available */
	originalError? : Error;
}

/**
 * Upload state for internal tracking
 */
export type SingleFileUploadState = 'idle' | 'selected' | 'uploading' | 'completed' | 'error';
/*=== f2c_end __types ===*/

/**
 * Schema for UploadMultipartInfo
 *
 * @property {str} uploadId - The unique multipart id (required)
 * @property {str} key - The unique upload key (required)
 */
const ZUploadMultipartInfo = z.object( {
	uploadId: z.string(),
	key: z.string(),
} );

export type UploadMultipartInfo = z.infer<typeof ZUploadMultipartInfo>;
export { ZUploadMultipartInfo };

/**
 * Schema for UploadMultipartPart
 *
 * @property {num} partNumber - The part number (required)
 * @property {str} etag - The chunk etag (required)
 */
const ZUploadMultipartPart = z.object( {
	partNumber: z.coerce.number(),
	etag: z.string(),
} );

export type UploadMultipartPart = z.infer<typeof ZUploadMultipartPart>;
export { ZUploadMultipartPart };

/**
 * Schema for UploadMultipartComplete
 *
 * @property {bool} success - Flag T/F if upload successfully completed (required)
 * @property {str} key - The file key (required)
 * @property {num} size - The file size in bytes (required)
 * @property {str} etag - The file etag (required)
 */
const ZUploadMultipartComplete = z.object( {
	success: zodBoolean.default( false ),
	key: z.string(),
	size: z.coerce.number(),
	etag: z.string(),
} );

export type UploadMultipartComplete = z.infer<typeof ZUploadMultipartComplete>;
export { ZUploadMultipartComplete };

/**
 * Schema for UploadFile
 *
 * @property {str} key - The object's full name (path) (required)
 * @property {str} etag - The ETag for the object, which is a hash of its contents (required)
 * @property {num} size - The size of the object in bytes (required)
 * @property {str} version - The object's version string (required)
 * @property {datetime} uploaded - The date and time the object was last modified/uploaded (required)
 */
const ZUploadFile = z.object( {
	key: z.string(),
	etag: z.string(),
	size: z.coerce.number(),
	version: z.string(),
	uploaded: z.coerce.date(),
} );

export type UploadFile = z.infer<typeof ZUploadFile>;
export { ZUploadFile };

/**
 * Schema for UploadFileList
 *
 * @property {UploadFile[]} objects - An array containing the list of objects (required)
 * @property {bool} truncated - A flag T/F indicating whether the list of results was truncated (required)
 * @property {[str]} cursor - A string token used for pagination
 */
const ZUploadFileList = z.object( {
	objects: z.any().array(),
	truncated: zodBoolean.default( false ),
	cursor: z.string().optional(),
} );

export type UploadFileList = z.infer<typeof ZUploadFileList>;
export { ZUploadFileList };
