# Backend Modules

Backend modules provide domain-specific functionality and business logic for the LiWE3 monorepo. Each module is a self-contained package that can be composed into applications.

## Module Architecture

### Structure

Each backend module follows a consistent structure:

```
@backend/modules/<module_name>/
  ├── src/
  │   ├── methods/          # Individual route handlers
  │   ├── index.ts          # Module initialization and route registration
  │   ├── methods.ts        # Exports all route handlers
  │   ├── perms.ts          # Module-specific permissions
  │   └── schema.ts         # Database schemas (Drizzle ORM)
  ├── tests/                # Unit and integration tests
  └── package.json
```

### Initialization Pattern

Every module exports a `module_init(app: LiWEApp)` function:

```typescript
import { LiWEApp } from '@backend/liwe3/core';
import { routeHandler } from './methods';

export const module_init = ( app : LiWEApp ) => {
	app.get( '/api/route', routeHandler );
};
```

This function is called by the main application to register the module's routes.

### Route Handlers

Route handlers are organized in the `src/methods/` directory. Each handler file defines:

1. **Zod Schema** - Request validation schema (ends with `Schema`)
2. **TypeScript Type** - Inferred from schema (ends with `Params`)
3. **Response Type** - Expected return structure (ends with `Result`)
4. **Handler Function** - Default export implementing the route logic

Example handler structure:

```typescript
import { z } from 'zod';
import { LiWEApp, responseError, responseSuccess } from '@backend/liwe3/core';

// Schema
export const UserProfileSchema = z.object( {
	userId: z.string(),
} );

// Types
export type UserProfileParams = z.infer<typeof UserProfileSchema>;
export type UserProfileResult = {
	id : string;
	name : string;
	email : string;
};

// Handler
export default async (
	app : LiWEApp,
	params : UserProfileParams,
) : Promise<LiWEResponse<UserProfileResult>> => {
	// Validate
	const validation = UserProfileSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400 );
	}

	try {
		// Business logic
		const user = await app.db.query.users.findFirst( {
			where: eq( db_schema.users.id, params.userId ),
		} );

		if ( !user ) {
			return responseError( 'User not found', 404 );
		}

		return responseSuccess( {
			id: user.id,
			name: user.name,
			email: user.email,
		} );
	} catch ( error ) {
		return responseError( error.message, 500 );
	}
};
```

## Available Modules

### System Module

The [System Module](./system.md) provides system-level operations:

- Configuration management
- Health checks
- System diagnostics
- Administrative functions

### User Module

The [User Module](./user.md) handles user-related functionality:

- User registration and authentication
- Profile management
- Session handling
- Permission verification

## Creating a New Module

To create a new module:

1. **Create the package structure:**
   ```bash
   mkdir -p backend/modules/my-module/src/methods
   mkdir -p backend/modules/my-module/tests
   ```

2. **Add package.json:**
   ```json
   {
   	"name": "@backend/modules/my-module",
   	"version": "1.0.0",
   	"type": "module",
   	"dependencies": {
   		"@backend/liwe3/core": "workspace:*"
   	}
   }
   ```

3. **Create schema.ts:**
   ```typescript
   import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

   export const db_schema = {
   	myTable: sqliteTable( 'my_table', {
   		id: text( 'id' ).primaryKey(),
   		name: text( 'name' ).notNull(),
   	} ),
   };
   ```

4. **Create module initialization (index.ts):**
   ```typescript
   import { LiWEApp } from '@backend/liwe3/core';
   import myHandler from './methods/my-handler';

   export const module_init = ( app : LiWEApp ) => {
   	app.post( '/api/my-module/action', async ( c ) => {
   		const params = await c.req.json();
   		return c.json( await myHandler( app, params ) );
   	} );
   };
   ```

5. **Create route handlers in methods/:**
   Follow the handler pattern shown above

6. **Write tests:**
   ```typescript
   import { describe, expect, it } from 'vitest';
   import { module_init } from '../src/index';

   describe('My Module', () => {
   	it('should handle requests', async () => {
   		// Test implementation
   	});
   });
   ```

## Module Integration

Modules are integrated into applications via the main app initialization:

```typescript
import { LiWEApp } from '@backend/liwe3/core';
import { module_init as userModule } from '@backend/modules/user';
import { module_init as systemModule } from '@backend/modules/system';

const app = new LiWEApp();

// Initialize modules
userModule( app );
systemModule( app );

export default app;
```

## Best Practices

### Single Responsibility

Each module should focus on a single domain or business area. Don't mix unrelated functionality.

### Dependency Management

- Modules can depend on `@backend/liwe3/core`
- Modules should NOT depend on other modules
- Share common functionality through the core library

### Permissions

Define module-specific permissions in `perms.ts`:

```typescript
export const MODULE_PERMISSIONS = {
	READ: 'my_module:read',
	WRITE: 'my_module:write',
	ADMIN: 'my_module:admin',
} as const;
```

### Error Handling

Always use standardized error responses:

```typescript
// Input validation errors
return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );

// Not found errors
return responseError( 'Resource not found', 404, 'NOT_FOUND' );

// Server errors
return responseError( 'Internal server error', 500, 'INTERNAL_ERROR' );
```

### Testing

Write comprehensive tests for:

- Request validation
- Business logic
- Error conditions
- Database operations

## Related Documentation

- [Core Library](../liwe3/index.md)
- [System Module](./system.md)
- [User Module](./user.md)
- [Architecture Overview](../index.md)
