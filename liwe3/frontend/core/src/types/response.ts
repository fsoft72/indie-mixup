/**
 * LiWE3 Response Utilities
 *
 * This module provides standardized response formatting for all LiWE3 API endpoints.
 */

/**
 * Standard error object format for LiWE3 responses
 */
export type LiWEError = {
	/** Error message describing what went wrong */
	message : string;
	/** Optional error code for programmatic handling */
	code? : string;
	/** Optional additional details about the error */
	level? : 'info' | 'warning' | 'error';
};

/**
 * Standard response format for all LiWE3 API endpoints
 * @template T - The type of data being returned
 */
export type LiWEResponse<T = any> = {
	/** Whether the operation was successful */
	ok : boolean;
	/** HTTP status code */
	status : number;
	/** Response data (omitted if null or undefined) */
	data? : T;
	/** Human-readable message (it will contain the error message if ok is false) */
	message? : string;
	/** Error details (only present when ok is false) */
	error? : LiWEError;
};
