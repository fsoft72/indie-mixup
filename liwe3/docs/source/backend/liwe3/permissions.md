# permissions.ts

Permission registration and authorization system for LiWE3 modules.

## Overview

The `permissions` module provides a centralized permission registry and authorization checking system. Modules register their permissions during initialization, and routes can check user permissions before executing operations.

## Types

### `SystemPermission`

Defines a single permission.

```typescript
type SystemPermission = {
	name : string; // Permission name (3-100 chars)
	description : string; // Human-readable description (3-255 chars)
};
```

### `SystemPermissionsRegisterParams`

Parameters for registering module permissions.

```typescript
type SystemPermissionsRegisterParams = {
	module : string; // Module name (3-100 chars)
	perms : SystemPermission[]; // Array of permissions (min 1)
};
```

## Functions

### `permissions_register()`

Registers permissions for a module during initialization.

```typescript
const permissions_register = (
  params: SystemPermissionsRegisterParams
): boolean
```

**Parameters:**

- `params.module` - Module name
- `params.perms` - Array of permissions to register

**Returns:** `true` if successful, `false` if validation failed

**Behavior:**

- Validates parameters using Zod schema
- Stores permissions in global registry
- Logs registration result
- Returns `false` and logs error if validation fails

**Examples:**

```typescript
import { permissions_register } from '@backend/liwe3/core';

// In module initialization
export const module_init = ( app : Hono ) => {
	// Register permissions
	permissions_register( {
		module: 'user',
		perms: [
			{
				name: 'user.read',
				description: 'View user information',
			},
			{
				name: 'user.write',
				description: 'Create and update users',
			},
			{
				name: 'user.delete',
				description: 'Delete users',
			},
			{
				name: 'user.admin',
				description: 'Full user management access',
			},
		],
	} );

	// Register routes...
};
```

### `permissions_list_full()`

Retrieves the complete permissions registry.

```typescript
const permissions_list_full = (): Record<string, SystemPermission[]>
```

**Returns:** Object mapping module names to their registered permissions

**Example:**

```typescript
import { permissions_list_full } from '@backend/liwe3/core';

const allPerms = permissions_list_full();

console.log( allPerms );
// {
//   user: [
//     { name: 'user.read', description: 'View user information' },
//     { name: 'user.write', description: 'Create and update users' }
//   ],
//   document: [
//     { name: 'document.read', description: 'View documents' }
//   ]
// }
```

### `has_perms()`

Checks if the current user has at least one of the specified permissions.

```typescript
const has_perms = async (
  app: LiWEApp,
  perms: string[]
): Promise<boolean>
```

**Parameters:**

- `app` - LiWEApp instance with user data
- `perms` - Array of permission names to check

**Returns:** `true` if user has at least one permission, `false` otherwise

**Special Permissions:**

- `'public'` or `'anyone'` - Always returns `true` (public access)
- `'logged'` or `'is-logged'` - Returns `true` if user has any permissions (authenticated)
- `'system.admin'` - User with this permission bypasses all checks

**Examples:**

```typescript
import { has_perms, responseError } from '@backend/liwe3/core';

// Check single permission
const canEdit = await has_perms( app, [ 'user.write' ] );
if ( !canEdit ) {
	return responseError( 'Insufficient permissions', 403 );
}

// Check multiple permissions (user needs at least one)
const canAccess = await has_perms( app, [ 'user.admin', 'user.read' ] );

// Public endpoint
const isPublic = await has_perms( app, [ 'public' ] );
// Always returns true

// Authenticated users only
const isLoggedIn = await has_perms( app, [ 'logged' ] );
// Returns true if user has any permission
```

## Permission Naming Conventions

Permissions follow a hierarchical naming pattern:

```
{module}.{action}
```

**Examples:**

- `user.read` - View user data
- `user.write` - Create/update users
- `user.delete` - Delete users
- `user.admin` - Full user management
- `document.read` - View documents
- `document.write` - Create/edit documents
- `document.publish` - Publish documents
- `system.admin` - System-wide admin access

## Use Cases

### Module Initialization

```typescript
// @backend/modules/user/src/index.ts
import { permissions_register } from '@backend/liwe3/core';
import { Hono } from 'hono';

export const module_init = ( app : Hono ) => {
	// Register module permissions
	permissions_register( {
		module: 'user',
		perms: [
			{ name: 'user.read', description: 'View users' },
			{ name: 'user.write', description: 'Manage users' },
			{ name: 'user.delete', description: 'Delete users' },
		],
	} );

	// Register routes with permission checks...
};
```

### Protected Routes

```typescript
import { has_perms, responseError } from '@backend/liwe3/core';

export default async ( app : LiWEApp, params : UserDeleteParams ) => {
	// Check permissions
	if ( !await has_perms( app, [ 'user.delete', 'system.admin' ] ) ) {
		return responseError( 'Insufficient permissions', 403, 'FORBIDDEN' );
	}

	// Proceed with deletion
	await app.db.delete( users ).where( eq( users.id, params.userId ) );

	return responseSuccess( { deleted: true } );
};
```

### Role-Based Access

```typescript
import { has_perms } from '@backend/liwe3/core';

// Admin-only endpoint
const isAdmin = await has_perms( app, [ 'system.admin' ] );
if ( !isAdmin ) {
	return responseError( 'Admin access required', 403 );
}

// User management endpoint (admin or user manager)
const canManage = await has_perms( app, [ 'system.admin', 'user.admin' ] );
if ( !canManage ) {
	return responseError( 'User management permission required', 403 );
}

// Read-only endpoint (multiple permission levels)
const canView = await has_perms( app, [ 'user.read', 'user.write', 'user.admin' ] );
```

### Public vs Authenticated Routes

```typescript
// Public endpoint (no auth required)
app.get( '/api/public/info', async ( c ) => {
	const app = c.get( 'app' );

	// Anyone can access
	if ( !await has_perms( app, [ 'public' ] ) ) {
		// This will never happen for 'public'
	}

	return c.json( responseSuccess( { info: 'Public data' } ) );
} );

// Authenticated endpoint (any logged-in user)
app.get( '/api/user/profile', async ( c ) => {
	const app = c.get( 'app' );

	if ( !await has_perms( app, [ 'logged' ] ) ) {
		return c.json( responseError( 'Authentication required', 401 ) );
	}

	const userData = await app.getUserData();
	return c.json( responseSuccess( userData ) );
} );
```

### Permission List Endpoint

```typescript
import { has_perms, permissions_list_full } from '@backend/liwe3/core';

// Admin endpoint to view all permissions
app.get( '/api/admin/permissions', async ( c ) => {
	const app = c.get( 'app' );

	if ( !await has_perms( app, [ 'system.admin' ] ) ) {
		return c.json( responseError( 'Admin access required', 403 ) );
	}

	const allPermissions = permissions_list_full();

	return c.json( responseSuccess( allPermissions ) );
} );
```

## Permission Storage

User permissions are stored in the session metadata:

```typescript
// When creating session
const sessionId = await sessionCreate( app.kv, 'myapp', user.id, {
	metadata: {
		perms: [ 'user.read', 'user.write' ], // User's permissions
		email: user.email,
		name: user.name,
	},
} );
```

## Security Best Practices

1. **Always check permissions** - Don't trust client-side checks
2. **Use specific permissions** - Avoid overly broad permissions
3. **Register all permissions** - Document what each permission allows
4. **Check early** - Validate permissions before expensive operations
5. **Use system.admin sparingly** - Reserve for true system administrators
6. **Log permission failures** - Monitor unauthorized access attempts
7. **Return 403 for permission errors** - Use 401 only for authentication errors

## Error Handling

```typescript
// Permission check failure
if ( !await has_perms( app, [ 'user.write' ] ) ) {
	return responseError(
		'You do not have permission to modify users',
		403,
		'FORBIDDEN',
	);
}

// No user data (not authenticated)
const userData = await app.getUserData();
if ( !userData ) {
	return responseError( 'Authentication required', 401, 'UNAUTHORIZED' );
}

// Check specific permission
if ( !await has_perms( app, [ 'document.publish' ] ) ) {
	return responseError(
		'Publishing permission required',
		403,
		'PUBLISH_FORBIDDEN',
	);
}
```

## Related

- [session.ts](./session.md) - Session management with permission storage
- [types.ts](./types.md) - User type with permissions field
- [app.ts](./app.md) - Application context with getUserData()
- [response.ts](./response.md) - Error response formatting
