# Logger Module

The Logger module provides structured, contextual logging for LiWE3 applications with automatic request correlation, error tracking, and configurable output formats.

## Overview

The logger automatically captures:

- Request ID for tracing requests across logs
- User ID and domain from authenticated sessions
- Timestamps and duration metrics
- Stack traces for errors
- Custom context data

All logs are output as structured JSON (production) or pretty-printed text (development) for easy parsing and monitoring.

## Basic Usage

### Import the Logger

```typescript
import { logger } from '@backend/liwe3/core';
```

### Log Levels

The logger supports five severity levels:

```typescript
logger.debug( 'Detailed diagnostic information', { debugData: value } );
logger.info( 'General operational information', { event: 'startup' } );
logger.warn( 'Warning conditions', { unusualCondition: true } );
logger.error( 'Error conditions', errorObject, { operation: 'database_query' } );
logger.fatal( 'Severe errors causing app abort', errorObject, { critical: true } );
```

**Special method:**

```typescript
logger.always( 'Always log this', { important: true } ); // Bypasses log level filter
```

### Log with Context

```typescript
logger.info( 'User created', {
	module: 'user',
	method: 'user_add',
	userId: 'usr_123',
	username: 'john_doe',
} );
```

### Log Errors with Stack Traces

```typescript
try {
	await someOperation();
} catch ( error ) {
	logger.error( 'Operation failed', error as Error, {
		operation: 'database_insert',
		table: 'users',
	} );
}
```

## Configuration

### Via Config File

Add to your `config.json`:

```json
{
	"log": {
		"level": "info",
		"includeStack": true,
		"prettyPrint": false
	}
}
```

**Template variables:**

```json
{
	"log": {
		"level": "{{LOG_LEVEL}}",
		"includeStack": "{{LOG_INCLUDE_STACK}}",
		"prettyPrint": "{{LOG_PRETTY}}"
	}
}
```

### Programmatic Configuration

```typescript
import { configureLogger } from '@backend/liwe3/core';

configureLogger( {
	minLevel: 'debug', // Minimum level to output
	includeStack: true, // Include stack traces for errors
	prettyPrint: false, // Use JSON output (not pretty-printed)
} );
```

**Note:** Configuration is automatically applied when `loadConfigFromString()` is called in `app.ts`.

## Log Levels

| Level   | Priority | Use Case                 | Example                                    |
| ------- | -------- | ------------------------ | ------------------------------------------ |
| `debug` | 0        | Detailed diagnostic info | Variable values, flow control              |
| `info`  | 1        | General operations       | Request completed, module initialized      |
| `warn`  | 2        | Warning conditions       | Deprecated API used, rate limit approached |
| `error` | 3        | Error conditions         | Database query failed, API call error      |
| `fatal` | 4        | Severe errors            | Unhandled exception, critical service down |

Only logs at or above the configured `minLevel` are output.

## Request Correlation

Every request automatically gets a unique ID that appears in all logs during that request.

**Automatic via middleware:**

```typescript
// In app_init(), middleware is added:
app.hono.use( '/*', requestLoggerMiddleware() );
app.hono.use( '/*', userContextMiddleware( app ) );
```

**Response header:**

```http
X-Request-ID: req_a1b2c3d4
```

All logs for this request will include `"requestId": "req_a1b2c3d4"`.

## Output Formats

### JSON Format (Production)

```json
{
	"timestamp": "2024-01-15T10:30:45.123Z",
	"level": "error",
	"message": "Failed to create user",
	"requestId": "req_a1b2c3d4",
	"userId": "usr_xyz123",
	"domain": "myapp",
	"module": "user",
	"method": "user_add",
	"errorCode": "DB_ERROR",
	"httpStatus": 500,
	"stack": "Error: UNIQUE constraint failed...",
	"context": {
		"operation": "database_insert",
		"username": "john_doe"
	},
	"durationMs": 142
}
```

### Pretty Format (Development)

```
[2024-01-15 10:30:45] ERROR [req_a1b2c3d4] Failed to create user
  Module: user | Method: user_add | Status: 500
  User: usr_xyz123 | Domain: myapp
  Error Code: DB_ERROR
  Context: {"operation":"database_insert","username":"john_doe"}
  Stack:
    Error: UNIQUE constraint failed...
        at Database.run (...)
        at user_add (...)
```

## Special Context Fields

These fields are automatically extracted and placed at the top level of the log entry:

- `module` - Module name (e.g., `'user'`, `'comment'`)
- `method` - Method name (e.g., `'user_add'`)
- `errorCode` - Error code (e.g., `'DB_ERROR'`)
- `httpStatus` - HTTP status code (e.g., `500`)
- `durationMs` - Duration in milliseconds

All other fields go into the `context` object.

**Example:**

```typescript
logger.error( 'Database error', error, {
	module: 'user', // → entry.module
	method: 'user_add', // → entry.method
	errorCode: 'DB_ERROR', // → entry.errorCode
	httpStatus: 500, // → entry.httpStatus
	username: 'john_doe', // → entry.context.username
	operation: 'insert', // → entry.context.operation
} );
```

## Automatic Error Logging

All errors returned via `responseError()` are automatically logged:

```typescript
// This automatically logs the error
return responseError( 'User not found', 404, 'NOT_FOUND' );
// Logged at WARN level (4xx errors)

return responseError( 'Database error', 500, 'DB_ERROR', 'error', {
	error: originalError, // Preserves stack trace
	context: { userId: 'usr_123' },
} );
// Logged at ERROR level (5xx errors) with stack trace
```

**Silence expected errors:**

```typescript
// Validation errors are expected, don't log them
return responseError(
	validation.error.message,
	400,
	'VALIDATION_ERROR',
	'error',
	{ silent: true }, // Not logged
);
```

## Standard Error Codes

Use constants from `@backend/liwe3/core/src/error-codes.ts`:

```typescript
import {
	ERR_DB_ERROR,
	ERR_INTERNAL,
	ERR_NOT_FOUND,
	ERR_PERMISSION_DENIED,
	ERR_UNAUTHORIZED,
	ERR_VALIDATION,
} from '@backend/liwe3/core';

// Usage:
return responseError( 'User not found', 404, ERR_NOT_FOUND );
```

**Available codes:**

| Category      | Constants                                                          |
| ------------- | ------------------------------------------------------------------ |
| Auth          | `ERR_UNAUTHORIZED`, `ERR_PERMISSION_DENIED`, `ERR_SESSION_EXPIRED` |
| Validation    | `ERR_VALIDATION`, `ERR_INVALID_INPUT`, `ERR_MISSING_FIELD`         |
| Resources     | `ERR_NOT_FOUND`, `ERR_ALREADY_EXISTS`, `ERR_CONFLICT`              |
| Database      | `ERR_DB_ERROR`, `ERR_DB_CONSTRAINT`, `ERR_DB_CONNECTION`           |
| External      | `ERR_EXTERNAL_SERVICE`, `ERR_API_ERROR`, `ERR_TIMEOUT`             |
| Storage       | `ERR_STORAGE_ERROR`, `ERR_FILE_NOT_FOUND`, `ERR_UPLOAD_FAILED`     |
| Rate Limiting | `ERR_RATE_LIMITED`, `ERR_QUOTA_EXCEEDED`                           |
| Generic       | `ERR_INTERNAL`, `ERR_NOT_IMPLEMENTED`                              |

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ Good
logger.debug( 'Variable value', { myVar: value } ); // Diagnostic
logger.info( 'Request completed', { durationMs: 123 } ); // Operational
logger.warn( 'Approaching limit', { usage: 0.9 } ); // Warning
logger.error( 'Operation failed', error, { op: 'insert' } ); // Error
logger.fatal( 'Unhandled exception', error ); // Fatal

// ❌ Bad
logger.error( 'User logged in' ); // This is info, not an error
logger.info( 'Database crashed' ); // This is fatal, not info
```

### 2. Include Context

```typescript
// ✅ Good
logger.error( 'Failed to create user', error, {
	module: 'user',
	method: 'user_add',
	operation: 'database_insert',
	username: params.username,
} );

// ❌ Bad
logger.error( 'Failed' ); // No context, hard to debug
```

### 3. Preserve Error Stack Traces

```typescript
// ✅ Good
try {
  await operation();
} catch (error) {
  return responseError('Failed', 500, 'DB_ERROR', 'error', {
    error: error as Error  // Preserves stack trace
  });
}

// ❌ Bad
catch (error) {
  return responseError(`Failed: ${error.message}`, 500);
  // Stack trace lost!
}
```

### 4. Don't Log Sensitive Data

```typescript
// ✅ Good
logger.info( 'User logged in', { userId: user.id } );

// ❌ Bad
logger.info( 'User logged in', {
	password: user.password, // Never log passwords
	creditCard: user.creditCard, // Never log PII
	apiKey: user.apiKey, // Never log secrets
} );
```

### 5. Use Standard Error Codes

```typescript
// ✅ Good
import { ERR_DB_ERROR, ERR_NOT_FOUND } from '@backend/liwe3/core';
return responseError( 'User not found', 404, ERR_NOT_FOUND );

// ❌ Bad
return responseError( 'User not found', 404, 'NOT_FOUND_ERROR_XYZ' );
```

## Migration from console.log

### Before

```typescript
console.log( '=== User Add:', params );
console.error( 'ERROR:', error );
```

### After

```typescript
logger.debug( 'User add operation', {
	module: 'user',
	method: 'user_add',
	params: params,
} );

logger.error( 'User add failed', error, {
	module: 'user',
	method: 'user_add',
	params: params,
} );
```

## API Reference

### `configureLogger(options)`

Configure the logger (called once at startup).

**Parameters:**

- `options.minLevel` - Minimum log level (`'debug'` | `'info'` | `'warn'` | `'error'` | `'fatal'`)
- `options.includeStack` - Include stack traces in error logs (boolean)
- `options.prettyPrint` - Use pretty-printed output (boolean)

### `logger.debug(message, context?)`

Log debug information.

### `logger.info(message, context?)`

Log informational messages.

### `logger.warn(message, context?)`

Log warnings.

### `logger.error(message, error?, context?)`

Log errors with optional Error object.

### `logger.fatal(message, error?, context?)`

Log fatal errors.

### `logger.always(message, context?)`

Always log, bypassing level filter.

### `createRequestId()`

Generate a unique request ID (format: `req_xxxxxxxx`).

### `setRequestContext(ctx)`

Set request context (used by middleware).

### `updateRequestContext(updates)`

Update request context (used by middleware).

### `clearRequestContext()`

Clear request context (used by middleware).

## Related

- [Response Module](response.md) - Error responses with automatic logging
- [App Module](app.md) - Application initialization
- [Config Module](config.md) - Configuration management
