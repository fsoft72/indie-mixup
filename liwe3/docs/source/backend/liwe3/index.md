# LiWE3 Core Library

The `@backend/liwe3/core` package provides foundational utilities and shared functionality for backend modules in the LiWE3 framework.

## Overview

LiWE3 Core is designed to run on Cloudflare Workers and provides essential building blocks for:

- Application initialization and configuration
- Authentication and session management
- Database operations with Drizzle ORM
- Cryptographic operations (hashing, JWT, passwords)
- Response formatting and error handling
- Permission and authorization system
- Utility functions for common operations

## Installation

```bash
pnpm add @backend/liwe3/core
```

## Core Modules

### Application Management

- [app.ts](./app.md) - Application initialization, Hono integration, and environment management

### Authentication & Security

- [session.ts](./session.md) - Session management using Cloudflare KV
- [crypto.ts](./crypto.md) - Cryptographic utilities (SHA-256/512, JWT, password hashing)
- [challenge.ts](./challenge.md) - Challenge-response authentication utilities
- [permissions.ts](./permissions.md) - Permission registration and authorization checks

### Data & Database

- [db.ts](./db.md) - Database abstraction layer
- [types.ts](./types.md) - Type definitions for core entities

### Response Handling

- [response.ts](./response.md) - Standardized API response formatting
- [logger.ts](./logger.md) - Structured logging with request correlation and error tracking

### Configuration

- [config.ts](./config.md) - Configuration management with template variable resolution

### Utilities

- [mkid.ts](./mkid.md) - Unique ID generation with prefixes
- [conv.ts](./conv.md) - Type conversion and formatting utilities
- [date.ts](./date.md) - Date formatting and manipulation
- [utils.ts](./utils.md) - General utility functions (object manipulation, merging)

## Quick Start

### Initialize Application

```typescript
import { LiWEApp, app_init } from '@backend/liwe3/core';
import configJSON from './config.json';

const app = app_init( 'myapp', env );

// Load configuration
app.loadConfigFromString( JSON.stringify( configJSON ), { env } );

// Access database
const users = await app.db.select().from( usersTable );

// Access KV
const value = await app.kv.get( 'key' );
```

### Logging

```typescript
import { logger } from '@backend/liwe3/core';

logger.debug( 'Diagnostic info', { variable: value } );
logger.info( 'Operation completed', { userId: 'usr_123' } );
logger.warn( 'Warning condition', { usage: 0.9 } );
logger.error( 'Operation failed', error, { operation: 'database_insert' } );
```

### Create Standard Responses

```typescript
import { responseError, responseSuccess } from '@backend/liwe3/core';

// Success response
return responseSuccess( { id: 'user_123', name: 'John' } );

// Error response
return responseError( 'User not found', 404, 'USER_NOT_FOUND' );
```

### Generate Unique IDs

```typescript
import { mkid } from '@backend/liwe3/core';

const userId = await mkid( 'user' ); // e.g., "user.abc123def456..."
const sessionId = await mkid( 'sess' ); // e.g., "sess.xyz789..."
```

### Session Management

```typescript
import { sessionCreate, sessionDestroy, sessionGet } from '@backend/liwe3/core';

// Create session
const sessionId = await sessionCreate( app.kv, 'myapp', userId, {
	expiresInSeconds: 3600,
	metadata: { role: 'admin' },
} );

// Get session
const session = await sessionGet( app.kv, 'myapp', sessionId );

// Destroy session
await sessionDestroy( app.kv, 'myapp', sessionId );
```

### Permission Checks

```typescript
import { has_perms } from '@backend/liwe3/core';

// Check if user has permission
const hasAccess = await has_perms( app, [ 'user.write', 'admin.access' ] );
```

## Architecture

The LiWE3 Core library is built around the `LiWEApp` class, which serves as the central application context. It provides:

1. **Environment Management** - Access to Cloudflare Workers bindings (DB, KV, env variables)
2. **Configuration** - Template-based JSON configuration with environment variable substitution
3. **Middleware Integration** - Built-in CORS and session middleware for Hono
4. **Lazy User Loading** - Efficient user data retrieval from sessions

## Response Format

All API responses follow the `LiWEResponse<T>` format:

```typescript
{
  ok: boolean;           // Success indicator
  status: number;        // HTTP status code
  data?: T;              // Response data (if successful)
  message?: string;      // Human-readable message
  error?: {              // Error details (if failed)
    message: string;
    code?: string;
    level?: 'info' | 'warning' | 'error';
  }
}
```

## Environment Variables

Configuration files can use template variables in the format `{{VARIABLE_NAME}}`:

```json
{
	"jwt": {
		"secret": "{{JWT_SECRET}}",
		"expiresIn": "24h"
	},
	"site": {
		"name": "My App",
		"secret": "{{SITE_SECRET}}"
	}
}
```

## Development vs Production

The `LiWEApp` class automatically detects the runtime environment:

- **Development**: Enables CORS middleware for local development
- **Production**: Disables CORS, assumes production Cloudflare Workers environment

## Best Practices

1. **Use `mkid()` for all ID generation** - Ensures consistent, unique IDs with prefixes
2. **Always use `responseSuccess()` and `responseError()`** - Maintains consistent API responses
3. **Use the logger instead of console.log** - Provides structured logs with request correlation
4. **Validate inputs with Zod** - All request parameters should be validated before processing
5. **Store sessions in KV** - Use the session utilities for authentication state
6. **Register permissions** - Call `permissions_register()` during module initialization

## Related Documentation

- [Backend Modules](../modules/index.md)
- [Frontend Library](../../frontend/liwe3/index.md)
