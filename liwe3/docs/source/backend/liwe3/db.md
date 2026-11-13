# db.ts

Database abstraction layer class.

## Overview

The `db` module provides a placeholder class for database operations. The actual database functionality is implemented through Drizzle ORM integration in the `LiWEApp` class.

## Class: LiWE3DB

```typescript
class LiWE3DB {
	constructor ( public name : string );
	greet () : string;
}
```

**Note:** This is a minimal placeholder class. The main database functionality is accessed through `app.db` in the `LiWEApp` class, which provides a Drizzle ORM instance.

### Constructor

```typescript
new LiWE3DB(name: string)
```

**Parameters:**

- `name` - Database instance name

### Methods

#### `greet()`

Returns a greeting message with the database name.

```typescript
greet(): string
```

**Returns:** Greeting string

**Example:**

```typescript
import LiWE3DB from '@backend/liwe3/core';

const db = new LiWE3DB( 'my-database' );
console.log( db.greet() );
// 'Hello, my-database!'
```

## Actual Database Usage

For real database operations, use the `app.db` property from `LiWEApp`, which provides a Drizzle ORM instance:

```typescript
import { app_init } from '@backend/liwe3/core';
import { users } from './schema';

const app = app_init( 'myapp', env );

// Query users
const allUsers = await app.db.select().from( users );

// Insert user
await app.db.insert( users ).values( {
	id: await mkid( 'user' ),
	email: 'user@example.com',
	name: 'John Doe',
} );

// Update user
await app.db
	.update( users )
	.set( { name: 'Jane Doe' } )
	.where( eq( users.id, userId ) );

// Delete user
await app.db.delete( users ).where( eq( users.id, userId ) );
```

## Database Configuration

Database is configured in `wrangler.jsonc` for Cloudflare Workers:

```jsonc
{
	"d1_databases": [
		{
			"binding": "DB",
			"database_name": "my-database",
			"database_id": "..."
		}
	]
}
```

Access through the environment binding:

```typescript
// In LiWEApp class
get db() {
  if (!this._db) {
    this._db = drizzle(this._env.DB);
  }
  return this._db;
}
```

## Related

- [app.ts](./app.md) - Application class with Drizzle integration
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
