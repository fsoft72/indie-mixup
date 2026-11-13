# response.ts

Standardized API response formatting for all LiWE3 endpoints.

## Overview

The `response` module provides a consistent response format for all API endpoints, making it easier to handle success and error cases on the client side.

## Types

### `LiWEResponse<T>`

Standard response format for all API endpoints.

```typescript
type LiWEResponse<T = any> = {
	ok : boolean; // Success indicator
	status : ContentfulStatusCode; // HTTP status code
	data? : T; // Response data (omitted if null/undefined)
	message? : string; // Human-readable message
	error? : LiWEError; // Error details (only when ok is false)
};
```

**Properties:**

- `ok` - `true` for success, `false` for errors
- `status` - HTTP status code (200, 400, 404, 500, etc.)
- `data` - Response payload (only present if not null/undefined)
- `message` - Human-readable message (contains error message when ok is false)
- `error` - Detailed error information (only present when ok is false)

### `LiWEError`

Error object format.

```typescript
type LiWEError = {
	message : string; // Error description
	code? : string; // Error code for programmatic handling
	level? : 'info' | 'warning' | 'error'; // Error severity
};
```

## Functions

### `responseSuccess()`

Creates a success response.

```typescript
const responseSuccess = <T = any>(
  data?: T,
  status?: ContentfulStatusCode
): LiWEResponse<T>
```

**Parameters:**

- `data` - Response data (optional)
- `status` - HTTP status code (default: `200`)

**Returns:** Success response object

**Examples:**

```typescript
import { responseSuccess } from '@backend/liwe3/core';

// Success with data
return responseSuccess( { id: 'user_123', name: 'John' } );
// { ok: true, status: 200, data: { id: 'user_123', name: 'John' } }

// Success without data
return responseSuccess();
// { ok: true, status: 200 }

// Success with custom status
return responseSuccess( { created: true }, 201 );
// { ok: true, status: 201, data: { created: true } }

// Success with null/undefined (data omitted)
return responseSuccess( null );
// { ok: true, status: 200 }
```

### `responseError()`

Creates an error response.

```typescript
const responseError = <T = any>(
  message: string,
  status?: ContentfulStatusCode,
  code?: string,
  level?: 'error' | 'warning' | 'info'
): LiWEResponse<T>
```

**Parameters:**

- `message` - Error message
- `status` - HTTP status code (default: `400`)
- `code` - Optional error code for programmatic handling
- `level` - Error severity level (default: `'error'`)

**Returns:** Error response object

**Examples:**

```typescript
import { responseError } from '@backend/liwe3/core';

// Simple error
return responseError( 'User not found' );
// {
//   ok: false,
//   status: 400,
//   message: 'User not found',
//   error: { message: 'User not found', level: 'error' }
// }

// Error with custom status
return responseError( 'User not found', 404 );
// {
//   ok: false,
//   status: 404,
//   message: 'User not found',
//   error: { message: 'User not found', level: 'error' }
// }

// Error with code
return responseError( 'Invalid email', 400, 'INVALID_EMAIL' );
// {
//   ok: false,
//   status: 400,
//   message: 'Invalid email',
//   error: {
//     message: 'Invalid email',
//     code: 'INVALID_EMAIL',
//     level: 'error'
//   }
// }

// Warning level error
return responseError( 'Quota exceeded', 429, 'QUOTA_EXCEEDED', 'warning' );
// {
//   ok: false,
//   status: 429,
//   message: 'Quota exceeded',
//   error: {
//     message: 'Quota exceeded',
//     code: 'QUOTA_EXCEEDED',
//     level: 'warning'
//   }
// }
```

### `createResponse()`

Low-level function to create custom responses.

```typescript
const createResponse = <T = any>(
  error?: LiWEError,
  data?: T,
  status?: ContentfulStatusCode
): LiWEResponse<T>
```

**Parameters:**

- `error` - Error object (undefined for success)
- `data` - Response data
- `status` - HTTP status code (default: `200`)

**Returns:** Response object

**Note:** Prefer using `responseSuccess()` or `responseError()` instead.

## Usage Patterns

### Route Handler Pattern

```typescript
import { responseError, responseSuccess } from '@backend/liwe3/core';

export default async ( app : LiWEApp, params : UserGetParams ) => {
	// Validate input
	const validation = UserGetSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	try {
		// Business logic
		const user = await app.db
			.select()
			.from( users )
			.where( eq( users.id, params.userId ) )
			.get();

		if ( !user ) {
			return responseError( 'User not found', 404, 'USER_NOT_FOUND' );
		}

		// Return success
		return responseSuccess( user );
	} catch ( error ) {
		return responseError(
			`Failed to get user: ${error.message}`,
			500,
			'DATABASE_ERROR',
		);
	}
};
```

### Client-Side Handling

```typescript
const response = await fetch( '/api/user/get', {
	method: 'POST',
	body: JSON.stringify( { userId: 'user_123' } ),
} );

const result : LiWEResponse<User> = await response.json();

if ( result.ok ) {
	console.log( 'User:', result.data );
} else {
	console.error( 'Error:', result.message );

	// Handle specific error codes
	if ( result.error?.code === 'USER_NOT_FOUND' ) {
		// Show user not found UI
	}
}
```

### HTTP Status Codes

Common status codes used with response functions:

| Code | Meaning               | Usage                                 |
| ---- | --------------------- | ------------------------------------- |
| 200  | OK                    | Successful GET, PUT, PATCH            |
| 201  | Created               | Successful POST creating new resource |
| 204  | No Content            | Successful DELETE                     |
| 400  | Bad Request           | Validation errors, malformed input    |
| 401  | Unauthorized          | Authentication required               |
| 403  | Forbidden             | Insufficient permissions              |
| 404  | Not Found             | Resource doesn't exist                |
| 409  | Conflict              | Resource already exists               |
| 429  | Too Many Requests     | Rate limit exceeded                   |
| 500  | Internal Server Error | Unexpected server error               |

## Error Code Conventions

Recommended error code patterns:

```typescript
// Validation errors
responseError( 'Invalid email', 400, 'INVALID_EMAIL' );
responseError( 'Missing required field', 400, 'FIELD_REQUIRED' );

// Not found errors
responseError( 'User not found', 404, 'USER_NOT_FOUND' );
responseError( 'Resource not found', 404, 'NOT_FOUND' );

// Authentication errors
responseError( 'Invalid credentials', 401, 'INVALID_CREDENTIALS' );
responseError( 'Token expired', 401, 'TOKEN_EXPIRED' );

// Permission errors
responseError( 'Insufficient permissions', 403, 'FORBIDDEN' );
responseError( 'Admin access required', 403, 'ADMIN_REQUIRED' );

// Conflict errors
responseError( 'Email already exists', 409, 'EMAIL_EXISTS' );
responseError( 'Username taken', 409, 'USERNAME_TAKEN' );

// Server errors
responseError( 'Database error', 500, 'DATABASE_ERROR' );
responseError( 'External API failed', 500, 'EXTERNAL_API_ERROR' );
```

## Best Practices

1. **Always use response helpers** - Don't manually construct response objects
2. **Provide descriptive messages** - Help developers understand what went wrong
3. **Use error codes** - Enable client-side programmatic error handling
4. **Choose appropriate status codes** - Follow HTTP semantics
5. **Don't include sensitive data in errors** - Avoid leaking implementation details
6. **Be consistent** - Use the same error codes across similar operations

## Related

- [app.ts](./app.md) - Application initialization
- [permissions.ts](./permissions.md) - Permission checking with error responses
- [session.ts](./session.md) - Session validation with error handling
