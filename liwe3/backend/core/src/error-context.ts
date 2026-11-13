export interface ErrorContext {
	module? : string;
	method? : string;
	errorCode? : string;
	operation? : string;
	resourceId? : string;
	resourceType? : string;
	additionalData? : Record<string, unknown>;
}

/**
 * Creates an error context builder for method implementations.
 *
 * Usage:
 * ```typescript
 * const ctx = errorContext('comics', 'comic_series_create');
 * ctx.operation('database_insert').resource('series', seriesId);
 * // ... later in catch block:
 * return responseError('Failed', 500, ctx.code('DB_ERROR'));
 * ```
 */
export const errorContext = ( module : string, method : string ) => {
	const context : ErrorContext = { module, method };

	const builder = {
		/**
		 * Set the operation being performed (e.g., 'database_insert', 'api_call')
		 */
		operation: ( op : string ) => {
			context.operation = op;
			return builder;
		},

		/**
		 * Set the resource type and optional ID being operated on
		 */
		resource: ( type : string, id? : string ) => {
			context.resourceType = type;
			context.resourceId = id;
			return builder;
		},

		/**
		 * Add additional context data
		 */
		data: ( data : Record<string, unknown> ) => {
			context.additionalData = { ...context.additionalData, ...data };
			return builder;
		},

		/**
		 * Set the error code and return it (for use in responseError)
		 */
		code: ( code : string ) => {
			context.errorCode = code;
			return code;
		},

		/**
		 * Get the full error context object
		 */
		get: () => context,
	};

	return builder;
};
