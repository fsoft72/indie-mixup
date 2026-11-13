# Backend Overview

The backend architecture of the LiWE3 monorepo is built on Cloudflare Workers, providing a serverless, edge-first approach to API development. The backend is organized into modular components that promote code reusability, maintainability, and scalability.

## Architecture

The backend follows a layered architecture:

### Core Library

The [Core Library](./liwe3/index.md) (`@backend/liwe3/core`) provides foundational utilities and shared functionality:

- **Application framework** - Hono-based app initialization
- **Database layer** - Drizzle ORM integration with Cloudflare D1
- **Authentication** - Session management and user authentication
- **Cryptography** - Secure hashing, encryption, and token generation
- **Response handling** - Standardized API response formats
- **Utilities** - Date handling, ID generation, type conversions

### Modules

[Backend Modules](./modules/index.md) (`@backend/modules/*`) contain domain-specific business logic:

- **User Module** - User management, authentication, and profile handling
- **System Module** - System-level operations and configuration

Each module exports a `module_init(app)` function that registers routes with the main application.

### Multi-Tier Architecture

The system supports a [multi-tier deployment model](./multi-tier.md) allowing for:

- Separation of concerns across different service tiers
- Scalable microservice architecture
- Independent deployment and scaling

## Key Patterns

### Module Initialization

Each module follows a standard initialization pattern:

```typescript
import { LiWEApp } from '@backend/liwe3/core';

export const module_init = ( app : LiWEApp ) => {
	// Register routes
	app.get( '/api/endpoint', async ( c ) => {
		// Handler logic
	} );
};
```

### Response Format

All API responses use the standardized `LiWEResponse<T>` format:

```typescript
import { responseError, responseSuccess } from '@backend/liwe3/core';

// Success
return responseSuccess( { data: value } );

// Error
return responseError( 'Error message', 400, 'ERROR_CODE' );
```

### Database Access

Database operations use Drizzle ORM through `app.db`:

```typescript
import { db_schema } from './schema';

const users = await app.db.select().from( db_schema.users ).all();
```

## Technology Stack

- **Runtime**: Cloudflare Workers
- **HTTP Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Validation**: Zod schemas
- **Testing**: Vitest

## Best Practices

Refer to the [Best Practices](./best-practices/user-session.md) section for guidelines on:

- Session management
- Authentication flows
- Error handling
- Security considerations

## Getting Started

To work with the backend:

```bash
# Install dependencies
pnpm install

# Run development server
cd apps/playground/worker
pnpm dev

# Run tests
pnpm test

# Deploy to Cloudflare
pnpm deploy
```

## Further Reading

- [Core Library Documentation](./liwe3/index.md)
- [Module Documentation](./modules/index.md)
- [Architecture Specifications](./specs2.md)
