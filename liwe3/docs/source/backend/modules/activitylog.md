# ActivityLog Module

The **activitylog** module provides a system-wide event logging facility. It records user actions and system events into a SQLite table, supports event-driven logging via the LiWE event system, and exposes HTTP endpoints for listing, adding, deleting, and clearing log entries.

**Package:** `@backend/modules/activitylog`
**Version:** 1.0.0
**Database:** SQLite (via Drizzle ORM)
**Validation:** Zod
**HTTP Framework:** Hono

---

## Table of Contents

- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Permissions](#permissions)
- [Events and Listeners](#events-and-listeners)
- [API Endpoints](#api-endpoints)
- [Methods Reference](#methods-reference)
  - [activity_log_add](#activity_log_add)
  - [activity_log_list](#activity_log_list)
  - [activity_log_del](#activity_log_del)
  - [activity_log_clear](#activity_log_clear)
- [Types](#types)
- [Error Codes](#error-codes)
- [Dependencies](#dependencies)
- [File Structure](#file-structure)

---

## Architecture

The module supports two ways of creating activity log entries:

1. **HTTP endpoint** — `POST /api/activity_log/add` for direct insertion by authorized users.
2. **Event listeners** — Other modules emit events that the activitylog module listens to and records automatically, without direct coupling.

During `module_init()`, the module:

1. Initializes event listeners via `listeners_init()`.
2. Registers 4 HTTP routes on the Hono app.
3. Registers permissions with the global permissions system.

All IDs are generated using `mkid('evt')`, producing prefixed unique identifiers.

---

## Database Schema

### `activity_log_events` table

Stores all activity log entries.

| Column    | Type        | Constraints               | Description                                          |
| --------- | ----------- | ------------------------- | ---------------------------------------------------- |
| `id`      | TEXT(64)    | PK, NOT NULL              | Event ID (prefixed with `evt`, generated via `mkid`) |
| `id_user` | TEXT(64)    | —                         | User ID who triggered the event (optional)           |
| `event`   | TEXT        | NOT NULL                  | Event description / identifier (e.g. `user.login`)   |
| `data`    | TEXT (JSON) | —                         | Arbitrary event data stored as JSON                  |
| `module`  | TEXT        | NOT NULL                  | Source module name (e.g. `user`, `upload`)           |
| `domain`  | TEXT        | NOT NULL                  | User's domain                                        |
| `created` | INTEGER     | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp                            |
| `updated` | INTEGER     | DEFAULT CURRENT_TIMESTAMP | Record last update timestamp                         |

**Note:** The `data` column uses Drizzle's `{ mode: 'json' }` text mode, storing JSON objects as serialized text.

---

## Permissions

Registered under the `activitylog` module namespace during `module_init()`.

| Permission               | Constant                      | Description                            |
| ------------------------ | ----------------------------- | -------------------------------------- |
| `activitylogs.event_add` | `ACTIVITYLOG_PERM_EVENT_ADD`  | Can add an event via the HTTP endpoint |
| `activitylog.event_view` | `ACTIVITYLOG_PERM_EVENT_VIEW` | Can list/view events                   |
| `activitylog.event_del`  | `ACTIVITYLOG_PERM_EVENT_DEL`  | Can delete events and clear the log    |

**Note:** The `activity_log_add` HTTP endpoint actually checks for `system.admin` permission rather than `activitylogs.event_add`. The `activitylogs.event_add` permission is defined but currently used for the event-based listener path.

---

## Events and Listeners

### Emitted Events

| Event Constant               | Event Name                   | Description                             |
| ---------------------------- | ---------------------------- | --------------------------------------- |
| `ACTIVITYLOG_CALL_EVENT_ADD` | `activitylog.call.event.add` | Request to add a new activity log entry |

### Registered Listeners

Initialized in `listeners_init()` during module startup. Two event listeners are registered:

#### `user.login`

Automatically logs user login events.

**Trigger:** Emitted by the user module when a user logs in.
**Payload received:** `{ id, domain, username, ... }`
**Record created:**

```json
{
	"id": "evt_...",
	"module": "user",
	"id_user": "<user.id>",
	"domain": "<user.domain>",
	"event": "user.login",
	"data": { "username": "<user.username>" }
}
```

#### `activitylog.call.event.add`

Generic listener for any module to log events via the event system. This is the recommended way for other modules to create activity log entries without importing this module directly.

**Payload schema (validated with Zod):**

| Field     | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| `domain`  | string | yes      | User's domain                   |
| `module`  | string | yes      | Source module name              |
| `event`   | string | yes      | Event description/identifier    |
| `data`    | any    | no       | Arbitrary event data            |
| `id_user` | string | yes      | User ID who triggered the event |

**Usage from other modules:**

```typescript
import { liwe_event_emit } from '@backend/liwe3/core';

await liwe_event_emit( app, 'activitylog.call.event.add', {
	domain: user.domain,
	module: 'mymodule',
	event: 'mymodule.action_performed',
	data: { someKey: 'someValue' },
	id_user: user.id,
} );
```

---

## API Endpoints

| Method   | Route                     | Handler              | Permission               | Description                         |
| -------- | ------------------------- | -------------------- | ------------------------ | ----------------------------------- |
| `GET`    | `/api/activity_log/list`  | `activity_log_list`  | `activitylog.event_view` | List events with pagination         |
| `POST`   | `/api/activity_log/add`   | `activity_log_add`   | `system.admin`           | Add a new event                     |
| `DELETE` | `/api/activity_log/del`   | `activity_log_del`   | `activitylog.event_del`  | Delete a single event               |
| `DELETE` | `/api/activity_log/clear` | `activity_log_clear` | `activitylog.event_del`  | Clear all or module-specific events |

---

## Methods Reference

### `activity_log_add`

Adds a new event to the activity log via the HTTP endpoint.

**Source:** `src/methods/activity_log-add.ts`
**Route:** `POST /api/activity_log/add`
**Permission:** `system.admin`

#### Parameters (JSON body)

| Param    | Type   | Required | Description                  |
| -------- | ------ | -------- | ---------------------------- |
| `event`  | string | yes      | Event description/identifier |
| `data`   | any    | no       | Arbitrary event data         |
| `module` | string | yes      | Source module name           |

The `id`, `id_user`, and `domain` fields are populated automatically from the authenticated user context.

#### Response

```json
{
	"ok": true,
	"data": {
		"id": "evt_abc123...",
		"id_user": "usr_xyz789...",
		"event": "custom.action",
		"data": { "key": "value" },
		"module": "mymodule",
		"domain": "test",
		"created": "...",
		"updated": "..."
	}
}
```

#### Errors

- `400 VALIDATION_ERROR` — Invalid input parameters
- `401 UNAUTHORIZED` — User not authenticated or lacks `system.admin` permission
- `501 DBERROR` — Could not create the record in the database

---

### `activity_log_list`

Returns a list of activity log events.

**Source:** `src/methods/activity_log-list.ts`
**Route:** `GET /api/activity_log/list`
**Permission:** `activitylog.event_view`

#### Parameters (query string)

| Param        | Type    | Required | Default | Description                                     |
| ------------ | ------- | -------- | ------- | ----------------------------------------------- |
| `offset`     | number  | no       | `0`     | Pagination row start                            |
| `limit`      | number  | no       | `50`    | Number of rows to return                        |
| `module`     | string  | no       | —       | Filter by module name                           |
| `date_start` | date    | no       | —       | Filter events from this date/time               |
| `date_end`   | date    | no       | —       | Filter events until this date/time              |
| `full`       | boolean | no       | `false` | If `true`, include event `data` in the response |
| `sort`       | string  | no       | —       | Sort order: `asc` or `desc`                     |

**Note:** The current implementation returns all records from the table without applying the pagination, filtering, or sorting parameters. The schema validates and accepts them for future implementation.

#### Response

```json
{
	"ok": true,
	"data": [
		{
			"id": "evt_abc123...",
			"id_user": "usr_xyz789...",
			"event": "user.login",
			"data": { "username": "john" },
			"module": "user",
			"domain": "test"
		}
	]
}
```

#### Errors

- `400 VALIDATION_ERROR` — Invalid query parameters
- `401 UNAUTHORIZED` — User not authenticated or lacks `activitylog.event_view` permission
- `501 DB_READ_ERROR` — Database read failure

---

### `activity_log_del`

Deletes a single event by its ID.

**Source:** `src/methods/activity_log-del.ts`
**Route:** `DELETE /api/activity_log/del`
**Permission:** `activitylog.event_del`

#### Parameters (JSON body)

| Param | Type   | Required | Description        |
| ----- | ------ | -------- | ------------------ |
| `id`  | string | yes      | Event ID to delete |

#### Response

```json
{
	"ok": true,
	"data": true
}
```

#### Errors

- `400 VALIDATION_ERROR` — Invalid input parameters
- `401 NO_PERMS` — User lacks `activitylog.event_del` permission

---

### `activity_log_clear`

Removes all rows from the activity log. Optionally filters by module to delete only events from a specific source.

**Source:** `src/methods/activity_log-clear.ts`
**Route:** `DELETE /api/activity_log/clear`
**Permission:** `activitylog.event_del`

#### Parameters (JSON body)

| Param    | Type   | Required | Description                                       |
| -------- | ------ | -------- | ------------------------------------------------- |
| `module` | string | no       | If specified, only delete events from this module |

When `module` is omitted, **all** activity log entries are deleted.

#### Response

```json
{
	"ok": true,
	"data": true
}
```

#### Errors

- `400 VALIDATION_ERROR` — Invalid input parameters
- `403 FORBIDDEN` — User lacks `activitylog.event_del` permission

---

## Types

### `ActivityLogEvent`

Defined in `src/types.ts` with Zod schema `ZActivityLogEvent`.

```typescript
{
  id: string;        // Event ID (max 64 chars)
  id_user?: string;  // User ID (max 64 chars, optional)
  event: string;     // Event description/identifier
  data?: any;        // Arbitrary event data (JSON)
  module: string;    // Source module name
  domain: string;    // User's domain
}
```

### `ActivityLogEventDB`

Inferred select type from the Drizzle schema. Extends `ActivityLogEvent` with database-managed fields:

```typescript
{
  ...ActivityLogEvent,
  created: Date;   // Record creation timestamp
  updated: Date;   // Record last update timestamp
}
```

### Listener Event Schema

Defined in `src/listeners.ts` as `ZActivityLogEventSchema`. Used to validate payloads received by the `activitylog.call.event.add` listener:

```typescript
{
  domain: string;    // User's domain
  module: string;    // Source module name
  event: string;     // Event description
  data?: any;        // Arbitrary event data
  id_user: string;   // User ID
}
```

---

## Error Codes

All errors follow the `LiWEResponse` format with `ok: false`.

| Code                       | HTTP Status | Description                                         |
| -------------------------- | ----------- | --------------------------------------------------- |
| `VALIDATION_ERROR`         | 400         | Invalid input parameters (Zod validation failure)   |
| `ERROR_INVALID_EVENT_DATA` | 400         | Invalid payload in the event listener               |
| `UNAUTHORIZED`             | 401         | User not authenticated or lacks required permission |
| `NO_PERMS`                 | 401         | User lacks the required permission (delete)         |
| `FORBIDDEN`                | 403         | Insufficient permissions (clear)                    |
| `DBERROR`                  | 501         | Could not create record in database                 |
| `DB_READ_ERROR`            | 501         | Database read failure                               |

---

## Dependencies

### Runtime

| Package               | Version     | Purpose                                                     |
| --------------------- | ----------- | ----------------------------------------------------------- |
| `@backend/liwe3/core` | workspace:* | Core framework (LiWEApp, permissions, events, mkid, logger) |
| `drizzle-orm`         | ^0.45.1     | Database ORM                                                |
| `zod`                 | ^4.3.6      | Schema validation                                           |

### Development

| Package       | Version | Purpose                  |
| ------------- | ------- | ------------------------ |
| `hono`        | ^4.12.0 | HTTP framework           |
| `vitest`      | ^4.0.18 | Test runner              |
| `@vitest/ui`  | ^4.0.18 | Visual test UI           |
| `typescript`  | ^5.9.3  | TypeScript compiler      |
| `@types/node` | ^25.3.0 | Node.js type definitions |

---

## File Structure

```
@backend/modules/activitylog/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── sql/
│   └── activitylog.sql           # Raw SQL schema
├── src/
│   ├── index.ts                  # Module init, route registration, permissions
│   ├── schema.ts                 # Drizzle ORM table definition, type inference
│   ├── types.ts                  # Zod schemas and TypeScript types
│   ├── perms.ts                  # Permission definitions and constants
│   ├── events.ts                 # Event name constants
│   ├── listeners.ts              # Event listeners (user.login, call.event.add)
│   ├── methods.ts                # Re-exports from methods/
│   └── methods/
│       ├── index.ts              # Re-export hub
│       ├── utils.ts              # Common imports
│       ├── activity_log-add.ts
│       ├── activity_log-list.ts
│       ├── activity_log-del.ts
│       └── activity_log-clear.ts
└── tests/
    └── restest/
        ├── all.json              # Full test suite
        ├── clear.json            # Clear operation tests
        └── general.tests.json    # General test definitions
```
