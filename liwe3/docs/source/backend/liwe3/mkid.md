# mkid.ts

Unique ID generation utilities with prefixes.

## Overview

The `mkid` module provides functions for generating unique identifiers with prefixes, random integers, and numeric codes. These are essential for creating consistent, traceable IDs across the application.

## Functions

### `mkid()`

Generates a unique ID with a specified prefix and optional extension.

```typescript
const mkid = async (
  prefix: string,
  ext?: string
): Promise<string>
```

**Parameters:**

- `prefix` - Prefix for the ID (e.g., 'user', 'sess', 'doc')
- `ext` - Optional extension (automatically prefixed with '.' if not present)

**Returns:** Unique ID string in format: `{prefix}.{hash}.{random}`

**Format:** `prefix.{32-char-md5-hash}.{4-char-base36-random}`

**Examples:**

```typescript
import { mkid } from '@backend/liwe3/core';

const userId = await mkid( 'user' );
// 'user.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.1a2b'

const sessionId = await mkid( 'sess' );
// 'sess.x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4.3c4d'

const docId = await mkid( 'doc', 'pdf' );
// 'doc.h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3.5e6f.pdf'

const docId2 = await mkid( 'doc', '.pdf' ); // Extension with dot
// 'doc.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.1a2b.pdf'
```

### `unique_code()`

Generates a unique code based on current timestamp.

```typescript
const unique_code = async (
  simple?: boolean,
  prefix?: string,
  second_slice?: boolean
): Promise<string>
```

**Parameters:**

- `simple` - If true, generates simpler (shorter) code (default: `true`)
- `prefix` - Optional prefix for the code
- `second_slice` - Add second random slice (default: `true`)

**Returns:** Unique code string

**Format Variations:**

- Simple with second slice: `{prefix}.{hash}.{random}`
- Simple without second slice: `{prefix}.{hash}`
- Complex: `{prefix}.{hash-of-hash}.{random}`

**Examples:**

```typescript
import { unique_code } from '@backend/liwe3/core';

// Simple code with second slice
const code1 = await unique_code();
// 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.1a2b'

// Simple code without second slice
const code2 = await unique_code( true, '', false );
// 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'

// With prefix
const code3 = await unique_code( true, 'temp' );
// 'temp.x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4.3c4d'

// Complex code
const code4 = await unique_code( false );
// 'h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3.5e6f'
```

### `unique_code_numbers()`

Generates a unique numeric code based on current timestamp.

```typescript
const unique_code_numbers = (
  length: number,
  second_slice?: number
): string
```

**Parameters:**

- `length` - Length of the primary code
- `second_slice` - Length of optional second slice (default: `0`)

**Returns:** Numeric code string

**Examples:**

```typescript
import { unique_code_numbers } from '@backend/liwe3/core';

// 6-digit code
unique_code_numbers( 6 );
// '234567'

// 6-digit code with 4-digit second slice
unique_code_numbers( 6, 4 );
// '234567.8901'

// 10-digit code
unique_code_numbers( 10 );
// '7234567890'
```

### `rand_int()`

Generates a random integer within a specified range.

```typescript
const rand_int = (
  min?: number,
  max?: number
): number
```

**Parameters:**

- `min` - Minimum value (inclusive, default: `0`)
- `max` - Maximum value (inclusive, default: `100`)

**Returns:** Random integer between min and max

**Examples:**

```typescript
import { rand_int } from '@backend/liwe3/core';

rand_int(); // Random 0-100
rand_int( 1, 10 ); // Random 1-10
rand_int( 0, 1 ); // Random 0 or 1 (coin flip)
rand_int( 1000, 9999 ); // Random 4-digit number
```

## Use Cases

### Entity ID Generation

```typescript
import { mkid } from '@backend/liwe3/core';

// User IDs
const userId = await mkid( 'user' );
await app.db.insert( users ).values( {
	id: userId,
	email: 'user@example.com',
} );

// Document IDs with file extension
const docId = await mkid( 'doc', 'pdf' );
await app.db.insert( documents ).values( {
	id: docId,
	title: 'Report',
} );

// Session IDs
const sessionId = await mkid( 'sess' );
await sessionCreate( app.kv, 'myapp', userId );
```

### Temporary Codes

```typescript
import { unique_code } from '@backend/liwe3/core';

// Verification code
const verifyCode = await unique_code( true, 'verify' );
await sendEmail( user.email, `Your code: ${verifyCode}` );

// Download token
const downloadToken = await unique_code();
const url = `/download?token=${downloadToken}`;
```

### Numeric Codes

```typescript
import { unique_code_numbers } from '@backend/liwe3/core';

// 6-digit PIN
const pin = unique_code_numbers( 6 );
// '123456'

// Order number
const orderNumber = unique_code_numbers( 8, 4 );
// '12345678.9012'

// Confirmation code
const confirmCode = unique_code_numbers( 10 );
```

### Random Values

```typescript
import { rand_int } from '@backend/liwe3/core';

// Random port
const port = rand_int( 3000, 9000 );

// Random delay
const delay = rand_int( 100, 500 );
await sleep( delay );

// Random selection
const items = [ 'red', 'blue', 'green' ];
const randomItem = items[rand_int( 0, items.length - 1 )];
```

## ID Prefix Conventions

Recommended prefixes for consistency:

| Prefix | Entity       | Example          |
| ------ | ------------ | ---------------- |
| `user` | User         | `user.abc123...` |
| `sess` | Session      | `sess.def456...` |
| `doc`  | Document     | `doc.ghi789...`  |
| `evt`  | Event        | `evt.jkl012...`  |
| `org`  | Organization | `org.mno345...`  |
| `tok`  | Token        | `tok.pqr678...`  |
| `api`  | API Key      | `api.stu901...`  |
| `inv`  | Invoice      | `inv.vwx234...`  |
| `prd`  | Product      | `prd.yza567...`  |

## Security Considerations

1. **IDs are not cryptographically secure** - Don't use for security tokens
2. **Timestamp-based** - IDs reveal creation time
3. **Predictable pattern** - Not suitable for access control
4. **Use dedicated auth tokens** - For sensitive operations, use JWT or session tokens

## Best Practices

1. **Always use prefixes** - Makes IDs self-documenting
2. **Consistent prefix naming** - Use lowercase, 3-4 characters
3. **Await mkid()** - It's an async function
4. **Index IDs in database** - IDs are primary keys
5. **Don't modify generated IDs** - Treat as immutable

## Related

- [crypto.ts](./crypto.md) - Secure hashing functions
- [session.ts](./session.md) - Session ID generation
- [conv.ts](./conv.md) - Base-96 encoding utilities
