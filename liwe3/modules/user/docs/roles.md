# User Roles

## Overview

`user_role` lets an application define, per `domain`, named permission
presets ("roles") that can be assigned to users. A role is a reusable
bundle of permission strings; assigning a role to a user **unions**
(adds) the role's permissions into that user's own `perms` array.

Roles do **not** introduce a new authorization mechanism. `has_perms()`
(`liwe3/backend/core/src/permissions.ts`) is unchanged and continues to
read only `user.perms`. A role is purely a convenience for writing
permissions into `user.perms` in bulk; once assigned, the permissions
it granted behave exactly like any other permission on the user.

## Semantics

- **Additive only.** Assigning a role, or adding new permissions to an
  existing role, only ever adds permissions to a user's `perms` - it
  never removes any.
- **Propagation on role update.** If a role already has users assigned
  to it (via `id_role`) and new permissions are added to the role,
  those new permissions are unioned into every currently-assigned
  user's `perms`. Permissions _removed_ from a role are **not**
  retroactively removed from users who already have them.
- **Deleting a role** unlinks every user assigned to it (`id_role` set
  to `NULL`) but does **not** touch their `perms` - permissions already
  granted stay on the user.
- **Scoping.** Roles are scoped by `domain`. A role name must be unique
  within its domain (enforced by a unique index on `(domain, name)`).
  A `system`-domain user with the `system.admin` permission can list
  roles across all domains; everyone else only sees roles in their own
  domain.
- **Cross-domain assignment is rejected.** `user_role_assign` refuses
  to assign a role to a user whose `domain` differs from the role's
  `domain`.

## Data model

### `users` table (existing table, one new column)

| Column    | Type                    | Notes                                                                            |
| --------- | ----------------------- | -------------------------------------------------------------------------------- |
| `id_role` | `VARCHAR(64)`, nullable | The role currently assigned to this user, if any. Indexed (`idx_users_id_role`). |

### `user_roles` table (new)

| Column        | Type                                     | Notes                                   |
| ------------- | ---------------------------------------- | --------------------------------------- |
| `id`          | `VARCHAR(64)`, primary key               | Role id, generated with `mkid('urol')`. |
| `domain`      | `VARCHAR(64)`, not null                  | Domain this role belongs to.            |
| `name`        | `VARCHAR(64)`, not null                  | Role name, unique per domain.           |
| `description` | `VARCHAR(250)`, nullable                 | Human-readable description.             |
| `perms`       | `TEXT` (JSON array of strings), not null | Permissions granted by this role.       |

Indexes: unique `(domain, name)`, plus a non-unique index on `domain`.

### Zod types (`src/types.ts`, mirrored in the frontend package)

```typescript
const ZUserRole = z.object( {
	id: z.string().max( 64 ).optional(),
	domain: z.string().max( 64 ).optional(),
	name: z.string().max( 64 ),
	description: z.string().max( 250 ).optional(),
	perms: z.string().array().optional(),
} );
```

`ZUser` gained an optional `id_role: z.string().max( 64 ).optional()`
field.

## Permissions

| Permission         | Description                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `user.role.manage` | Required to create, update, list or delete roles (`user_role_add`, `user_role_del`, `user_role_list`).                               |
| `user.perms`       | Required to assign a role to a user (`user_role_assign`) - the same permission already required to change a user's `perms` directly. |

A caller with `system.admin` bypasses all permission checks (existing
`has_perms()` behavior, unrelated to roles specifically).

## Methods & endpoints

All methods live in `liwe3/modules/user/backend/src/methods/`. Routes
are registered in `module_init()` (`src/index.ts`) with `routeBody`
(POST/DELETE, JSON body) or `routeGet` (GET, query params).

### `user_role_add` - `POST /api/user/role/add`

Creates a new role, or updates an existing one if `id` is provided.

**Permission:** `user.role.manage`

**Params**

| Field         | Type             | Required | Notes                                              |
| ------------- | ---------------- | -------- | -------------------------------------------------- |
| `id`          | string           | no       | Present = update an existing role.                 |
| `name`        | string (max 64)  | yes      | Must be unique within the caller's domain.         |
| `description` | string (max 250) | no       |                                                    |
| `perms`       | string[]         | no       | Full replacement list of permissions for the role. |

**Behavior**

- Create (`id` absent): rejects if a role with the same `name` already
  exists in the domain (`400`).
- Update (`id` present): rejects if the role doesn't exist (`404`) or
  if another role in the domain already has the requested `name`
  (`400`). Any permission present in the new `perms` but not in the
  role's previous `perms` is unioned into every user currently
  assigned to the role (`id_role` match).

**Returns:** `LiWEResponse<UserRole>` - the saved role.

### `user_role_del` - `DELETE /api/user/role/del`

Deletes a role and unlinks any user assigned to it.

**Permission:** `user.role.manage`

**Params:** `{ id: string }`

**Behavior:** `404` if the role doesn't exist. On success, every user
with `id_role` equal to this role gets `id_role = NULL` (their `perms`
are left untouched), then the role row is deleted.

**Returns:** `LiWEResponse<boolean>`

### `user_role_list` - `GET /api/user/role/list`

Lists roles for the caller's domain.

**Permission:** `user.role.manage`

**Params (query string):** `offset?: number`, `limit?: number`

**Behavior:** Scoped to the caller's `domain`, except for a
`system`-domain caller with `system.admin`, who sees every domain's
roles.

**Returns:** `LiWEResponse<UserRole[]>`

### `user_role_assign` - `POST /api/user/role/assign`

Assigns a role to a user, unioning the role's `perms` into the user's
`perms` and setting `id_role`.

**Permission:** `user.perms`

**Params:** `{ id_user: string, id_role: string }`

**Behavior:** `404` if the user or the role doesn't exist. `400`
(`ROLE_DOMAIN_MISMATCH`) if the role's `domain` differs from the
target user's `domain`. On success, `id_role` is set and `perms`
becomes the union of the user's current `perms` and the role's
`perms` - existing permissions are never dropped.

**Returns:** `LiWEResponse<User>` (password and domain stripped from
the response).

## Example flow

```
POST /api/user/role/add        { name: "editor", perms: ["content.edit"] }
  -> { id: "urol_123", name: "editor", perms: ["content.edit"], ... }

POST /api/user/role/assign     { id_user: "user_1", id_role: "urol_123" }
  -> user_1.perms now includes "content.edit"; user_1.id_role = "urol_123"

POST /api/user/role/add        { id: "urol_123", name: "editor", perms: ["content.edit", "content.publish"] }
  -> user_1.perms automatically gains "content.publish" too (additive sync)

DELETE /api/user/role/del      { id: "urol_123" }
  -> user_1.id_role = null; user_1.perms keeps "content.edit" and "content.publish"
```

## Testing

- Unit tests: `liwe3/modules/user/backend/tests/user-role.test.ts`
  (methods, mocked DB), `user-role-schema.test.ts`,
  `user-role-types.test.ts`.
- Frontend type tests: `liwe3/modules/user/frontend/tests/types.test.ts`.
- End-to-end: `liwe3/modules/user/backend/tests/restest/user-role.tests.json`.
