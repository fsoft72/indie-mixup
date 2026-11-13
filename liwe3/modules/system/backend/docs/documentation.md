# System Module Documentation

## Overview

The System module provides core system administration functionality including domain management, permissions listing, system monitoring, and email testing. It handles multi-tenant domain management, system uptime tracking, and administrative operations.

## Database Schema

### System Domains Table Structure

| Field   | Type       | Description                                  | Required            |
| ------- | ---------- | -------------------------------------------- | ------------------- |
| code    | string(30) | Domain unique code (unique)                  | Yes                 |
| name    | string(50) | Domain name                                  | Yes                 |
| visible | boolean    | Whether the domain is visible (default true) | Yes                 |
| created | string     | Domain creation timestamp                    | No (auto-generated) |
| updated | string     | Last domain update timestamp                 | No (auto-generated) |

### System Themes Table Structure

| Field   | Type       | Description                 | Required            |
| ------- | ---------- | --------------------------- | ------------------- |
| code    | string(30) | Domain code (unique)        | Yes                 |
| data    | json       | Theme data stored as JSON   | Yes                 |
| created | string     | Theme creation timestamp    | No (auto-generated) |
| updated | string     | Last theme update timestamp | No (auto-generated) |

## API Endpoints

### GET /api/system/domains/list

Lists all visible domains available to users.

**Request Parameters:** None

**Response Type:** `SystemDomain[]`

**Response Example:**

```json
{
	"success": true,
	"data": [
		{
			"code": "main",
			"name": "Main Domain",
			"visible": true,
			"created": "2023-01-01T00:00:00Z",
			"updated": "2023-01-01T00:00:00Z"
		}
	]
}
```

**Usage Example:**

```bash
curl -X GET "http://localhost:8787/api/system/domains/list"
```

### POST /api/system/domain/set

Sets the current domain for the user session.

**Request Parameters:**

- `code` (required): Domain unique code

**Response Type:** `SystemDomain`

**Response Example:**

```json
{
	"success": true,
	"data": {
		"code": "main",
		"name": "Main Domain",
		"visible": true,
		"created": "2023-01-01T00:00:00Z",
		"updated": "2023-01-01T00:00:00Z"
	}
}
```

**Usage Example:**

```bash
curl -X POST "http://localhost:8787/api/system/domain/set" \
  -H "Content-Type: application/json" \
  -d '{"code": "main"}'
```

### POST /api/system/domain/create/invite

Creates an invitation token for a domain with optional expiration.

**Request Parameters:**

- `code` (required): Domain unique code
- `expire` (required): Expiration time in minutes (0 = no expiration)

**Response Type:** `string` (invitation token)

**Response Example:**

```json
{
	"success": true,
	"data": "inv_abc123xyz789"
}
```

**Usage Example:**

```bash
curl -X POST "http://localhost:8787/api/system/domain/create/invite" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "production",
    "expire": 1440
  }'
```

### POST /api/system/admin/domain/add

Creates a new domain in the system (admin only).

**Request Parameters:**

- `code` (optional): Domain unique code (auto-generated if not provided)
- `name` (optional): Domain name (defaults to code if not provided)
- `visible` (optional): Whether domain is visible (default true)

**Response Type:** `SystemDomain`

**Response Example:**

```json
{
	"success": true,
	"data": {
		"code": "production",
		"name": "Production Environment",
		"visible": true,
		"created": "2023-01-01T00:00:00Z",
		"updated": "2023-01-01T00:00:00Z"
	}
}
```

**Usage Example:**

```bash
curl -X POST "http://localhost:8787/api/system/admin/domain/add" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "production",
    "name": "Production Environment",
    "visible": true
  }'
```

### PATCH /api/system/admin/domain/update

Updates an existing domain (admin only).

**Request Parameters:**

- `code` (required): Domain code to update
- `name` (optional): New domain name
- `visible` (optional): New visibility status

**Response Type:** `SystemDomain`

### DELETE /api/system/admin/domain/del

Deletes a domain from the system (admin only).

**Request Parameters:**

- `code` (required): Domain code to delete

**Response Type:** `{ deleted: boolean }`

### GET /api/system/admin/domains/list

Lists all domains in the system including hidden ones (admin only).

**Request Parameters:** None

**Response Type:** `SystemDomain[]`

**Usage Example:**

```bash
curl -X GET "http://localhost:8787/api/system/admin/domains/list"
```

### GET /api/system/admin/permissions/list

Lists all permissions available in the system. Returns different results based on user permissions:

- Users with `system.admin`: Returns all available permissions
- Other users: Returns only permissions the user currently has

**Request Parameters:** None

**Response Type:** `Record<string, SystemPermission[]>` (permissions grouped by module)

**Response Example:**

```json
{
	"success": true,
	"data": {
		"system": [
			{
				"name": "system.admin",
				"description": "The super user permission to do everything"
			},
			{
				"name": "system.domain",
				"description": "The user can operate on system domains"
			}
		],
		"user": [
			{
				"name": "user.create",
				"description": "Create new users"
			}
		]
	}
}
```

**Usage Example:**

```bash
curl -X GET "http://localhost:8787/api/system/admin/permissions/list"
```

### GET /api/system/uptime

Returns the system uptime in seconds since the module was initialized.

**Request Parameters:** None

**Response Type:** `number` (uptime in seconds)

**Response Example:**

```json
{
	"success": true,
	"data": 3600
}
```

**Usage Example:**

```bash
curl -X GET "http://localhost:8787/api/system/uptime"
```

### POST /api/system/email/test

Tests email sending functionality. Currently simulated, returns success for testing purposes.

**Request Parameters:**

- `email` (optional): Destination email address for test (defaults to 'default@system.local')

**Response Type:** `boolean` (whether email was sent successfully)

**Response Example:**

```json
{
	"success": true,
	"data": true
}
```

**Usage Example:**

```bash
curl -X POST "http://localhost:8787/api/system/email/test" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Exported Functions

### module_init(app: LiWEApp)

Initializes the system module by registering all route handlers and permissions with the provided Hono app instance.

**Parameters:**

- `app`: LiWE application instance containing the Hono router and database connection

**Usage:**

```typescript
import { module_init } from '@backend/modules/system';

// Initialize the system module
module_init( app );
```

### system_domains_list(app: LiWEApp, params: SystemDomainsListParams)

Lists all visible domains available to users.

**Parameters:**

- `app`: LiWE application instance
- `params`: Empty parameters object

**Returns:** `Promise<LiWEResponse<SystemDomainsListResult>>`

### system_domain_set(app: LiWEApp, params: SystemDomainSetParams)

Sets the current domain for the user session.

**Parameters:**

- `app`: LiWE application instance
- `params`: Object containing domain code

**Returns:** `Promise<LiWEResponse<SystemDomainSetResult>>`

### system_domain_create_invite(app: LiWEApp, params: SystemDomainCreateInviteParams)

Creates an invitation token for a domain with optional expiration.

**Parameters:**

- `app`: LiWE application instance
- `params`: Object containing domain code and expiration time

**Returns:** `Promise<LiWEResponse<SystemDomainCreateInviteResult>>`

### system_admin_domain_add(app: LiWEApp, params: SystemAdminDomainAddParams)

Creates a new domain in the system (admin functionality).

**Parameters:**

- `app`: LiWE application instance
- `params`: Domain creation parameters

**Returns:** `Promise<LiWEResponse<SystemAdminDomainAddResult>>`

### system_admin_domain_update(app: LiWEApp, params: SystemAdminDomainUpdateParams)

Updates an existing domain (admin functionality).

**Parameters:**

- `app`: LiWE application instance
- `params`: Domain update parameters

**Returns:** `Promise<LiWEResponse<SystemAdminDomainUpdateResult>>`

### system_admin_domain_del(app: LiWEApp, params: SystemAdminDomainDelParams)

Deletes a domain from the system (admin functionality).

**Parameters:**

- `app`: LiWE application instance
- `params`: Object containing domain code to delete

**Returns:** `Promise<LiWEResponse<SystemAdminDomainDelResult>>`

### system_admin_domains_list(app: LiWEApp, params: SystemAdminDomainsListParams)

Lists all domains including hidden ones (admin functionality).

**Parameters:**

- `app`: LiWE application instance
- `params`: Empty parameters object

**Returns:** `Promise<LiWEResponse<SystemAdminDomainsListResult>>`

### system_admin_permissions_list(app: LiWEApp, params?: SystemAdminPermissionsListParams)

Lists all permissions available in the system based on user's access level.

**Parameters:**

- `app`: LiWE application instance
- `params`: Optional empty parameters object

**Returns:** `Promise<LiWEResponse<SystemAdminPermissionsListResult>>`

### system_uptime(app: LiWEApp, params: SystemUptimeParams)

Returns the system uptime in seconds.

**Parameters:**

- `app`: LiWE application instance
- `params`: Empty parameters object

**Returns:** `Promise<LiWEResponse<SystemUptimeResult>>`

### system_email_test(app: LiWEApp, params: SystemEmailTestParams)

Tests email sending functionality.

**Parameters:**

- `app`: LiWE application instance
- `params`: Object containing optional destination email

**Returns:** `Promise<LiWEResponse<SystemEmailTestResult>>`

## Exported Types

### SystemDomain

Complete system domain record type from database schema.

### NewSystemDomain

Type for inserting new system domain records.

### SystemTheme

Complete system theme record type from database schema.

### NewSystemTheme

Type for inserting new system theme records.

### SystemDomainAdmin

Admin view of SystemDomain (includes all fields).

### SystemDomainPublic

Public view of SystemDomain (only code and name fields).

## Permissions

The module registers the following permissions:

- `system.admin`: The super user permission to do everything
- `system.domain`: The user can operate on system domains
- `system.theme`: The user can manage system themes

## Key Features

### Multi-Tenant Domain Management

The system supports multiple domains with individual visibility settings, enabling multi-tenant applications.

### Auto-generated Domain Codes

When creating domains, codes can be auto-generated from domain names by converting to lowercase and replacing non-alphanumeric characters.

### Invitation System

Domain-specific invitation tokens can be created with configurable expiration times for controlled access.

### Permission-Based Access Control

Administrative endpoints are protected by the permission system, with different access levels for different user types.

### System Monitoring

Built-in uptime tracking to monitor system health and availability.

### Email Testing

Simulated email testing functionality for verifying email service configuration.

## Implementation Notes

### Session Management

The `system_domain_set` endpoint currently validates domain existence but does not implement actual session storage. This is marked as TODO for future implementation.

### Email Service

The `system_email_test` endpoint currently simulates email sending and always returns success. Real email service integration is marked as TODO.

### Invitation Storage

The `system_domain_create_invite` endpoint generates tokens but does not currently store them with expiration tracking. This is marked as TODO for future implementation.

## Error Handling

All endpoints return standardized LiWEResponse format:

- Success responses include `success: true` and `data` field
- Error responses include `success: false`, `message`, and optional `code`
- Common error codes:
  - `VALIDATION_ERROR`: Input validation failed
  - `DOMAIN_NOT_FOUND`: Specified domain does not exist
  - `DOMAIN_EXISTS`: Domain with code already exists
  - `DOMAIN_NOT_VISIBLE`: Domain is not available for the operation
  - `MISSING_PARAMETERS`: Required parameters not provided
  - `DATABASE_ERROR`: Database operation failed
  - `CREATION_FAILED`: Failed to create domain
  - `EMAIL_ERROR`: Email operation failed
  - `CALCULATION_ERROR`: System calculation failed
