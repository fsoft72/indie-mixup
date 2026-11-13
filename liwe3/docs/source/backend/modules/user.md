# User Module (`@backend/modules/user`)

Complete user management module providing authentication, authorization, and user CRUD operations.

## Overview

The User module provides comprehensive user management functionality including:

- **User Authentication** - Login/logout with JWT tokens
- **User Management** - Create, list, delete users
- **Permission Management** - Role-based access control
- **Session Management** - Secure session handling with Cloudflare KV
- **Admin Setup** - Bootstrap admin user creation

## Installation

```bash
pnpm add @backend/modules/user
```

## Module Initialization

```typescript
import { app_init } from '@backend/liwe3/core';
import { module_init as userModule } from '@backend/modules/user';

const app = app_init( 'myapp', env );
userModule( app );
```

## Database Schema

### User Table

```typescript
{
  id: string;              // Unique user ID (e.g., "user_abc123...")
  domain: string;          // User's domain (optional)
  email: string;           // Email address
  username: string;        // Username (required)
  name: string;            // First name
  lastname: string;        // Last name
  perms: string[];         // Array of permission strings
  enabled: number;         // 1 = enabled, 0 = disabled
  level: number;           // User level (numerical)
  password: string;        // Hashed password (never exposed in API)
  code: string;            // Verification/temporary code
  refresh_token: string;   // Refresh token
  created: string;         // Creation timestamp
  updated: string;         // Last update timestamp
}
```

**Indexes:**

- `idx_user_domain` - Domain field
- `idx_user_enabled` - Enabled field
- `idx_user_email` - Email field
- `idx_user_username` - Username field

## API Endpoints

### Authentication

#### POST `/api/user/login`

Authenticate a user and create a session.

**Request Body:**

```typescript
{
	username: string; // Username or email
	password: string; // Plain text password (min 5 chars)
}
```

**Response:**

```typescript
{
  ok: true,
  status: 200,
  data: {
    id: string;
    username: string;
    email: string;
    perms: string[];
    domain: string;          // User's domain
    token: string;           // JWT token (3 hours)
    refresh_token?: string;
  }
}
```

**Example:**

```typescript
const response = await fetch( '/api/user/login', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify( {
		username: 'johndoe',
		password: 'securepassword123',
	} ),
} );

const result = await response.json();
if ( result.ok ) {
	// Store token for future requests
	localStorage.setItem( 'token', result.data.token );

	// Access user data including domain
	console.log( 'User domain:', result.data.domain );
	console.log( 'Permissions:', result.data.perms );
}
```

**Errors:**

- `403` - Invalid credentials
- `500` - Session creation failed

---

#### GET `/api/user/logout`

Destroy the current user session.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```typescript
{
  ok: true,
  status: 200,
  data: {
    success: true,
    message: "Successfully logged out"
  }
}
```

**Example:**

```typescript
const response = await fetch( '/api/user/logout', {
	headers: {
		Authorization: `Bearer ${token}`,
	},
} );
```

**Errors:**

- `401` - No active session found
- `500` - Logout failed

---

#### GET `/api/user/me`

Get current logged-in user session data.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```typescript
{
  ok: true,
  status: 200,
  data: {
    userId: string;
    sessionId: string;
    createdAt: number;      // Unix timestamp
    expiresAt: number;      // Unix timestamp
    metadata: {
      id: string;
      username: string;
      email: string;
      perms: string[];
      domain: string;       // User's domain
      loginTime: string;    // ISO timestamp
    }
  }
}
```

**Example:**

```typescript
const response = await fetch( '/api/user/me', {
	headers: {
		Authorization: `Bearer ${token}`,
	},
} );

const result = await response.json();
if ( result.ok ) {
	console.log( 'Current user:', result.data.metadata.username );
	console.log( 'User domain:', result.data.metadata.domain );
	console.log( 'Permissions:', result.data.metadata.perms );
}
```

**To get the user's domain:**

```typescript
const response = await fetch( '/api/user/me', {
	headers: { Authorization: `Bearer ${token}` },
} );

const result = await response.json();
if ( result.ok ) {
	// The user's domain is stored in session metadata
	const userDomain = result.data.metadata?.domain;
	console.log( 'User domain:', userDomain );
}
```

**Errors:**

- `401` - No active session found
- `500` - Failed to retrieve user data

---

### User Management

#### GET `/api/user/list`

List all users with optional pagination.

**Query Parameters:**

```typescript
{
  offset?: number;  // Starting index (default: 0)
  limit?: number;   // Max results (default: 100 when offset is set)
}
```

**Response:**

```typescript
{
  ok: true,
  status: 200,
  data: User[]  // Array of user objects (includes sensitive fields!)
}
```

**Example:**

```typescript
// Get first 50 users
const response = await fetch( '/api/user/list?offset=0&limit=50' );

// Get all users (no pagination)
const response = await fetch( '/api/user/list' );
```

**Errors:**

- `400` - Invalid params

---

#### POST `/api/user/add`

Create a new user.

**Request Body:**

```typescript
{
  username: string;      // Required (1-200 chars)
  password?: string;     // Optional (max 64 chars) - defaults to 'n0p4ssw0rd'
  email?: string;        // Optional email address
  name?: string;         // Optional first name
  lastname?: string;     // Optional last name
  domain?: string;       // Optional domain (max 50 chars)
  perms?: string[];      // Optional permissions array
  enabled?: number;      // Optional (1 or 0)
  level?: number;        // Optional user level
}
```

**Response:**

```typescript
{
  ok: true,
  status: 200,
  data: UserSafe  // User without password/code/refresh_token
}
```

**Example:**

```typescript
const response = await fetch( '/api/user/add', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify( {
		username: 'janedoe',
		password: 'securepass123',
		email: 'jane@example.com',
		name: 'Jane',
		lastname: 'Doe',
		domain: 'sales',
		perms: [ 'user.read' ],
		enabled: 1,
		level: 1,
	} ),
} );
```

**Errors:**

- `400` - Validation error
- `500` - User creation failed

---

#### DELETE `/api/user/delete`

Delete a user by ID.

**Required Permission:** `user.delete`

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Request Body:**

```typescript
{
	id: string; // User ID to delete
}
```

**Response:**

```typescript
{
  ok: true,
  status: 200,
  data: { ok: true }
}
```

**Example:**

```typescript
const response = await fetch( '/api/user/delete', {
	method: 'DELETE',
	headers: {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	},
	body: JSON.stringify( {
		id: 'user_abc123',
	} ),
} );
```

**Errors:**

- `400` - Validation error
- `403` - Insufficient permissions
- `500` - Delete failed

---

### Permission Management

#### POST `/api/user/perms/set`

Set user permissions (overwrites existing permissions).

**Required Permission:** `user.perms`

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Request Body:**

```typescript
{
  userId: string;       // User ID to update
  permissions: string[]; // New permissions array
}
```

**Response:**

```typescript
{
  ok: true,
  status: 200,
  data: UserSafe  // Updated user data
}
```

**Example:**

```typescript
const response = await fetch( '/api/user/perms/set', {
	method: 'POST',
	headers: {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	},
	body: JSON.stringify( {
		userId: 'user_abc123',
		permissions: [ 'user.read', 'user.write', 'document.read' ],
	} ),
} );
```

**Errors:**

- `400` - Validation error
- `403` - Insufficient permissions
- `404` - User not found
- `500` - Update failed

---

### Admin Setup

#### GET `/api/user/create/admin`

Create an admin user with `system.admin` permission (bootstrap endpoint).

**Query Parameters:**

```typescript
{
	username: string; // Admin username
	password: string; // Admin password
	key: string; // Secret admin key from config (ADMIN_KEY)
}
```

**Response:**

```typescript
{
  ok: true,
  status: 200,
  data: UserSafe  // Created admin user
}
```

**Example:**

```typescript
const response = await fetch(
	'/api/user/create/admin?'
		+ new URLSearchParams( {
			username: 'admin',
			password: 'secure-admin-password',
			key: 'your-secret-admin-key-from-env',
		} ),
);
```

**Errors:**

- `400` - Validation error
- `403` - Invalid admin key
- `409` - Username already exists
- `500` - Admin creation failed

---

## Module Permissions

The user module registers the following permissions:

| Permission      | Description                 |
| --------------- | --------------------------- |
| `user.create`   | Can create new users        |
| `user.delete`   | Can delete existing users   |
| `user.password` | Can change user passwords   |
| `user.list`     | Can list and view users     |
| `user.perms`    | Can manage user permissions |

**Special Permissions:**

- `system.admin` - Bypasses all permission checks (set on admin users)

## Types

### `User`

Complete user record from database (includes sensitive fields).

```typescript
type User = {
	id : string;
	domain : string | null;
	email : string | null;
	username : string;
	name : string | null;
	lastname : string | null;
	perms : string[] | null;
	enabled : number | null;
	level : number | null;
	password : string | null;
	code : string | null;
	refresh_token : string | null;
	created : string | null;
	updated : string | null;
};
```

### `UserSafe`

User record without sensitive fields (for API responses).

```typescript
type UserSafe = Omit<User, 'password' | 'refresh_token' | 'code'>;
```

### `UserLoginType`

Login response data.

```typescript
type UserLoginType = {
	id : string;
	username : string;
	email : string;
	perms : string[];
	domain : string;
	token : string;
	refresh_token? : string;
};
```

## Complete Authentication Flow

### 1. Create Admin User (One-time Setup)

```typescript
// First-time setup: create admin user
const response = await fetch(
	'/api/user/create/admin?'
		+ new URLSearchParams( {
			username: 'admin',
			password: 'secure-password',
			key: process.env.ADMIN_KEY,
		} ),
);
```

### 2. Login

```typescript
const loginResponse = await fetch( '/api/user/login', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify( {
		username: 'admin',
		password: 'secure-password',
	} ),
} );

const loginResult = await loginResponse.json();
const token = loginResult.data.token;
```

### 3. Make Authenticated Requests

```typescript
// Get current user
const meResponse = await fetch( '/api/user/me', {
	headers: {
		Authorization: `Bearer ${token}`,
	},
} );

// Create new user
const createResponse = await fetch( '/api/user/add', {
	method: 'POST',
	headers: {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	},
	body: JSON.stringify( {
		username: 'newuser',
		password: 'password123',
		email: 'user@example.com',
		perms: [ 'user.read' ],
	} ),
} );
```

### 4. Logout

```typescript
await fetch( '/api/user/logout', {
	headers: {
		Authorization: `Bearer ${token}`,
	},
} );
```

## Security Best Practices

1. **Always use HTTPS** - Protect tokens in transit
2. **Store tokens securely** - Use httpOnly cookies or secure storage
3. **Validate permissions** - Check permissions on sensitive operations
4. **Use strong admin key** - Keep `ADMIN_KEY` secret and complex
5. **Hash passwords** - Never store plain text passwords (handled automatically)
6. **Set appropriate permissions** - Follow principle of least privilege
7. **Handle token expiration** - Refresh tokens before they expire (3 hours)

## Configuration

Add to `config.json`:

```json
{
	"jwt": {
		"secret": "{{JWT_SECRET}}",
		"expiresIn": "3h"
	},
	"site": {
		"adminKey": "{{ADMIN_KEY}}"
	}
}
```

Set environment variables:

- `JWT_SECRET` - Secret for JWT signing
- `ADMIN_KEY` - Secret key for admin user creation

## Database Migration

```sql
-- Create users table
CREATE TABLE User (
  id TEXT PRIMARY KEY NOT NULL,
  domain TEXT,
  email TEXT,
  username TEXT NOT NULL,
  name TEXT,
  lastname TEXT,
  perms TEXT,  -- JSON array
  enabled INTEGER,
  level INTEGER,
  password TEXT,
  code TEXT,
  refresh_token TEXT,
  created TEXT DEFAULT CURRENT_TIMESTAMP,
  updated TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_user_domain ON User(domain);
CREATE INDEX idx_user_enabled ON User(enabled);
CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_user_username ON User(username);
```

## Related Documentation

- [LiWE3 Core Library](../liwe3/index.md)
- [Session Management](../liwe3/session.md)
- [Permissions System](../liwe3/permissions.md)
- [Response Format](../liwe3/response.md)
