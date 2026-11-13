# utils.ts

General utility functions for object manipulation and validation.

## Overview

The `utils` module provides helper functions for filtering object keys, validating objects, and deep merging objects.

## Functions

### `keys_filter()`

Filters object keys based on a type definition, removing invalid or private keys.

```typescript
const keys_filter = (obj: any, type_def: any): void
```

**Parameters:**

- `obj` - Object to filter (modified in place)
- `type_def` - Type definition object specifying allowed keys and properties

**Type Definition Properties:**

- `priv: true` - Marks key as private (will be removed)
- `type: 'string'` - Expected type for the key

**Behavior:**

1. Removes keys not present in `type_def`
2. Removes keys marked with `priv: true`
3. Converts arrays to strings if `type: 'string'` (takes first element)

**Examples:**

```typescript
import { keys_filter } from '@backend/liwe3/core';

const user = {
	id: 'user_123',
	name: 'John',
	password: 'secret',
	roles: [ 'admin', 'user' ],
	internal: 'data',
};

const userTypeDef = {
	id: { type: 'string' },
	name: { type: 'string' },
	password: { priv: true }, // Will be removed
	roles: { type: 'string' }, // Will convert array to string
	// 'internal' not in type_def, will be removed
};

keys_filter( user, userTypeDef );

console.log( user );
// {
//   id: 'user_123',
//   name: 'John',
//   roles: 'admin'  // First element of array
// }
```

### `keys_valid()`

Creates a new object containing only keys with non-undefined values.

```typescript
const keys_valid = (dct: any): any
```

**Parameters:**

- `dct` - Source object

**Returns:** New object with only defined values

**Examples:**

```typescript
import { keys_valid } from '@backend/liwe3/core';

const params = {
	name: 'John',
	age: undefined,
	email: 'john@example.com',
	phone: undefined,
};

const valid = keys_valid( params );

console.log( valid );
// {
//   name: 'John',
//   email: 'john@example.com'
// }
```

### `isObject()`

Checks if a value is a plain object.

```typescript
const isObject = (item: any): boolean
```

**Parameters:**

- `item` - Value to check

**Returns:** `true` if item is a plain object, `false` otherwise

**Excludes:**

- `undefined` and `null`
- Empty strings
- Arrays
- Date objects

**Examples:**

```typescript
import { isObject } from '@backend/liwe3/core';

isObject( {} ); // true
isObject( { a: 1 } ); // true
isObject( [] ); // false
isObject( null ); // false
isObject( undefined ); // false
isObject( '' ); // false
isObject( new Date() ); // false
isObject( 'string' ); // false
isObject( 123 ); // false
```

### `merge()`

Deep merges multiple objects together.

```typescript
const merge = (target: any, ...sources: any[]): any
```

**Parameters:**

- `target` - Target object to merge into
- `...sources` - Source objects to merge from

**Returns:** Merged object (target is modified)

**Behavior:**

- Deep merges nested objects
- Later sources override earlier ones
- Arrays are not merged, they are replaced
- Only merges plain objects (see `isObject()`)

**Examples:**

```typescript
import { merge } from '@backend/liwe3/core';

const defaults = {
	theme: 'light',
	colors: {
		primary: 'blue',
		secondary: 'green',
	},
	features: {
		analytics: true,
	},
};

const userPrefs = {
	colors: {
		primary: 'red',
	},
	features: {
		notifications: false,
	},
};

const config = merge( {}, defaults, userPrefs );

console.log( config );
// {
//   theme: 'light',
//   colors: {
//     primary: 'red',      // Overridden
//     secondary: 'green'   // Preserved
//   },
//   features: {
//     analytics: true,     // Preserved
//     notifications: false // Added
//   }
// }
```

## Use Cases

### Sanitizing API Responses

```typescript
import { keys_filter } from '@backend/liwe3/core';

const userSchema = {
	id: { type: 'string' },
	email: { type: 'string' },
	name: { type: 'string' },
	password: { priv: true },
	passwordHash: { priv: true },
	internalNotes: { priv: true },
};

const user = await app.db.select().from( users ).where( eq( users.id, userId ) ).get();

// Remove sensitive fields before sending to client
keys_filter( user, userSchema );

return responseSuccess( user );
```

### Building Database Queries

```typescript
import { keys_valid } from '@backend/liwe3/core';

const updateUser = async ( userId : string, updates : Partial<User> ) => {
	// Only update fields that were provided
	const validUpdates = keys_valid( updates );

	if ( Object.keys( validUpdates ).length === 0 ) {
		return responseError( 'No valid fields to update', 400 );
	}

	await app.db
		.update( users )
		.set( validUpdates )
		.where( eq( users.id, userId ) );

	return responseSuccess( { updated: true } );
};
```

### Configuration Merging

```typescript
import { merge } from '@backend/liwe3/core';

const defaultConfig = {
	api: {
		timeout: 5000,
		retries: 3,
	},
	features: {
		cache: true,
	},
};

const envConfig = {
	api: {
		timeout: 10000, // Override timeout
	},
};

const config = merge( {}, defaultConfig, envConfig );
// Timeout is 10000, retries is 3, cache is true
```

### Type Validation

```typescript
import { isObject } from '@backend/liwe3/core';

const processData = ( data : any ) => {
	if ( !isObject( data ) ) {
		return responseError( 'Data must be an object', 400 );
	}

	// Process object...
};
```

### Optional Parameter Handling

```typescript
import { keys_valid } from '@backend/liwe3/core';

const createUser = async ( params : {
	email : string;
	name : string;
	phone? : string;
	bio? : string;
} ) => {
	// Only include provided optional fields
	const userData = keys_valid( {
		id: await mkid( 'user' ),
		email: params.email,
		name: params.name,
		phone: params.phone,
		bio: params.bio,
	} );

	await app.db.insert( users ).values( userData );
};
```

## Best Practices

1. **Use `keys_filter()` for API responses** - Remove sensitive data before sending to clients
2. **Use `keys_valid()` for updates** - Only update fields that were provided
3. **Use `merge()` for configuration** - Combine default and user settings
4. **Check with `isObject()` before merging** - Validate input types
5. **Define type schemas** - Create reusable type definitions for `keys_filter()`

## Type Definition Pattern

```typescript
// Define schema for filtering
const UserPublicSchema = {
	id: { type: 'string' },
	username: { type: 'string' },
	email: { type: 'string' },
	name: { type: 'string' },
	avatar: { type: 'string' },
	// Exclude sensitive fields
	password: { priv: true },
	passwordHash: { priv: true },
	apiKey: { priv: true },
	internalId: { priv: true },
};

// Use in route handlers
const getUser = async ( userId : string ) => {
	const user = await app.db.select().from( users ).where( eq( users.id, userId ) ).get();

	keys_filter( user, UserPublicSchema );

	return responseSuccess( user );
};
```

## Related

- [conv.ts](./conv.md) - Type conversion utilities
- [response.ts](./response.md) - Response formatting
- [types.ts](./types.md) - Type definitions
