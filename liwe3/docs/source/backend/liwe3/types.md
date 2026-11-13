# types.ts

Type definitions for core entities.

## Overview

The `types` module defines TypeScript types and Zod schemas for core entities used throughout the LiWE3 framework.

## Types

### `LiWEUser`

Represents a user in the LiWE3 system.

```typescript
type LiWEUser = {
	id : string;
	username : string;
	email : string;
	name : string;
	domain? : string;
	perms? : string[];
};
```

**Properties:**

- `id` - Unique user identifier (generated with `mkid('user')`)
- `username` - Unique username (3-100 characters)
- `email` - User email address (5-255 characters, must be valid email)
- `name` - Display name (3-100 characters)
- `domain` - Optional user domain for multi-tenant applications
- `perms` - Optional array of permission strings (each 3-100 characters)

## Zod Schemas

### `ZLiWEUser`

Zod schema for validating user data.

```typescript
const ZLiWEUser = z.object( {
	id: z.string(),
	username: z.string().min( 3 ).max( 100 ),
	email: z.email().min( 5 ).max( 255 ),
	name: z.string().min( 3 ).max( 100 ),
	domain: z.string().optional(),
	perms: z.array( z.string().min( 3 ).max( 100 ) ).optional(),
} );
```

## Usage

### Type Safety

```typescript
import { LiWEUser } from '@backend/liwe3/core';

const user : LiWEUser = {
	id: 'user_abc123',
	username: 'johndoe',
	email: 'john@example.com',
	name: 'John Doe',
	perms: [ 'user.read', 'user.write' ],
};
```

### Runtime Validation

```typescript
import { ZLiWEUser } from '@backend/liwe3/core';

const userData = {
	id: 'user_123',
	username: 'jd', // Too short!
	email: 'invalid-email',
	name: 'John',
};

const result = ZLiWEUser.safeParse( userData );

if ( !result.success ) {
	console.log( result.error.message );
	// Validation errors for username and email
}
```

### Session Data

Used with session management to store user information:

```typescript
import { LiWEUser, sessionCreate } from '@backend/liwe3/core';

const user : LiWEUser = await getUserFromDatabase( userId );

const sessionId = await sessionCreate( app.kv, 'myapp', user.id, {
	metadata: {
		perms: user.perms,
		email: user.email,
	},
} );
```

### Permission Checks

```typescript
import { LiWEUser, has_perms } from '@backend/liwe3/core';

// Get user data using the convenient getter
try {
	const user = await app.user;

	// Check permissions
	const hasAccess = user.perms?.includes( 'admin.access' ) ?? false;

	// Access user domain
	const userDomain = user.domain;
} catch ( error ) {
	return responseError( 'Not authenticated', 401 );
}
```

## Extending User Type

For application-specific user data, extend the base type:

```typescript
import { LiWEUser } from '@backend/liwe3/core';

type AppUser = LiWEUser & {
	avatar? : string;
	bio? : string;
	createdAt : string;
	lastLogin? : string;
};

const user : AppUser = {
	id: 'user_123',
	username: 'johndoe',
	email: 'john@example.com',
	name: 'John Doe',
	perms: [ 'user.read' ],
	avatar: 'https://example.com/avatar.jpg',
	bio: 'Software developer',
	createdAt: '2024-01-01',
	lastLogin: '2024-10-07',
};
```

## Validation Constraints

| Field      | Min Length | Max Length | Format      | Required |
| ---------- | ---------- | ---------- | ----------- | -------- |
| `id`       | 1          | unlimited  | any string  | Yes      |
| `username` | 3          | 100        | any string  | Yes      |
| `email`    | 5          | 255        | valid email | Yes      |
| `name`     | 3          | 100        | any string  | Yes      |
| `domain`   | 1          | unlimited  | any string  | No       |
| `perms[i]` | 3          | 100        | any string  | No       |

## Related

- [session.ts](./session.md) - Session management with user data
- [permissions.ts](./permissions.md) - Permission system
- [response.ts](./response.md) - Response formatting
