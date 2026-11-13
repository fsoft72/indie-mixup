import type { LogEntry, LogLevel, LoggerConfig, RequestContext } from './types';

// Log level priority for filtering
const LEVEL_PRIORITY : Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	fatal: 4,
};

// Default configuration
const DEFAULT_CONFIG : LoggerConfig = {
	minLevel: 'info',
	includeStack: true,
	prettyPrint: false,
};

// Current request context (set per-request via middleware)
let currentContext : RequestContext | null = null;
let config : LoggerConfig = { ...DEFAULT_CONFIG };

/**
 * Configure the logger with custom options.
 * Called once at app startup.
 */
export const configureLogger = ( options : Partial<LoggerConfig> ) : void => {
	config = { ...DEFAULT_CONFIG, ...options };
};

/**
 * Sets the current request context.
 * Called by middleware at request start.
 */
export const setRequestContext = ( ctx : RequestContext ) : void => {
	currentContext = ctx;
};

/**
 * Updates the current request context with additional fields.
 * Called by middleware after authentication.
 */
export const updateRequestContext = ( updates : Partial<RequestContext> ) : void => {
	if ( currentContext ) {
		currentContext = { ...currentContext, ...updates };
	}
};

/**
 * Clears context at request end.
 * Called by middleware after response.
 */
export const clearRequestContext = () : void => {
	currentContext = null;
};

/**
 * Generates a short unique request ID.
 * Format: req_ + 8 random alphanumeric chars
 */
export const createRequestId = () : string => {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let result = 'req_';
	for ( let i = 0; i < 8; i++ ) {
		result += chars.charAt( Math.floor( Math.random() * chars.length ) );
	}
	return result;
};

/**
 * Formats a log entry as JSON string.
 */
const formatJson = ( entry : LogEntry ) : string => {
	return JSON.stringify( entry );
};

/**
 * Formats a log entry as pretty-printed string for development.
 */
const formatPretty = ( entry : LogEntry ) : string => {
	const time = entry.timestamp.replace( 'T', ' ' ).replace( 'Z', '' );
	const level = entry.level.toUpperCase().padEnd( 5 );
	const reqId = entry.requestId ? `[${entry.requestId}]` : '';

	let output = `[${time}] ${level} ${reqId} ${entry.message}`;

	const details : string[] = [];
	if ( entry.module ) details.push( `Module: ${entry.module}` );
	if ( entry.method ) details.push( `Method: ${entry.method}` );
	if ( entry.httpStatus ) details.push( `Status: ${entry.httpStatus}` );
	if ( details.length > 0 ) {
		output += `\n  ${details.join( ' | ' )}`;
	}

	const userDetails : string[] = [];
	if ( entry.userId ) userDetails.push( `User: ${entry.userId}` );
	if ( entry.domain ) userDetails.push( `Domain: ${entry.domain}` );
	if ( userDetails.length > 0 ) {
		output += `\n  ${userDetails.join( ' | ' )}`;
	}

	if ( entry.errorCode ) {
		output += `\n  Error Code: ${entry.errorCode}`;
	}

	if ( entry.context && Object.keys( entry.context ).length > 0 ) {
		output += `\n  Context: ${JSON.stringify( entry.context, null, 2 )}`;
	}

	if ( entry.stack ) {
		output += `\n  Stack:\n    ${entry.stack.split( '\n' ).join( '\n    ' )}`;
	}

	return output;
};

/**
 * Core logging function.
 * Checks if level meets minimum threshold, builds LogEntry, and outputs.
 * @param skipLevelCheck - If true, bypasses the level check (always logs)
 */
const log = (
	level : LogLevel,
	message : string,
	error? : Error | null,
	context? : Record<string, unknown>,
	skipLevelCheck = false,
) : void => {
	// Check if level meets minimum threshold (unless bypassed)
	if ( !skipLevelCheck && LEVEL_PRIORITY[level] < LEVEL_PRIORITY[config.minLevel] ) {
		return;
	}

	// Build log entry
	const entry : LogEntry = {
		timestamp: new Date().toISOString(),
		level,
		message,
	};

	// Add request context if available
	if ( currentContext ) {
		entry.requestId = currentContext.requestId;
		entry.userId = currentContext.userId;
		entry.domain = currentContext.domain;
		if ( currentContext.startTime ) {
			entry.durationMs = Date.now() - currentContext.startTime;
		}
	}

	// Add error details if provided
	if ( error && config.includeStack ) {
		entry.stack = error.stack;
	}

	// Add additional context
	if ( context ) {
		// Make a shallow copy to avoid mutating the original context
		const contextCopy = { ...context };

		// Extract special fields from the copy
		if ( contextCopy.httpStatus !== undefined ) {
			entry.httpStatus = contextCopy.httpStatus as number;
			delete contextCopy.httpStatus;
		}
		if ( contextCopy.errorCode !== undefined ) {
			entry.errorCode = contextCopy.errorCode as string;
			delete contextCopy.errorCode;
		}
		if ( contextCopy.module !== undefined ) {
			entry.module = contextCopy.module as string;
			delete contextCopy.module;
		}
		if ( contextCopy.method !== undefined ) {
			entry.method = contextCopy.method as string;
			delete contextCopy.method;
		}
		if ( contextCopy.durationMs !== undefined ) {
			entry.durationMs = contextCopy.durationMs as number;
			delete contextCopy.durationMs;
		}

		// Remaining context goes to context field
		if ( Object.keys( contextCopy ).length > 0 ) {
			entry.context = contextCopy;
		}
	}

	// Format and output
	const output = config.prettyPrint ? formatPretty( entry ) : formatJson( entry );

	// Use appropriate console method based on level
	switch ( level ) {
		case 'debug':
			console.debug( output );
			break;
		case 'info':
			console.info( output );
			break;
		case 'warn':
			console.warn( output );
			break;
		case 'error':
		case 'fatal':
			console.error( output );
			break;
	}
};

/**
 * Logger object with convenience methods for each log level.
 */
export const logger = {
	/**
	 * Log a debug message. Use for detailed diagnostic information.
	 */
	debug: ( message : string, context? : Record<string, unknown> ) : void => {
		log( 'debug', message, null, context );
	},

	/**
	 * Log an info message. Use for general operational information.
	 */
	info: ( message : string, context? : Record<string, unknown> ) : void => {
		log( 'info', message, null, context );
	},

	/**
	 * Log a warning message. Use for potentially harmful situations.
	 */
	warn: ( message : string, context? : Record<string, unknown> ) : void => {
		log( 'warn', message, null, context );
	},

	/**
	 * Log an error message. Use for error events that might still allow the app to continue.
	 * @param message - Error message
	 * @param error - Optional Error object for stack trace extraction
	 * @param context - Optional additional context
	 */
	error: ( message : string, error? : Error, context? : Record<string, unknown> ) : void => {
		log( 'error', message, error, context );
	},

	/**
	 * Log a fatal message. Use for severe errors that will cause the app to abort.
	 * @param message - Error message
	 * @param error - Optional Error object for stack trace extraction
	 * @param context - Optional additional context
	 */
	fatal: ( message : string, error? : Error, context? : Record<string, unknown> ) : void => {
		log( 'fatal', message, error, context );
	},

	/**
	 * Always log a message, bypassing the configured log level.
	 * Use sparingly for critical system messages that must always appear.
	 * @param message - Message to log
	 * @param context - Optional additional context
	 */
	always: ( message : string, context? : Record<string, unknown> ) : void => {
		log( 'info', message, null, context, true );
	},
};
