# app.ts

Application initialization and management for LiWE3 Cloudflare Workers applications.

## Overview

The `app` module provides the `LiWEApp` class, which serves as the central application context for LiWE3 applications. It manages:

- Hono HTTP framework integration
- Cloudflare bindings (D1 database, KV namespace)
- Configuration loading and management
- Session middleware
- Development vs production mode detection

## Class: LiWEApp

Central application class that manages all core functionality.

```typescript
class LiWEApp {
	constructor ( name : string, env : any, configPath? : string );

	// Properties
	name : string;
	getUserData : (() => Promise<SessionData | null>) | null;
	sessionId : string | null;

	// Getters
	get isDev() : boolean;
	get env() : any;
	get cfg() : AppConfig;
	get db() : DrizzleD1Database;
	get kv() : KVNamespace;
	get hono() : Hono;
	get fetch() : typeof hono.fetch;
	get user() : Promise<LiWEUser>;

	// Methods
	loadConfigFromString ( jsonString : string, options? : any ) : ConfigLoadResult<AppConfig>;
	setEnv ( env : any ) : void;
}
```

### Constructor

```typescript
new LiWEApp(name: string, env: any, configPath?: string)
```

**Parameters:**

- `name` - Application name (used for session domain)
- `env` - Cloudflare Workers environment object
- `configPath` - Optional config file path (for logging, default: `'./config.json'`)

**Example:**

```typescript
import { LiWEApp } from '@backend/liwe3/core';

const app = new LiWEApp( 'myapp', env );
```

### Properties

#### `name`

Application name.

```typescript
app.name; // 'myapp'
```

#### `getUserData`

Lazy-loaded function to get current user session data. Set by `sessionMiddleware`.

```typescript
const userData = await app.getUserData();
if ( !userData ) {
	return responseError( 'Not authenticated', 401 );
}
```

#### `sessionId`

Current session ID extracted from JWT. Set by `sessionMiddleware`.

```typescript
if ( app.sessionId ) {
	await sessionRefresh( app.kv, app.name, app.sessionId );
}
```

### Getters

#### `isDev`

Detects if running in development mode.

```typescript
if ( app.isDev ) {
	console.log( 'Running in development mode' );
}
```

**Detection Methods:**

1. Checks `env.DEV_MODE === 'true'`
2. Checks for legacy `MINIFLARE` global
3. Heuristic browser check

#### `env`

Returns the Cloudflare Workers environment object.

```typescript
const apiKey = app.env.API_KEY;
const db = app.env.DB;
const kv = app.env.KV;
```

#### `cfg`

Returns the resolved application configuration.

```typescript
const jwtSecret = app.cfg.jwt.secret;
const siteName = app.cfg.site.name;
```

#### `db`

Returns Drizzle ORM database instance (lazy-initialized).

```typescript
const users = await app.db.select().from( usersTable );

await app.db.insert( usersTable ).values( {
	id: await mkid( 'user' ),
	email: 'user@example.com',
} );
```

**Throws:** Error if `env.DB` is not set

#### `kv`

Returns Cloudflare KV namespace.

```typescript
await app.kv.put( 'key', 'value' );
const value = await app.kv.get( 'key' );
await app.kv.delete( 'key' );
```

**Throws:** Error if `env.KV` is not set

#### `hono`

Returns the underlying Hono app instance.

```typescript
app.hono.get( '/api/test', async ( c ) => {
	return c.json( { message: 'Hello' } );
} );

app.hono.use( '/*', async ( c, next ) => {
	console.log( 'Middleware' );
	await next();
} );
```

#### `fetch`

Returns Hono's fetch handler (for Cloudflare Workers export).

```typescript
export default {
	fetch: app.fetch,
};
```

#### `user`

Gets the current authenticated user data from session metadata.

```typescript
const user = await app.user;
```

**Returns:** `Promise<LiWEUser>` - User object with id, username, email, name, domain, and perms

**Throws:**

- `Error('User session not initialized')` if `getUserData` is not available
- `Error('User not authenticated')` if session or metadata is null

**Example:**

```typescript
app.hono.get( '/api/profile', async ( c ) => {
	const app = c.get( 'app' );

	try {
		const user = await app.user;

		return c.json( responseSuccess( {
			id: user.id,
			username: user.username,
			domain: user.domain,
			perms: user.perms,
		} ) );
	} catch ( error ) {
		return c.json( responseError( 'Not authenticated', 401 ) );
	}
} );
```

**Convenient alternative to:**

```typescript
// Instead of this:
const session = await app.getUserData();
if ( !session || !session.metadata ) {
	return responseError( 'Not authenticated', 401 );
}
const user = session.metadata;

// Use this:
const user = await app.user; // Throws if not authenticated
```

### Methods

#### `loadConfigFromString()`

Loads configuration from JSON string with template resolution.

```typescript
loadConfigFromString(
  jsonString: string,
  options?: ConfigTemplateOptions
): ConfigLoadResult<AppConfig>
```

**Parameters:**

- `jsonString` - JSON configuration
- `options` - Template resolution options

**Returns:** Configuration load result

**Example:**

```typescript
import configJSON from './config.json';

const result = app.loadConfigFromString(
	JSON.stringify( configJSON ),
	{ env: app.env },
);

console.log( 'Resolved variables:', result.resolvedVariables );
console.log( 'Missing variables:', result.missingVariables );
```

#### `setEnv()`

Updates the environment object (useful for testing).

```typescript
app.setEnv( newEnv );
```

## Function: app_init()

Convenience function to initialize a LiWE3 application with default middleware.

```typescript
const app_init = (name: string, env: any): LiWEApp
```

**Parameters:**

- `name` - Application name
- `env` - Cloudflare Workers environment

**Returns:** Initialized `LiWEApp` instance

**Automatically Sets Up:**

1. CORS middleware (development mode only)
2. App context middleware (sets `c.get('app')`)
3. Session middleware (initializes `getUserData()`)
4. Debug hello endpoint (`/api/_dbg/hello`)

**Example:**

```typescript
import { app_init } from '@backend/liwe3/core';

const app = app_init( 'myapp', env );

// CORS is enabled in dev mode
// Session middleware is active
// Can access app via c.get('app') in handlers
```

## Complete Application Setup

### Main Entry Point

```typescript
// @apps/myapp/src/index.ts
import { app_init } from '@backend/liwe3/core';
import { module_init as userModule } from '@backend/modules/user';
import configJSON from './config.json';

export default {
	async fetch ( request : Request, env : any, ctx : ExecutionContext ) {
		// Initialize app
		const app = app_init( 'myapp', env );

		// Load configuration
		app.loadConfigFromString( JSON.stringify( configJSON ), { env } );

		// Initialize modules
		userModule( app.hono );

		// Handle request
		return app.fetch( request, env, ctx );
	},
};
```

### Configuration File

```json
{
	"jwt": {
		"secret": "{{JWT_SECRET}}",
		"expiresIn": "24h"
	},
	"site": {
		"name": "My Application",
		"secret": "{{SITE_SECRET}}",
		"debugKey": "{{DEBUG_KEY}}",
		"adminKey": "{{ADMIN_KEY}}"
	}
}
```

### Module Integration

```typescript
// @backend/modules/user/src/index.ts
import { Hono } from 'hono';
import { LiWEApp } from '@backend/liwe3/core';

export const module_init = ( hono : Hono ) => {
	hono.get( '/api/user/profile', async ( c ) => {
		const app : LiWEApp = c.get( 'app' );

		const userData = await app.getUserData();
		if ( !userData ) {
			return c.json( responseError( 'Not authenticated', 401 ) );
		}

		const user = await app.db
			.select()
			.from( users )
			.where( eq( users.id, userData.userId ) )
			.get();

		return c.json( responseSuccess( user ) );
	} );
};
```

## Middleware Chain

The `app_init()` function sets up middleware in this order:

1. **CORS** (dev mode only)
   - Allows all origins
   - Enables all methods
   - Allows all headers

2. **App Context**
   - Sets `c.get('app')` to LiWEApp instance
   - Available in all handlers

3. **Session**
   - Extracts JWT from Authorization header
   - Verifies JWT and extracts session ID
   - Sets up `app.getUserData()` lazy loader
   - Sets `app.sessionId`

4. **Debug Endpoint**
   - `/api/_dbg/hello` - Simple health check

## Development vs Production

### Development Mode

```typescript
if ( app.isDev ) {
	// Enable verbose logging
	// Enable CORS for local frontend
	// Skip some validations
	// Use local database
}
```

### Production Mode

```typescript
if ( !app.isDev ) {
	// Strict error handling
	// No CORS (use Cloudflare settings)
	// Full validation
	// Production database
}
```

## Error Handling

```typescript
try {
	const users = await app.db.select().from( usersTable );
	return responseSuccess( users );
} catch ( error ) {
	if ( app.isDev ) {
		// Detailed error in development
		return responseError(
			`Database error: ${error.message}`,
			500,
			'DB_ERROR',
		);
	} else {
		// Generic error in production
		return responseError(
			'An error occurred',
			500,
			'INTERNAL_ERROR',
		);
	}
}
```

## Testing

```typescript
import { LiWEApp } from '@backend/liwe3/core';
import { beforeEach, describe, expect, it } from 'vitest';

describe('User API', () => {
	let app : LiWEApp;

	beforeEach( () => {
		app = new LiWEApp( 'test', {
			DB: getD1Database(),
			KV: getKVNamespace(),
			JWT_SECRET: 'test-secret',
		} );

		app.loadConfigFromString( JSON.stringify( testConfig ), { env: app.env } );
	} );

	it('should create user', async () => {
		const userId = await mkid( 'user' );

		await app.db.insert( users ).values( {
			id: userId,
			email: 'test@example.com',
		} );

		const user = await app.db.select().from( users ).where( eq( users.id, userId ) ).get();
		expect( user ).toBeDefined();
	});
});
```

## Best Practices

1. **Initialize once per request** - Create app in fetch handler
2. **Load config early** - Before initializing modules
3. **Use app context** - Access via `c.get('app')` in handlers
4. **Check authentication** - Use `app.getUserData()` for protected routes
5. **Handle errors gracefully** - Different messages for dev/prod
6. **Use lazy loading** - `db` and `kv` are initialized on first access
7. **Separate concerns** - Keep modules independent

## Related

- [config.ts](./config.md) - Configuration loading
- [session.ts](./session.md) - Session management
- [permissions.ts](./permissions.md) - Permission checking
- [response.ts](./response.md) - Response formatting
- [db.ts](./db.md) - Database operations
