# User Session Best Practices

Guide for accessing current logged-in user session information in route handlers.

## Overview

The LiWE3 framework automatically extracts and validates user sessions from JWT tokens in the `Authorization` header. The session data is made available through the `app.getUserData()` method, which provides lazy-loaded access to the current user's session information.

## Accessing User Session Data

### Recommended Pattern: Using `app.user`

The simplest way to access the current user is using the `app.user` getter, which automatically throws an error if the user is not authenticated:

```typescript
import { responseError, responseSuccess } from '@backend/liwe3/core';

app.hono.get( '/api/your-endpoint', async ( c ) => {
	const app = c.get( 'app' );

	try {
		// Get current user data (throws if not authenticated)
		const user = await app.user;

		// Access user properties directly
		const userId = user.id;
		const userDomain = user.domain;
		const userPerms = user.perms;

		return c.json( responseSuccess( { userId, userDomain, userPerms } ) );
	} catch ( error ) {
		return c.json( responseError( 'Not authenticated', 401, 'UNAUTHORIZED' ) );
	}
} );
```

### Alternative Pattern: Using `app.getUserData()`

You can also use `app.getUserData()` for more control over session data:

```typescript
app.hono.get( '/api/your-endpoint', async ( c ) => {
	const app = c.get( 'app' );

	// Get current user session data
	const session = await app.getUserData();

	// Check if user is authenticated
	if ( !session ) {
		return c.json( responseError( 'Not authenticated', 401, 'UNAUTHORIZED' ) );
	}

	// Access session data
	const userId = session.userId;
	const metadata = session.metadata;

	return c.json( responseSuccess( { userId, metadata } ) );
} );
```

## Session Data Structure

The `getUserData()` method returns a `SessionData` object:

```typescript
{
  userId: string;          // User's unique ID
  sessionId: string;       // Session identifier
  createdAt: number;       // Session creation timestamp (seconds)
  expiresAt: number;       // Session expiration timestamp (seconds)
  metadata?: {             // Custom session data
    id: string;            // User ID (same as userId)
    username: string;      // Username
    email: string;         // Email address
    perms: string[];       // User permissions
    domain: string;        // User's domain
    loginTime: string;     // ISO timestamp of login
  }
}
```

## Getting the Current User's Domain

The user's domain is directly accessible from the `app.user` getter:

### Method 1: Using `app.user` (Recommended)

```typescript
app.hono.get( '/api/example', async ( c ) => {
	const app = c.get( 'app' );

	try {
		// Get user data (throws if not authenticated)
		const user = await app.user;

		// Access user domain directly
		const userDomain = user.domain;

		// Handle missing domain
		if ( !userDomain ) {
			return c.json( responseError( 'User domain not found', 400 ) );
		}

		return c.json( responseSuccess( {
			message: `User belongs to domain: ${userDomain}`,
			domain: userDomain,
		} ) );
	} catch ( error ) {
		return c.json( responseError( 'Not authenticated', 401 ) );
	}
} );
```

### Method 2: From Session Metadata (Alternative)

```typescript
app.hono.get( '/api/example', async ( c ) => {
	const app = c.get( 'app' );

	// Get session data
	const session = await app.getUserData();
	if ( !session ) {
		return c.json( responseError( 'Not authenticated', 401 ) );
	}

	// Extract user domain from metadata
	const userDomain = session.metadata?.domain;

	// Handle missing domain
	if ( !userDomain ) {
		return c.json( responseError( 'User domain not found', 400 ) );
	}

	return c.json( responseSuccess( {
		message: `User belongs to domain: ${userDomain}`,
		domain: userDomain,
	} ) );
} );
```

### Method 3: In Handler Methods

When creating handler methods following the module pattern:

```typescript
// src/methods/example-method.ts
import { z } from 'zod';
import { LiWEApp, LiWEResponse, responseError, responseSuccess } from '@backend/liwe3/core';

export const ExampleMethodSchema = z.object( {
	// Your params
} );

export type ExampleMethodParams = z.infer<typeof ExampleMethodSchema>;
export type ExampleMethodResult = {
	domain : string;
	data : any;
};

const exampleMethod = async (
	app : LiWEApp,
	params : ExampleMethodParams,
) : Promise<LiWEResponse<ExampleMethodResult>> => {
	// Validate params
	const validation = ExampleMethodSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	try {
		// Get current user (throws if not authenticated)
		const user = await app.user;

		// Get user domain with default fallback
		const userDomain = user.domain || 'default';

		// Use domain in your logic
		const data = await app.db
			.select()
			.from( yourTable )
			.where( eq( yourTable.domain, userDomain ) )
			.all();

		return responseSuccess( {
			domain: userDomain,
			data,
		} );
	} catch ( error ) {
		if ( error.message === 'User not authenticated' ) {
			return responseError( 'Not authenticated', 401, 'UNAUTHORIZED' );
		}
		const errorMessage = error instanceof Error ? error.message : 'Operation failed';
		return responseError( errorMessage, 500, 'INTERNAL_ERROR' );
	}
};

export default exampleMethod;
```

## Complete Example: Domain-Filtered Query

This example shows how to filter database queries by the current user's domain:

```typescript
// src/methods/document-list.ts
import { z } from 'zod';
import { LiWEApp, LiWEResponse, responseError, responseSuccess } from '@backend/liwe3/core';
import { documents } from '../schema';
import { eq } from 'drizzle-orm';

export const DocumentListSchema = z.object( {
	limit: z.number().optional().default( 50 ),
} );

export type DocumentListParams = z.infer<typeof DocumentListSchema>;
export type DocumentListResult = {
	domain : string;
	documents : any[];
};

/**
 * List documents filtered by current user's domain
 */
const documentList = async (
	app : LiWEApp,
	params : DocumentListParams,
) : Promise<LiWEResponse<DocumentListResult>> => {
	// Validate params
	const validation = DocumentListSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	try {
		// Get current user (throws if not authenticated)
		const user = await app.user;

		// Extract user domain
		const userDomain = user.domain;
		if ( !userDomain ) {
			return responseError( 'User domain not found', 400, 'DOMAIN_MISSING' );
		}

		// Query documents for user's domain
		const docs = await app.db
			.select()
			.from( documents )
			.where( eq( documents.domain, userDomain ) )
			.limit( validation.data.limit )
			.all();

		return responseSuccess( {
			domain: userDomain,
			documents: docs,
		} );
	} catch ( error ) {
		if ( error.message === 'User not authenticated' ) {
			return responseError( 'Authentication required', 401, 'UNAUTHORIZED' );
		}
		const errorMessage = error instanceof Error ? error.message : 'Failed to list documents';
		return responseError( errorMessage, 500, 'DATABASE_ERROR' );
	}
};

export default documentList;
```

## Best Practices

### 1. Use `app.user` for Cleaner Code

```typescript
// Recommended
try {
	const user = await app.user;
	// Use user data
} catch ( error ) {
	return c.json( responseError( 'Not authenticated', 401 ) );
}

// Alternative (more verbose)
const session = await app.getUserData();
if ( !session ) {
	return c.json( responseError( 'Not authenticated', 401 ) );
}
```

### 2. Provide Default Values

```typescript
const user = await app.user;
const userDomain = user.domain || 'default';
const userPerms = user.perms || [];
```

### 3. Use Optional Chaining

```typescript
const user = await app.user;
const username = user.username;
const email = user.email;
const domain = user.domain;
```

### 4. Cache User Data in Handler

If you need to access user data multiple times within a handler, store it in a variable:

```typescript
try {
	const user = await app.user;
	const { domain, perms, username } = user;

	// Use cached values
	console.log( `User ${username} from ${domain} has perms:`, perms );
} catch ( error ) {
	return responseError( 'Not authenticated', 401 );
}
```

### 5. Handle Missing Domain

```typescript
const user = await app.user;
const userDomain = user.domain;
if ( !userDomain ) {
	return responseError( 'User domain is required', 400, 'DOMAIN_REQUIRED' );
}
```

### 6. Type-Safe Access with LiWEUser

The `app.user` getter returns a typed `LiWEUser` object:

```typescript
import { LiWEUser } from '@backend/liwe3/core';

try {
	const user : LiWEUser = await app.user;

	// All properties are type-safe
	const userDomain : string | undefined = user.domain;
	const userPerms : string[] | undefined = user.perms;
	const userId : string = user.id;
} catch ( error ) {
	return responseError( 'Not authenticated', 401 );
}
```

## Multi-Tenant Architecture

When building multi-tenant applications, use the domain field to isolate data:

### Pattern 1: Domain-Scoped Queries

```typescript
// Always filter by domain
const items = await app.db
	.select()
	.from( items )
	.where( eq( items.domain, userDomain ) )
	.all();
```

### Pattern 2: Domain Validation on Insert

```typescript
await app.db.insert( items ).values( {
	id: await mkid( 'item' ),
	domain: userDomain, // Set domain from session
	name: params.name,
	// ... other fields
} );
```

### Pattern 3: Cross-Domain Access Control

```typescript
// Check if user has permission to access another domain
const targetDomain = params.domain;
const userDomain = session.metadata?.domain;

if ( targetDomain !== userDomain ) {
	// Check for cross-domain permission
	const canAccessOtherDomains = session.metadata?.perms?.includes( 'system.admin' );
	if ( !canAccessOtherDomains ) {
		return responseError( 'Cannot access other domains', 403, 'FORBIDDEN' );
	}
}
```

## Common Pitfalls

### ❌ Don't Trust Client-Provided Domain

```typescript
// WRONG - domain can be forged!
const userDomain = params.domain;
```

### ✅ Always Use User Domain from Session

```typescript
// CORRECT - domain comes from authenticated session
const user = await app.user;
const userDomain = user.domain;
```

### ❌ Don't Skip Authentication Check

```typescript
// WRONG - app.user throws if not authenticated
const domain = ( await app.user ).domain; // Will throw if not logged in
```

### ✅ Always Handle Authentication Errors

```typescript
// CORRECT - wrap in try-catch
try {
	const user = await app.user;
	const domain = user.domain;
} catch ( error ) {
	return responseError( 'Not authenticated', 401 );
}
```

### ✅ Alternative: Check Session Manually

```typescript
// CORRECT - manual null check
const session = await app.getUserData();
if ( !session ) return responseError( 'Not authenticated', 401 );
const domain = session.metadata?.domain;
```

## Testing

When writing tests, mock the session data:

```typescript
import { beforeEach, describe, expect, it } from 'vitest';

describe('Document List', () => {
	let app : LiWEApp;

	beforeEach( () => {
		app = new LiWEApp( 'test', env );

		// Mock getUserData for testing
		app.getUserData = async () => ( {
			userId: 'user_test123',
			sessionId: 'sess_test456',
			createdAt: Date.now() / 1000,
			expiresAt: Date.now() / 1000 + 3600,
			metadata: {
				id: 'user_test123',
				username: 'testuser',
				email: 'test@example.com',
				perms: [ 'document.read' ],
				domain: 'test-domain',
				loginTime: new Date().toISOString(),
			},
		} );
	} );

	it('should filter documents by user domain', async () => {
		const result = await documentList( app, { limit: 10 } );

		expect( result.ok ).toBe( true );
		expect( result.data?.domain ).toBe( 'test-domain' );
	});
});
```

## Related Documentation

- [User Module](../modules/user.md) - User authentication and management
- [Session Management](../liwe3/session.md) - Session system details
- [Permissions System](../liwe3/permissions.md) - Authorization and permissions
- [Response Format](../liwe3/response.md) - Standardized API responses

## Summary

- Use `app.getUserData()` to access current user session
- Always check for `null` before accessing session data
- User domain is in `session.metadata?.domain`
- Use domain to scope database queries in multi-tenant apps
- Never trust client-provided domain values
- Cache session data if used multiple times in a handler
