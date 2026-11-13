// A file has been successfully uploaded
export const UPLOAD_EVENT_FILE_COMPLETE = 'upload.file_complete';

// Upload has been aborted
export const UPLOAD_EVENT_ABORT = 'upload.abort';

// Count the files inside one or more folders (callable by other modules). Payload: { domain: string, folders: string[] }. Returns { counts: Record<string, number> }, one entry per requested folder. Folders are relative, the domain prefix is added internally
export const UPLOAD_CALL_COUNT = 'upload.call.count';

// List the files inside a single folder (callable by other modules). Payload: { domain: string, folder: string }. Returns UploadFileList. The folder is relative, the domain prefix is added internally
export const UPLOAD_CALL_LIST = 'upload.call.list';

// Delete a file or a complete folder (callable by other modules). Payload: { pattern: string } (same param as upload_del). Forwards the payload to the upload_del method with the caller ctx and returns its response untouched. The pattern must belong to the domain of the caller
export const UPLOAD_CALL_DEL = 'upload.call.del';
