# Comment Module

The **comment** module provides a polymorphic commenting system that can attach comments to any object in any module. It supports threaded follow-up replies, recursive deletion of comment trees, owner-based deletion permissions, and integration with the activity log.

**Package:** `@backend/modules/comment`
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
  - [comment_add](#comment_add)
  - [comments_list](#comments_list)
  - [comment_del](#comment_del)
- [Utility Functions](#utility-functions)
- [Types](#types)
- [Error Codes](#error-codes)
- [Dependencies](#dependencies)
- [File Structure](#file-structure)

---

## Architecture

The module uses a single `comment_comments` table with a polymorphic pattern (`module` + `id_obj`) to associate comments with any entity. Threaded replies are implemented via the `id_follow_up` self-referencing column.

During `module_init()`, the module:

1. Registers 3 HTTP routes on the Hono app.
2. Registers permissions with the global permissions system.

Comment IDs are generated using `mkid('comm')`, producing prefixed unique identifiers.

### Key design decisions

- **Polymorphic association:** Comments reference a `module` (entity type) and `id_obj` (entity ID), allowing any module to have comments without schema changes.
- **Threaded replies:** The `id_follow_up` column links a comment to its parent comment, enabling nested discussions.
- **Recursive deletion:** Deleting a comment automatically deletes all follow-up comments in the tree via `drizzleGetRecursiveRelatedIds()`.
- **Owner-based access:** Users can delete their own comments; only users with `comment.del` permission can delete others' comments.

---

## Database Schema

### `comment_comments` table

| Column         | Type      | Constraints               | Description                                        |
| -------------- | --------- | ------------------------- | -------------------------------------------------- |
| `id`           | TEXT(64)  | PK, NOT NULL              | Comment ID (prefixed `comm`, generated via `mkid`) |
| `id_user`      | TEXT(64)  | NOT NULL                  | User ID who wrote the comment                      |
| `module`       | TEXT(64)  | NOT NULL                  | Module being commented (e.g. `post`, `product`)    |
| `id_obj`       | TEXT(64)  | NOT NULL                  | Object ID being commented                          |
| `comment`      | TEXT      | NOT NULL                  | Comment text content                               |
| `id_follow_up` | TEXT(64)  | —                         | Parent comment ID (self-reference for threading)   |
| `domain`       | TEXT(128) | NOT NULL                  | Domain code                                        |
| `created`      | INTEGER   | DEFAULT CURRENT_TIMESTAMP | Creation timestamp                                 |
| `updated`      | INTEGER   | DEFAULT CURRENT_TIMESTAMP | Last update timestamp                              |

### Threading model

```
Comment A  (id_follow_up = null)      ← top-level comment
├── Comment B  (id_follow_up = A.id)  ← reply to A
│   └── Comment D  (id_follow_up = B.id)  ← reply to B
└── Comment C  (id_follow_up = A.id)  ← another reply to A
```

Deleting Comment A recursively deletes B, C, and D.

---

## Permissions

Registered under the `comment` module namespace during `module_init()`.

| Permission    | Constant           | Description                                           |
| ------------- | ------------------ | ----------------------------------------------------- |
| `comment.del` | `COMMENT_PERM_DEL` | User can delete **all** comments (not just their own) |

**Note:** There are no explicit permissions for adding or listing comments. Adding requires authentication; listing is public to authenticated users.

### Deletion rules

1. **Authenticated user (no `comment.del` perm):** Can only delete their own comments.
2. **User with `comment.del` perm:** Can delete any comment.
3. **Not authenticated:** Cannot delete any comment.

---

## Events and Listeners

### Emitted Events

| Event Constant      | Event Name    | Emitted when         | Payload                                   |
| ------------------- | ------------- | -------------------- | ----------------------------------------- |
| `COMMENT_EVENT_ADD` | `comment.add` | A comment is created | `{ id, domain, module, id_obj, id_user }` |
| `COMMENT_EVENT_DEL` | `comment.del` | A comment is deleted | `{ id }`                                  |

### Activity Log Integration

When a comment is added, the module also logs the action to the activity log via `liwe_event_call()`:

```typescript
await liwe_event_call( app, 'activitylog', 'event.add', {
	domain: user.domain,
	event: 'comment.add',
	module: module,
	id_user: user.id,
	data: { id_obj, username: user.username },
} );
```

### Registered Listeners

#### `user.del`

Listens for user deletion events. Currently a placeholder (logs the event but takes no action).

---

## API Endpoints

| Method   | Route                | Handler         | Auth          | Description                         |
| -------- | -------------------- | --------------- | ------------- | ----------------------------------- |
| `GET`    | `/api/comments/list` | `comments_list` | —             | List comments for an object         |
| `POST`   | `/api/comment/add`   | `comment_add`   | authenticated | Add a new comment                   |
| `DELETE` | `/api/comment/del`   | `comment_del`   | authenticated | Delete a comment and its follow-ups |

---

## Methods Reference

### `comment_add`

Adds a new comment to the system.

**Source:** `src/methods/comment-add.ts`
**Route:** `POST /api/comment/add`
**Auth:** Requires authenticated user

#### Parameters (JSON body)

| Param          | Type   | Required | Description                                     |
| -------------- | ------ | -------- | ----------------------------------------------- |
| `module`       | string | yes      | Module being commented (e.g. `post`, `product`) |
| `id_obj`       | string | yes      | Object ID being commented                       |
| `comment`      | string | yes      | Comment text content                            |
| `id_follow_up` | string | no       | Parent comment ID for threaded replies          |

The `id`, `id_user`, and `domain` fields are populated automatically from the authenticated user context.

#### Side effects

1. Inserts the comment into `comment_comments`.
2. Emits `comment.add` event with `{ id, domain, module, id_obj, id_user }`.
3. Logs the action to the activity log via `liwe_event_call`.

#### Response

```json
{
	"ok": true,
	"data": {
		"id": "comm_abc123...",
		"created": "2026-02-24T12:00:00.000Z",
		"comment": "Great article!",
		"user": {
			"id": "usr_xyz789...",
			"username": "john"
		}
	}
}
```

#### Errors

- `400 VALIDATION_ERROR` — Invalid input parameters
- `401 UNAUTHORIZED` — User not authenticated
- `500 RETRIEVAL_ERROR` — Failed to retrieve the inserted comment from database

---

### `comments_list`

Lists all comments for a specific object within a module.

**Source:** `src/methods/comments-list.ts`
**Route:** `GET /api/comments/list`
**Auth:** None required

#### Parameters (query string)

| Param    | Type    | Required | Default | Description                                              |
| -------- | ------- | -------- | ------- | -------------------------------------------------------- |
| `module` | string  | yes      | —       | Module name                                              |
| `id_obj` | string  | yes      | —       | Object ID                                                |
| `sort`   | string  | no       | `asc`   | Sort order: `asc` or `desc` by creation date             |
| `full`   | boolean | no       | `false` | If `true`, include full user info (id, username, avatar) |

**Note:** The current implementation returns comments with minimal user info (`{ id: id_user }`) regardless of the `full` parameter. The `full` option is accepted by the schema for future implementation.

#### Response

```json
{
	"ok": true,
	"data": [
		{
			"id": "comm_abc123...",
			"created": "2026-02-24T12:00:00.000Z",
			"comment": "Great article!",
			"user": { "id": "usr_xyz789..." },
			"id_follow_up": null
		},
		{
			"id": "comm_def456...",
			"created": "2026-02-24T12:05:00.000Z",
			"comment": "I agree!",
			"user": { "id": "usr_abc123..." },
			"id_follow_up": "comm_abc123..."
		}
	]
}
```

Comments are ordered by `created` timestamp. Follow-up comments include the `id_follow_up` pointing to their parent.

---

### `comment_del`

Deletes a comment and all its follow-up replies recursively.

**Source:** `src/methods/comment-del.ts`
**Route:** `DELETE /api/comment/del`
**Auth:** Authenticated user (own comments) or `comment.del` permission (any comment)

#### Parameters (JSON body)

| Param | Type   | Required | Description          |
| ----- | ------ | -------- | -------------------- |
| `id`  | string | yes      | Comment ID to delete |

#### Deletion logic

1. Looks up the comment by `id` and verifies it belongs to the user's domain.
2. If the comment doesn't exist, returns success (idempotent).
3. Checks permissions: the user must either own the comment or have `comment.del` permission.
4. Calls `comments_delete_all()` which recursively finds and deletes all follow-up comments in the tree.
5. Emits `comment.del` event.

#### Response

```json
{
	"ok": true,
	"data": true
}
```

#### Errors

- `400 VALIDATION_ERROR` — Invalid input parameters
- `401 AUTHENTICATION_ERROR` — User not authenticated
- `403 PERMISSION_DENIED` — User doesn't own the comment and lacks `comment.del` permission

---

## Utility Functions

Exported from `src/methods/utils.ts` for use by other modules.

### `comments_get_all_by_user`

Returns all comments by a specific user, optionally filtered by module.

```typescript
const result = await comments_get_all_by_user( app, {
	id_user: 'usr_xyz789...',
	module: 'post', // optional
} );
```

**Parameters:**

| Param     | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| `id_user` | string | yes      | User ID               |
| `module`  | string | no       | Filter by module name |

**Returns:** `LiWEResponse<Comment[]>`

### `comments_delete_all`

Recursively deletes a set of comments and all their follow-up children.

```typescript
await comments_delete_all( app, [ 'comm_abc123', 'comm_def456' ] );
```

Uses `drizzleGetRecursiveRelatedIds()` to walk the `id` → `id_follow_up` tree and collect all descendant IDs before performing a batch delete.

**Parameters:**

| Param         | Type     | Description                |
| ------------- | -------- | -------------------------- |
| `id_comments` | string[] | Root comment IDs to delete |

**Returns:** `LiWEResponse<boolean>`

---

## Types

### `Comment`

Database record type. Defined in `src/types.ts` via `ZComment`.

```typescript
{
  id: string;            // Comment ID (max 64 chars)
  id_user: string;       // User ID (max 64 chars)
  module: string;        // Module name (max 64 chars)
  id_obj: string;        // Object ID (max 64 chars)
  comment: string;       // Comment text
  id_follow_up?: string; // Parent comment ID (max 64 chars)
  domain: string;        // Domain code (max 128 chars)
}
```

### `CommentItem`

API response type — a comment with user info. Defined via `ZCommentItem`.

```typescript
{
  id: string;            // Comment ID
  created: Date;         // Creation timestamp
  user: CommentMiniUser; // User who wrote the comment
  comment: string;       // Comment text
  id_follow_up?: string; // Parent comment ID
}
```

### `CommentMiniUser`

Minimal user representation embedded in comments. Defined via `ZCommentMiniUser`.

```typescript
{
  id: string;       // User ID
  username: string;  // Username
  avatar?: string;   // Avatar URL (optional)
}
```

### `CommentDB`

Drizzle inferred select type from the schema. Extends `Comment` with database-managed fields:

```typescript
{
  ...Comment,
  created: Date;   // Creation timestamp
  updated: Date;   // Last update timestamp
}
```

---

## Error Codes

All errors follow the `LiWEResponse` format with `ok: false`.

| Code                   | HTTP Status | Description                                          |
| ---------------------- | ----------- | ---------------------------------------------------- |
| `VALIDATION_ERROR`     | 400         | Invalid input parameters (Zod validation failure)    |
| `UNAUTHORIZED`         | 401         | User not authenticated (add)                         |
| `AUTHENTICATION_ERROR` | 401         | User not authenticated (delete)                      |
| `PERMISSION_DENIED`    | 403         | User doesn't own the comment and lacks `comment.del` |
| `RETRIEVAL_ERROR`      | 500         | Failed to retrieve comment after insert              |

---

## Dependencies

### Runtime

| Package               | Version     | Purpose                                                                            |
| --------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `@backend/liwe3/core` | workspace:* | Core framework (LiWEApp, permissions, events, mkid, drizzleGetRecursiveRelatedIds) |
| `drizzle-orm`         | ^0.45.1     | Database ORM                                                                       |
| `zod`                 | ^4.3.6      | Schema validation                                                                  |

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
@backend/modules/comment/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── sql/
│   └── comment.sql               # Raw SQL schema
├── src/
│   ├── index.ts                   # Module init, route registration, permissions
│   ├── schema.ts                  # Drizzle ORM table definition, type inference
│   ├── types.ts                   # Zod schemas (Comment, CommentItem, CommentMiniUser)
│   ├── perms.ts                   # Permission definitions and constants
│   ├── events.ts                  # Event name constants (add, del)
│   ├── listeners.ts               # Event listeners (user.del placeholder)
│   ├── methods.ts                 # Re-exports from methods/
│   └── methods/
│       ├── index.ts               # Re-export hub
│       ├── utils.ts               # Shared utilities (comments_get_all_by_user, comments_delete_all)
│       ├── comment-add.ts
│       ├── comments-list.ts
│       └── comment-del.ts
└── test/
    └── restest/
        ├── all.json                       # Full test suite
        ├── simple-comments.tests.json     # Basic comment operations
        └── follow-up.tests.json           # Threaded reply tests
```
