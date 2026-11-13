/**
 * LiWE3 Response Utilities
 *
 * This module provides standardized response formatting for all LiWE3 API endpoints.
 */

import { ContentfulStatusCode } from 'hono/utils/http-status';
import { logger } from './logger';

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
	status : ContentfulStatusCode;
	/** Response data (omitted if null or undefined) */
	data? : T;
	/** Human-readable message (it will contain the error message if ok is false) */
	message? : string;
	/** Error details (only present when ok is false) */
	error? : LiWEError;
	/** Optional raw Response object (for streams, files, etc.) */
	response? : Response;
};

/**
 * Creates a standardized LiWE3 response object
 *
 * @template T - The type of data being returned
 * @param error - Error object (null/undefined for success)
 * @param data - Response data (omitted if null/undefined)
 * @param status - HTTP status code (defaults to 200)
 * @param rawResponse - Optional raw Response object
 * @returns Standardized response object
 *
 * @example
 * // Success with data
 * createResponse(null, userData)
 * // Returns: { status: 200, data: User, ok: true }
 *
 * @example
 * // Success without data
 * createResponse()
 * // Returns: { status: 200, ok: true }
 *
 * @example
 * // Error case
 * createResponse({message: "User not found", code: "USER_NOT_FOUND"}, null, 404)
 * // Returns: { status: 404, error: {...}, message: "User not found", ok: false }
 */
export const createResponse = <T = any>( error? : LiWEError, data? : T, status : ContentfulStatusCode = 200, rawResponse? : Response ) : LiWEResponse<T> => {
	const response : LiWEResponse<T> = {
		status,
		ok: !error,
	};

	if ( rawResponse ) {
		response.response = rawResponse;
	}

	// Only include data field if data is provided and not null/undefined
	if ( data !== undefined && data !== null ) {
		response.data = data;
	}

	// Only include error field if error exists
	if ( error ) {
		response.error = error;
		response.message = error.message;
	}

	return response;
};

/**
 * Helper function to create a success response
 *
 * @template T - The type of data being returned
 * @param data - Response data
 * @param status - HTTP status code (defaults to 200)
 * @returns Success response object
 */
export const responseSuccess = <T = any>( data? : T, status : ContentfulStatusCode = 200 ) : LiWEResponse<T> => {
	return createResponse<T>( undefined, data, status );
};

/**
 * Options for enhanced error responses
 */
export interface ResponseErrorOptions {
	/** Original error for stack trace preservation */
	error? : Error;
	/** Additional context for logging */
	context? : Record<string, unknown>;
	/** Don't log this error (for expected errors like 404, validation) */
	silent? : boolean;
}

/**
 * Helper function to create an error response
 *
 * @template T - The type of data being returned
 * @param message - Error message
 * @param status - HTTP status code (defaults to 400)
 * @param code - Optional error code
 * @param level - Optional error level (defaults to 'error')
 * @param options - Optional enhanced error options (error, context, silent)
 * @returns Error response object
 */
export const responseError = <T = any>(
	message : string,
	status : ContentfulStatusCode = 400,
	code = '',
	level : 'error' | 'warning' | 'info' = 'error',
	options? : ResponseErrorOptions,
) : LiWEResponse<T> => {
	const { error, context, silent } = options ?? {};

	// Log the error (unless silent)
	if ( !silent ) {
		const logContext = {
			httpStatus: status,
			errorCode: code || undefined,
			...context,
		};

		if ( status >= 500 ) {
			// Server errors - always log as error
			logger.error( message, error, logContext );
		} else if ( status >= 400 ) {
			// Client errors - log as warn
			logger.warn( message, logContext );
		}
	}

	return createResponse<T>( { message, code, level }, undefined, status );
};

/**
 * Helper function to create a raw response (for files, streams, etc.)
 *
 * @param response - The raw Response object
 * @returns Success response object wrapping the raw response
 */
export const responseRaw = ( response : Response ) : LiWEResponse<any> => {
	return createResponse( undefined, undefined, response.status as ContentfulStatusCode, response );
};
