# Monorepo Documentation

Welcome to the Cloudflare Workers monorepo documentation. This repository contains backend modules, frontend libraries, and applications built on Cloudflare Workers infrastructure.

## Architecture Overview

The monorepo follows a modular architecture with the following structure:

- **Backend Core** - Foundational utilities and shared functionality
- **Backend Modules** - Domain-specific business logic and API endpoints
- **Frontend Libraries** - Svelte components and utilities
- **Applications** - Entry points that compose modules together

## Documentation Sections

### Backend

Explore the [Backend Overview](./backend/index.md) for comprehensive backend architecture documentation:

- **[Core Library](./backend/liwe3/index.md)** - Foundational utilities, database layer, and response handling
- **[Modules](./backend/modules/index.md)** - Domain-specific business logic (User, System)
- **Architecture** - Multi-tier deployment and specifications
- **Best Practices** - Guidelines for session management and security

### Scripts

View the [Scripts Overview](./scripts/index.md) for development automation tools:

- **[Branch Change Script](./scripts/change-branch.md)** - Automated branch switching with secret handling
- **[Git Secrets Script](./scripts/git-secrets.md)** - AES-256-GCM encryption for sensitive files

## Key Technologies

- **Runtime**: Cloudflare Workers
- **HTTP Framework**: Hono
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Validation**: Zod schemas
- **Testing**: Vitest
- **Package Manager**: pnpm workspaces

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development servers
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Development Patterns

### Module Structure

Each backend module exports a `module_init(app: Hono)` function that registers routes with the main application instance. Routes are organized in the `src/methods/` directory with corresponding schemas and handlers.

### Database Operations

Access the database through `app.db` (Drizzle instance). All schemas are defined using Drizzle ORM with Zod validation for request parameters.

### Response Format

All API responses follow the standardized `LiWEResponse<T>` format:

```typescript
import { responseError, responseSuccess } from '@backend/liwe3/core';

// Success response
return responseSuccess( { data: 'value' } );

// Error response
return responseError( 'Error message', 400, 'ERROR_CODE' );
```

## Contributing

Please follow the established patterns and conventions when adding new modules or functionality. Refer to the module-specific documentation for detailed guidelines.
