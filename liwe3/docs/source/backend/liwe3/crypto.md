# crypto.ts

Cryptographic utilities for hashing, password management, and JWT operations using Web Crypto API.

## Overview

The `crypto` module provides secure cryptographic functions for:

- SHA-256 and SHA-512 hashing
- Password hashing with PBKDF2 and salt
- Password verification with constant-time comparison
- JWT token creation and verification

All functions use the Web Crypto API, which is available in Cloudflare Workers.

## Functions

### Hashing

#### `sha256()`

Computes SHA-256 hash of a string.

```typescript
const sha256 = async (text: string): Promise<string>
```

**Parameters:**

- `text` - String to hash

**Returns:** Hexadecimal SHA-256 hash

**Example:**

```typescript
import { sha256 } from '@backend/liwe3/core';

const hash = await sha256( 'Hello World' );
// 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'
```

#### `sha512()`

Computes SHA-512 hash of a string.

```typescript
const sha512 = async (text: string): Promise<string>
```

**Parameters:**

- `text` - String to hash

**Returns:** Hexadecimal SHA-512 hash

**Example:**

```typescript
import { sha512 } from '@backend/liwe3/core';

const hash = await sha512( 'Hello World' );
// '2c74fd17edafd80e8447b0d46741ee243b7eb74dd2149a0ab1b9246fb30382f27e853d8585719e0e67cbda0daa8f51671064615d645ae27acb15bfb1447f459b'
```

### Password Management

#### `hashPassword()`

Securely hashes a password using PBKDF2 with a random salt.

```typescript
const hashPassword = async (password: string): Promise<string>
```

**Parameters:**

- `password` - Plain text password (max 1000 characters)

**Returns:** Hashed password in format `{salt}${hash}` (hex-encoded)

**Security Features:**

- Generates random 16-byte salt
- Uses PBKDF2 with 100,000 iterations
- Uses SHA-512 as the hash algorithm
- Derives AES-GCM 256-bit key

**Throws:**

- Error if password is empty or longer than 1000 characters

**Example:**

```typescript
import { hashPassword } from '@backend/liwe3/core';

const hashed = await hashPassword( 'mySecurePassword123' );
// '3f4a1b2c5d6e7f8a9b0c1d2e3f4a5b6c$7890abcdef...'
```

#### `verifyPassword()`

Verifies a password against a hashed password using constant-time comparison.

```typescript
const verifyPassword = async (
  password: string,
  hashed: string
): Promise<boolean>
```

**Parameters:**

- `password` - Plain text password to verify
- `hashed` - Previously hashed password (from `hashPassword()`)

**Returns:** `true` if password matches, `false` otherwise

**Security Features:**

- Constant-time string comparison (prevents timing attacks)
- Validates hash format before processing
- Safe against malformed input

**Example:**

```typescript
import { verifyPassword } from '@backend/liwe3/core';

const isValid = await verifyPassword(
	'mySecurePassword123',
	storedHashedPassword,
);

if ( !isValid ) {
	return responseError( 'Invalid password', 401 );
}
```

### JWT Operations

#### `jwtCreate()`

Creates a signed JWT token with automatic expiration.

```typescript
const jwtCreate = async (
  payload: Record<string, any>,
  secret: string,
  expiresIn?: number
): Promise<string>
```

**Parameters:**

- `payload` - Data to include in the token
- `secret` - Secret key for signing (min 32 characters after SHA-256)
- `expiresIn` - Expiration time in seconds (default: 10800 = 3 hours, max: 30 days)

**Returns:** JWT token string

**Automatically Adds:**

- `iat` - Issued at timestamp (seconds since epoch)
- `exp` - Expiration timestamp (seconds since epoch)

**Security:**

- Uses HS256 (HMAC with SHA-256)
- Secret is hashed with SHA-256 before use
- Base64URL encoding (URL-safe)

**Throws:**

- Error if payload is not an object
- Error if secret is less than 32 characters
- Error if expiresIn is invalid

**Example:**

```typescript
import { jwtCreate } from '@backend/liwe3/core';

const token = await jwtCreate(
	{ userId: 'user_123', role: 'admin' },
	'my-secret-key',
	3600, // 1 hour
);
// 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

#### `jwtVerify()`

Verifies and decodes a JWT token.

```typescript
const jwtVerify = async (
  token: string,
  secret: string
): Promise<JwtPayload | null>
```

**Parameters:**

- `token` - JWT token to verify
- `secret` - Secret key used for signing

**Returns:**

- Decoded payload if valid and not expired
- `null` if invalid, expired, or tampered

**Security Features:**

- Validates signature using HMAC
- Checks token expiration
- Validates algorithm (prevents algorithm confusion attacks)
- Safe against malformed tokens

**Example:**

```typescript
import { jwtVerify } from '@backend/liwe3/core';

const payload = await jwtVerify( token, 'my-secret-key' );

if ( !payload ) {
	return responseError( 'Invalid or expired token', 401 );
}

const userId = payload.userId;
```

**Payload Type:**

```typescript
type JwtPayload = {
	iat : number; // Issued at
	exp : number; // Expires at
	[key : string] : any; // Custom claims
};
```

## Use Cases

### User Registration

```typescript
import { hashPassword } from '@backend/liwe3/core';

const hashedPassword = await hashPassword( userPassword );

await app.db.insert( users ).values( {
	id: await mkid( 'user' ),
	email,
	password: hashedPassword,
} );
```

### User Login

```typescript
import { jwtCreate, verifyPassword } from '@backend/liwe3/core';

const user = await app.db
	.select()
	.from( users )
	.where( eq( users.email, email ) )
	.get();

if ( !user ) {
	return responseError( 'User not found', 404 );
}

const isValid = await verifyPassword( password, user.password );

if ( !isValid ) {
	return responseError( 'Invalid password', 401 );
}

const token = await jwtCreate(
	{ userId: user.id, email: user.email },
	app.cfg.jwt.secret,
	86400, // 24 hours
);

return responseSuccess( { token } );
```

### Protected Endpoint

```typescript
import { jwtVerify } from '@backend/liwe3/core';

const authHeader = c.req.header( 'Authorization' );
if ( !authHeader || !authHeader.startsWith( 'Bearer ' ) ) {
	return responseError( 'Unauthorized', 401 );
}

const token = authHeader.substring( 7 );
const payload = await jwtVerify( token, app.cfg.jwt.secret );

if ( !payload ) {
	return responseError( 'Invalid token', 401 );
}

// Access user data
const userId = payload.userId;
```

### Content Integrity

```typescript
import { sha256 } from '@backend/liwe3/core';

const fileContent = await readFile( 'document.txt' );
const checksum = await sha256( fileContent );

// Store checksum in database
await app.db.insert( documents ).values( {
	id: await mkid( 'doc' ),
	content: fileContent,
	checksum,
} );

// Later, verify integrity
const doc = await getDocument( docId );
const currentChecksum = await sha256( doc.content );

if ( currentChecksum !== doc.checksum ) {
	throw new Error( 'Document has been tampered with' );
}
```

## Security Best Practices

1. **Never store plain text passwords** - Always use `hashPassword()`
2. **Use strong secrets** - Minimum 32 characters for JWT secrets
3. **Set appropriate token expiration** - Short-lived tokens for sensitive operations
4. **Validate tokens on every request** - Don't trust expired tokens
5. **Use HTTPS** - Protect tokens in transit
6. **Rotate secrets periodically** - Change JWT secrets regularly
7. **Hash user inputs** - Use SHA-256/512 for generating unique identifiers from user data

## Constants

```typescript
const PASSWORD_HASH_ITERATIONS = 100_000; // PBKDF2 iterations
const JWT_EXPIRES_IN = 10800; // Default JWT expiration (3 hours)
```

## Related

- [session.ts](./session.md) - Session management using JWT
- [challenge.ts](./challenge.md) - Challenge-response authentication
- [permissions.ts](./permissions.md) - Permission and authorization
