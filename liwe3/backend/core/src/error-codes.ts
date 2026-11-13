/**
 * Standard error codes for LiWE3 API responses
 *
 * Use these constants for consistent error handling across all modules.
 */

// Authentication & Authorization
export const ERR_UNAUTHORIZED = 'UNAUTHORIZED';
export const ERR_PERMISSION_DENIED = 'PERMISSION_DENIED';
export const ERR_SESSION_EXPIRED = 'SESSION_EXPIRED';

// Validation
export const ERR_VALIDATION = 'VALIDATION_ERROR';
export const ERR_INVALID_INPUT = 'INVALID_INPUT';
export const ERR_MISSING_FIELD = 'MISSING_FIELD';

// Resources
export const ERR_NOT_FOUND = 'NOT_FOUND';
export const ERR_ALREADY_EXISTS = 'ALREADY_EXISTS';
export const ERR_CONFLICT = 'CONFLICT';

// Database
export const ERR_DB_ERROR = 'DB_ERROR';
export const ERR_DB_CONSTRAINT = 'DB_CONSTRAINT';
export const ERR_DB_CONNECTION = 'DB_CONNECTION';

// External Services
export const ERR_EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR';
export const ERR_API_ERROR = 'API_ERROR';
export const ERR_TIMEOUT = 'TIMEOUT';

// File/Storage
export const ERR_STORAGE_ERROR = 'STORAGE_ERROR';
export const ERR_FILE_NOT_FOUND = 'FILE_NOT_FOUND';
export const ERR_UPLOAD_FAILED = 'UPLOAD_FAILED';

// Rate Limiting
export const ERR_RATE_LIMITED = 'RATE_LIMITED';
export const ERR_QUOTA_EXCEEDED = 'QUOTA_EXCEEDED';

// Generic
export const ERR_INTERNAL = 'INTERNAL_ERROR';
export const ERR_NOT_IMPLEMENTED = 'NOT_IMPLEMENTED';
