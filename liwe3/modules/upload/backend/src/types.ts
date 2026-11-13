import { z } from 'zod';
import { zodBoolean } from '@backend/liwe3';

/*=== f2c_start __types ===*/

// Add custom imports or types here
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
