# session.ts

Session management system using Cloudflare KV for authentication and user state.

## Overview

The `session` module provides a complete session management system built on Cloudflare KV. Sessions are created with a unique ID, stored with TTL expiration, and can include custom metadata such as user permissions and profile data.

## Types

### `SessionData`

Data structure stored in KV for each session.

```typescript
type SessionData = {
	userId : string; // User ID associated with session
	sessionId : string; // Unique session identifier
	createdAt : number; // Unix timestamp (seconds)
	expiresAt : number; // Unix timestamp (seconds)
	metadata? : Record<string, any>; // Custom data (user info, permissions, etc.)
};
```

### `SessionOptions`

Configuration options for creating sessions.

```typescript
type SessionOptions = {
	expiresInSeconds? : number; // Session duration (default: 604800 = 7 days)
	metadata? : Record<string, any>; // Custom session data
};
```

## Functions

### `sessionCreate()`

Creates a new session and stores it in KV.

```typescript
const sessionCreate = async (
  kv: KVNamespace,
  domain: string,
  userId: string,
  options?: SessionOptions
): Promise<string>
```

**Parameters:**

- `kv` - Cloudflare KV namespace
- `domain` - Application domain (e.g., 'myapp')
- `userId` - User ID to associate with session
- `options.expiresInSeconds` - Session duration in seconds (default: 7 days)
- `options.metadata` - Custom data to store with session

**Returns:** Session ID (in format `sess.{hash}.{random}`)

**Throws:**

- Error if `userId` or `domain` is missing

**KV Key Format:** `{domain}.session:{sessionId}`

**Examples:**

```typescript
import { sessionCreate } from '@backend/liwe3/core';

// Create session with defaults (7 days)
const sessionId = await sessionCreate(
	app.kv,
	'myapp',
	'user_123',
);

// Create session with custom expiration (1 hour)
const shortSession = await sessionCreate(
	app.kv,
	'myapp',
	'user_123',
	{ expiresInSeconds: 3600 },
);

// Create session with metadata
const sessionWithData = await sessionCreate(
	app.kv,
	'myapp',
	'user_123',
	{
		expiresInSeconds: 86400, // 24 hours
		metadata: {
			email: 'user@example.com',
			perms: [ 'user.read', 'user.write' ],
			role: 'admin',
		},
	},
);
```

### `sessionGet()`

Retrieves session data from KV.

```typescript
const sessionGet = async (
  kv: KVNamespace,
  domain: string,
  sessionId: string
): Promise<SessionData | null>
```

**Parameters:**

- `kv` - Cloudflare KV namespace
- `domain` - Application domain
- `sessionId` - Session ID to retrieve

**Returns:**

- `SessionData` if session exists and is valid
- `null` if session not found, expired, or invalid

**Behavior:**

- Returns `null` for empty `sessionId` or `domain`
- Automatically deletes expired sessions
- Returns `null` for invalid JSON

**Examples:**

```typescript
import { sessionGet } from '@backend/liwe3/core';

const session = await sessionGet( app.kv, 'myapp', sessionId );

if ( !session ) {
	return responseError( 'Invalid or expired session', 401 );
}

console.log( 'User:', session.userId );
console.log( 'Permissions:', session.metadata?.perms );
```

### `sessionDestroy()`

Destroys a session by removing it from KV.

```typescript
const sessionDestroy = async (
  kv: KVNamespace,
  domain: string,
  sessionId: string
): Promise<void>
```

**Parameters:**

- `kv` - Cloudflare KV namespace
- `domain` - Application domain
- `sessionId` - Session ID to destroy

**Returns:** void

**Examples:**

```typescript
import { sessionDestroy } from '@backend/liwe3/core';

// Logout endpoint
app.post( '/api/auth/logout', async ( c ) => {
	const app = c.get( 'app' );

	if ( app.sessionId ) {
		await sessionDestroy( app.kv, 'myapp', app.sessionId );
	}

	return c.json( responseSuccess( { loggedOut: true } ) );
} );
```

### `sessionRefresh()`

Extends a session's expiration time.

```typescript
const sessionRefresh = async (
  kv: KVNamespace,
  domain: string,
  sessionId: string,
  expiresInSeconds?: number
): Promise<boolean>
```

**Parameters:**

- `kv` - Cloudflare KV namespace
- `domain` - Application domain
- `sessionId` - Session ID to refresh
- `expiresInSeconds` - New expiration duration (default: 7 days)

**Returns:**

- `true` if session was refreshed
- `false` if session not found

**Examples:**

```typescript
import { sessionRefresh } from '@backend/liwe3/core';

// Refresh session on each request
const refreshed = await sessionRefresh( app.kv, 'myapp', app.sessionId );

if ( !refreshed ) {
	return responseError( 'Session not found', 401 );
}

// Refresh with custom duration
await sessionRefresh( app.kv, 'myapp', app.sessionId, 3600 ); // 1 hour
```

### `sessionUpdateMetadata()`

Updates session metadata without changing expiration.

```typescript
const sessionUpdateMetadata = async (
  kv: KVNamespace,
  domain: string,
  sessionId: string,
  metadata: Record<string, any>
): Promise<boolean>
```

**Parameters:**

- `kv` - Cloudflare KV namespace
- `domain` - Application domain
- `sessionId` - Session ID to update
- `metadata` - New metadata to merge with existing

**Returns:**

- `true` if session was updated
- `false` if session not found or expired

**Behavior:**

- Merges new metadata with existing (doesn't replace)
- Preserves original TTL

**Examples:**

```typescript
import { sessionUpdateMetadata } from '@backend/liwe3/core';

// Update user permissions
await sessionUpdateMetadata( app.kv, 'myapp', sessionId, {
	perms: [ 'user.read', 'user.write', 'admin.access' ],
} );

// Add temporary flag
await sessionUpdateMetadata( app.kv, 'myapp', sessionId, {
	twoFactorVerified: true,
} );
```

### `createLazyUserGetter()`

Creates a function that lazily fetches session data (cached).

```typescript
const createLazyUserGetter = (
  kv: KVNamespace,
  domain: string,
  sessionId: string
): () => Promise<SessionData | null>
```

**Parameters:**

- `kv` - Cloudflare KV namespace
- `domain` - Application domain
- `sessionId` - Session ID

**Returns:** Function that returns session data (cached after first call)

**Behavior:**

- First call fetches from KV
- Subsequent calls return cached data
- Handles concurrent calls (only fetches once)
- Retries on error

**Examples:**

```typescript
import { createLazyUserGetter } from '@backend/liwe3/core';

// Create lazy getter
app.getUserData = createLazyUserGetter( app.kv, 'myapp', sessionId );

// Later in handler (fetches only once)
const userData = await app.getUserData();
const userData2 = await app.getUserData(); // Returns cached data
```

### `sessionMiddleware()`

Hono middleware that initializes `getUserData()` on app context.

```typescript
const sessionMiddleware = (domain: string): MiddlewareHandler
```

**Parameters:**

- `domain` - Application domain

**Returns:** Hono middleware function

**Behavior:**

1. Reads JWT from `Authorization: Bearer {token}` header
2. Verifies JWT and extracts session ID
3. Sets up `app.getUserData()` lazy loader
4. Sets `app.sessionId` for use in handlers

**Examples:**

```typescript
import { sessionMiddleware } from '@backend/liwe3/core';

// Add middleware to Hono app
app.hono.use( '/*', sessionMiddleware( 'myapp' ) );

// Now handlers can access user data
app.get( '/api/profile', async ( c ) => {
	const app = c.get( 'app' );

	const userData = await app.getUserData();
	if ( !userData ) {
		return c.json( responseError( 'Not authenticated', 401 ) );
	}

	return c.json( responseSuccess( userData ) );
} );
```

## Complete Authentication Flow

### Login

```typescript
import { hashPassword, jwtCreate, sessionCreate, verifyPassword } from '@backend/liwe3/core';

// Registration
const hashedPassword = await hashPassword( password );
await app.db.insert( users ).values( {
	id: await mkid( 'user' ),
	email,
	password: hashedPassword,
} );

// Login
const user = await app.db.select().from( users ).where( eq( users.email, email ) ).get();

const isValid = await verifyPassword( password, user.password );
if ( !isValid ) {
	return responseError( 'Invalid password', 401 );
}

// Create session
const sessionId = await sessionCreate( app.kv, 'myapp', user.id, {
	expiresInSeconds: 86400, // 24 hours
	metadata: {
		email: user.email,
		perms: user.perms,
	},
} );

// Create JWT containing session ID
const token = await jwtCreate(
	{ session: sessionId },
	app.cfg.jwt.secret,
	86400,
);

return responseSuccess( { token } );
```

### Protected Route

```typescript
// Middleware extracts session from JWT and sets up getUserData()

app.get( '/api/user/profile', async ( c ) => {
	const app = c.get( 'app' );

	// Get user data (lazy loaded, cached)
	const session = await app.getUserData();

	if ( !session ) {
		return c.json( responseError( 'Not authenticated', 401 ) );
	}

	return c.json( responseSuccess( {
		userId: session.userId,
		email: session.metadata?.email,
		perms: session.metadata?.perms,
	} ) );
} );
```

### Logout

```typescript
import { sessionDestroy } from '@backend/liwe3/core';

app.post( '/api/auth/logout', async ( c ) => {
	const app = c.get( 'app' );

	if ( app.sessionId ) {
		await sessionDestroy( app.kv, 'myapp', app.sessionId );
	}

	return c.json( responseSuccess( { loggedOut: true } ) );
} );
```

## Session Security

1. **Use HTTPS** - Always transmit tokens over secure connections
2. **Short TTL for sensitive operations** - Use shorter expiration for admin sessions
3. **Refresh on activity** - Call `sessionRefresh()` to extend active sessions
4. **Destroy on logout** - Always clean up sessions
5. **Validate JWT** - Middleware verifies JWT before loading session
6. **Store minimal data** - Don't store sensitive data in session metadata
7. **Use unique domains** - Separate sessions per application

## Related

- [crypto.ts](./crypto.md) - JWT creation and verification
- [app.ts](./app.md) - Application initialization with session middleware
- [permissions.ts](./permissions.md) - Permission checking using session data
- [types.ts](./types.md) - User type definitions
