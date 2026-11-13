# User Module Documentation

## Overview

The User module provides complete user management functionality including user registration, authentication, listing, and deletion. It handles password hashing, session management, and secure user data handling.

## Database Schema

### User Table Structure

| Field         | Type        | Description                                             | Required             |
| ------------- | ----------- | ------------------------------------------------------- | -------------------- |
| id            | string      | Unique identifier for the user                          | Yes (auto-generated) |
| domain        | string(200) | Domain associated with the user account                 | No                   |
| email         | string(200) | Email address of the user                               | No                   |
| username      | string(200) | Username for the user account                           | Yes                  |
| name          | string(200) | First name of the user                                  | No                   |
| lastname      | string(200) | Last name of the user                                   | No                   |
| perms         | string(200) | User permissions stored as comma-separated string       | No                   |
| enabled       | integer     | Whether the user account is enabled (1) or disabled (0) | No                   |
| level         | integer     | User access level (numerical value)                     | No                   |
| password      | string(200) | Hashed password for user authentication                 | No                   |
| code          | string(200) | Verification or temporary code for user operations      | No                   |
| refresh_token | string(200) | Refresh token for authentication                        | No                   |
| created       | string      | Account creation timestamp                              | No (auto-generated)  |
| updated       | string      | Last account update timestamp                           | No (auto-generated)  |

## API Endpoints

### GET /api/user/list

Lists all users in the database.

**Request Parameters:** None

**Response Type:** `User[]`

**Response Example:**

```json
{
	"success": true,
	"data": [
		{
			"id": "user_abc123",
			"domain": "example.com",
			"email": "john@example.com",
			"username": "johnsmith",
			"name": "John",
			"lastname": "Smith",
			"perms": "admin,user",
			"enabled": 1,
			"level": 5,
			"password": "hashed_password",
			"code": null,
			"refresh_token": "refresh_xyz789",
			"created": "2023-01-01T00:00:00Z",
			"updated": "2023-01-01T00:00:00Z"
		}
	]
}
```

**Usage Example:**

```bash
curl -X GET "http://localhost:8787/api/user/list"
```

### POST /api/user/add

Creates a new user account with hashed password.

**Request Parameters:**

- `username` (required): Username for the user account
- `id` (optional): Unique identifier (auto-generated if not provided)
- `domain` (optional): Domain associated with the user account
- `email` (optional): Email address of the user
- `name` (optional): First name of the user
- `lastname` (optional): Last name of the user
- `perms` (optional): User permissions as comma-separated string
- `enabled` (optional): Whether the account is enabled (1) or disabled (0)
- `level` (optional): User access level (numerical value)
- `password` (optional): Password for authentication (defaults to 'n0p4ssw0rd')

**Response Type:** `UserSafe` (User without password, refresh_token, and code fields)

**Response Example:**

```json
{
	"success": true,
	"data": {
		"id": "user_abc123",
		"domain": "example.com",
		"email": "john@example.com",
		"username": "johnsmith",
		"name": "John",
		"lastname": "Smith",
		"perms": "user",
		"enabled": 1,
		"level": 1,
		"created": "2023-01-01T00:00:00Z",
		"updated": "2023-01-01T00:00:00Z"
	}
}
```

**Usage Example:**

```bash
curl -X POST "http://localhost:8787/api/user/add" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johnsmith",
    "email": "john@example.com",
    "name": "John",
    "lastname": "Smith",
    "password": "securepassword123"
  }'
```

### POST /api/user/login

Authenticates a user by username/email and password, creating a session.

**Request Parameters:**

- `username` (required): Username or email of the user
- `password` (required): Password for authentication (minimum 5 characters)

**Response Type:** `UserLoginType`

**Response Example:**

```json
{
	"success": true,
	"data": {
		"id": "user_abc123",
		"username": "johnsmith",
		"email": "john@example.com",
		"perms": ["admin", "user"],
		"token": "session_token_xyz789",
		"refresh_token": "refr_abc123"
	}
}
```

**Usage Example:**

```bash
curl -X POST "http://localhost:8787/api/user/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johnsmith",
    "password": "securepassword123"
  }'
```

### DELETE /api/user/delete

Deletes a user by their ID.

**Request Parameters:**

- `id` (required): ID of the user to delete

**Response Type:** `{ ok: boolean }`

**Response Example:**

```json
{
	"success": true,
	"data": {
		"ok": true
	}
}
```

**Usage Example:**

```bash
curl -X DELETE "http://localhost:8787/api/user/delete" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user_abc123"
  }'
```

## Exported Functions

### module_init(app: LiWEApp)

Initializes the user module by registering all route handlers with the provided Hono app instance.

**Parameters:**

- `app`: LiWE application instance containing the Hono router and database connection

**Usage:**

```typescript
import { module_init } from '@backend/modules/user';

// Initialize the user module
module_init( app );
```

### user_add(app: LiWEApp, params: UserAddParams)

Creates a new user with automatic ID generation and password hashing.

**Parameters:**

- `app`: LiWE application instance
- `params`: User data conforming to UserSchema

**Returns:** `Promise<LiWEResponse<UserSafe>>`

### user_delete(app: LiWEApp, params: UserDeleteParams)

Deletes a user by their ID.

**Parameters:**

- `app`: LiWE application instance
- `params`: Object containing the user ID to delete

**Returns:** `Promise<LiWEResponse<{ ok: boolean }>>`

### user_list(app: LiWEApp, params?: UserListParams)

Retrieves all users from the database.

**Parameters:**

- `app`: LiWE application instance
- `params`: Empty object (optional)

**Returns:** `Promise<LiWEResponse<User[]>>`

### user_login(app: LiWEApp, params: UserLoginParams)

Authenticates a user and creates a session with 7-day expiration.

**Parameters:**

- `app`: LiWE application instance
- `params`: Login credentials (username/email and password)

**Returns:** `Promise<LiWEResponse<UserLoginType>>`

## Exported Types

### UserType

Complete user object type inferred from UserSchema.

### UserTypeSafe

User type without sensitive fields (password, code, created, updated).

### UserLoginDataType

Login request data type (username and password).

### UserLoginType

Login response data type with user info and session tokens.

### User

Database user record type (from Drizzle schema).

### NewUser

Type for inserting new user records.

### UserSafe

User type without sensitive fields (password, refresh_token, code).

## Security Features

- Automatic password hashing using bcrypt
- Session-based authentication with configurable expiration
- Input validation using Zod schemas
- Sensitive field exclusion in API responses
- Username/email lookup for login flexibility
- Permission-based access control support

## Error Handling

All endpoints return standardized LiWEResponse format:

- Success responses include `success: true` and `data` field
- Error responses include `success: false`, `message`, and optional `code`
- Validation errors return 400/403 status codes
- Server errors return 500 status codes
