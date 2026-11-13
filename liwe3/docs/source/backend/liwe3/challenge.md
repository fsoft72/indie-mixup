# challenge.ts

Challenge-response authentication utilities for secure request verification.

## Overview

The challenge module provides functions to create and verify challenge strings based on a secret and a set of parameters. This is useful for implementing challenge-response authentication patterns or verifying that request parameters haven't been tampered with.

## Functions

### `challenge_create()`

Creates a challenge hash from a secret and parameters.

```typescript
const challenge_create = async (
  secret: string,
  params: string[],
  debug?: boolean
): Promise<string>
```

**Parameters:**

- `secret` - Secret key used to generate the challenge
- `params` - Array of strings to include in the challenge
- `debug` - Optional debug flag (default: `false`)

**Returns:** SHA-256 hash of the normalized parameters and secret

**Behavior:**

1. Converts all parameters to lowercase strings
2. Sorts parameters alphabetically
3. Appends the secret to the parameter list
4. Joins with `-` separator
5. Removes multiple consecutive dashes
6. Removes leading dashes
7. Returns SHA-256 hash of the result

**Example:**

```typescript
import { challenge_create } from '@backend/liwe3/core';

const challenge = await challenge_create(
	'my-secret-key',
	[ 'user123', 'action-login', '1234567890' ],
);
// Returns: "a1b2c3d4e5f6..." (SHA-256 hash)
```

### `challenge_check()`

Verifies a challenge against provided parameters and secret.

```typescript
const challenge_check = async (
  challenge: string,
  secret: string,
  params: string[]
): Promise<boolean>
```

**Parameters:**

- `challenge` - The challenge string to verify
- `secret` - Secret key used to generate the original challenge
- `params` - Array of parameters to verify against

**Returns:** `true` if the challenge matches, `false` otherwise

**Example:**

```typescript
import { challenge_check } from '@backend/liwe3/core';

const isValid = await challenge_check(
	receivedChallenge,
	'my-secret-key',
	[ 'user123', 'action-login', '1234567890' ],
);

if ( !isValid ) {
	return responseError( 'Invalid challenge', 401 );
}
```

## Use Cases

### API Request Verification

Verify that request parameters haven't been modified:

```typescript
// Client generates challenge
const params = [ userId, timestamp, action ];
const challenge = await challenge_create( API_SECRET, params );

// Send request with challenge
await fetch( '/api/endpoint', {
	method: 'POST',
	body: JSON.stringify( { userId, timestamp, action, challenge } ),
} );

// Server verifies
const isValid = await challenge_check(
	body.challenge,
	API_SECRET,
	[ body.userId, body.timestamp, body.action ],
);
```

### URL Signature Verification

Create signed URLs to prevent tampering:

```typescript
const userId = 'user_123';
const expiresAt = Date.now() + 3600000;
const challenge = await challenge_create(
	SECRET_KEY,
	[ userId, expiresAt.toString() ],
);

const url = `/download?user=${userId}&expires=${expiresAt}&sig=${challenge}`;
```

### Form Submission Validation

Validate that form data matches expected values:

```typescript
// Generate challenge when form is rendered
const formParams = [ formId, userId, timestamp ];
const challenge = await challenge_create( FORM_SECRET, formParams );

// Verify on form submission
const isValid = await challenge_check(
	submittedChallenge,
	FORM_SECRET,
	[ formId, userId, timestamp ],
);
```

## Security Considerations

1. **Keep secrets secure** - Never expose the secret to clients
2. **Use timestamps** - Include timestamp in parameters to prevent replay attacks
3. **Parameter order doesn't matter** - Parameters are sorted before hashing
4. **Case insensitive** - All parameters are converted to lowercase
5. **Empty values handled** - Empty or null values are converted to empty strings

## Implementation Notes

- Uses SHA-256 hashing via the `crypto` module
- Parameter normalization ensures consistent challenge generation
- Challenge strings are deterministic for the same inputs
- Multiple dashes are collapsed to prevent hash collision attempts

## Related

- [crypto.ts](./crypto.md) - Underlying cryptographic functions
- [session.ts](./session.md) - Session management utilities
