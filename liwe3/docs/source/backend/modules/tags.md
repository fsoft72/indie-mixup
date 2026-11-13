# Tags Module

The **tags** module provides a polymorphic tagging system that can attach tags to any entity across any module. It supports weighted relevance scoring, affinity-based discovery, bulk operations, and tag merging.

**Package:** `@backend/modules/tags`
**Version:** 1.0.0
**Database:** SQLite (via Drizzle ORM)
**Validation:** Zod
**HTTP Framework:** Hono

---

## Table of Contents

- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Permissions](#permissions)
- [API Endpoints](#api-endpoints)
- [Methods Reference](#methods-reference)
  - [tag_add](#tag_add)
  - [tag_object](#tag_object)
  - [tag_remove_object](#tag_remove_object)
  - [tag_update_relevance](#tag_update_relevance)
  - [tag_list](#tag_list)
  - [tag_list_by_object](#tag_list_by_object)
  - [tag_list_by_module](#tag_list_by_module)
  - [tag_search](#tag_search)
  - [tag_find_by_tags](#tag_find_by_tags)
  - [tag_find_by_affinity](#tag_find_by_affinity)
  - [tag_bulk_add](#tag_bulk_add)
  - [tag_bulk_remove](#tag_bulk_remove)
  - [tag_merge](#tag_merge)
  - [tag_stats](#tag_stats)
- [Affinity Scoring](#affinity-scoring)
- [Error Codes](#error-codes)
- [Dependencies](#dependencies)
- [File Structure](#file-structure)

---

## Architecture

The module follows a standard LiWE3 module layout:

1. **`src/index.ts`** — Module entry point. Registers 14 HTTP routes on the Hono app and registers permissions with the global permissions system via `permissions_register()`.
2. **`src/schema.ts`** — Drizzle ORM table definitions, relations, and inferred TypeScript types (`Tag`, `NewTag`, `Taggable`, `NewTaggable`).
3. **`src/perms.ts`** — Permission constants registered at module init.
4. **`src/methods/`** — One file per method. Each method validates input with Zod, runs database queries via Drizzle, and returns a `LiWEResponse`.
5. **`sql/tags.sql`** — Raw SQL schema for reference (tables, indexes, triggers, views).

All methods follow the same pattern:

```
validate params → query database → return responseSuccess / responseError
```

---

## Database Schema

### `tags` table

Stores tag definitions.

| Column        | Type      | Constraints         | Description                                                    |
| ------------- | --------- | ------------------- | -------------------------------------------------------------- |
| `id`          | INTEGER   | PK, autoincrement   | Unique tag ID                                                  |
| `name`        | TEXT(100) | NOT NULL, UNIQUE    | Human-readable tag name                                        |
| `slug`        | TEXT(100) | NOT NULL, UNIQUE    | URL-friendly identifier                                        |
| `description` | TEXT      | —                   | Optional description                                           |
| `color`       | TEXT(7)   | —                   | Hex color code (`#RRGGBB`)                                     |
| `category`    | TEXT(50)  | —                   | Grouping category (e.g. `skill`, `interest`, `topic`, `genre`) |
| `weight`      | REAL      | DEFAULT 1.0         | Weight for affinity calculations (0–10)                        |
| `is_active`   | INTEGER   | NOT NULL, DEFAULT 1 | Boolean active flag                                            |
| `created`     | INTEGER   | DEFAULT unixepoch() | Unix timestamp                                                 |
| `updated`     | INTEGER   | DEFAULT unixepoch() | Unix timestamp                                                 |
| `updated_by`  | TEXT(64)  | —                   | User ID of last updater                                        |

**Indexes:** `name` (unique), `slug` (unique), `category`, `is_active`, `weight`, `updated`, `updated_by`

### `taggables` table (junction)

Links tags to arbitrary objects via a polymorphic `module` + `id_object` pattern.

| Column            | Type     | Constraints                               | Description                                       |
| ----------------- | -------- | ----------------------------------------- | ------------------------------------------------- |
| `id`              | INTEGER  | PK, autoincrement                         | Assignment ID                                     |
| `tag_id`          | INTEGER  | NOT NULL, FK → tags(id) ON DELETE CASCADE | Referenced tag                                    |
| `module`          | TEXT(50) | NOT NULL                                  | Entity type (e.g. `user`, `post`, `product`)      |
| `id_object`       | TEXT(64) | NOT NULL                                  | ID of the tagged entity                           |
| `relevance_score` | REAL     | DEFAULT 1.0                               | How relevant this tag is to this entity (0.0–1.0) |
| `created`         | INTEGER  | DEFAULT unixepoch()                       | Unix timestamp                                    |
| `updated`         | INTEGER  | DEFAULT unixepoch()                       | Unix timestamp                                    |
| `updated_by`      | TEXT(64) | —                                         | User ID who applied/updated the tag               |
| `auto_tagged`     | INTEGER  | DEFAULT 0                                 | Boolean: 1 = auto-generated, 0 = manual           |

**Unique constraint:** `(module, id_object, tag_id)` — prevents duplicate tag assignments on the same entity.

**Indexes:** `tag_id`, `(module, id_object)`, `module`, `relevance_score`, `updated_by`, `auto_tagged`, `created`, `updated`, `(tag_id, relevance_score)`, `(module, id_object, relevance_score)`, `(module, relevance_score)`

### Relations (Drizzle ORM)

- `tags` → `taggables` : one-to-many
- `taggables` → `tags` : many-to-one (via `tag_id`)

### Triggers

- **`tags_updated_trigger`** — Automatically sets `updated = unixepoch()` on any `tags` UPDATE.
- **`taggables_updated_trigger`** — Automatically sets `updated = unixepoch()` on any `taggables` UPDATE.

### Database Views

| View                     | Description                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `tag_usage_stats_view`   | Per-tag usage counts, average relevance, auto/manual counts, last used date        |
| `tag_module_stats_view`  | Per-module statistics: unique objects, total tags, avg relevance, unique tags used |
| `tag_object_counts_view` | Per-object tag counts with comma-separated tag names/slugs                         |

---

## Permissions

Registered under the `tags` module namespace during `module_init()`.

| Permission    | Description                                          |
| ------------- | ---------------------------------------------------- |
| `tags.create` | Create new tags and add tags to objects              |
| `tags.read`   | View and search tags and tagged objects              |
| `tags.update` | Update tag relevance and merge tags                  |
| `tags.delete` | Remove tags from objects and delete tags             |
| `tags.admin`  | Full administrative access including bulk operations |

---

## API Endpoints

| Method   | Route                        | Handler                | Description                            |
| -------- | ---------------------------- | ---------------------- | -------------------------------------- |
| `GET`    | `/api/tags/list`             | `tag_list`             | List tags with pagination              |
| `POST`   | `/api/tags/tag/add`          | `tag_add`              | Create a new tag                       |
| `POST`   | `/api/tags/obj/add`          | `tag_object`           | Assign a tag to an object              |
| `DELETE` | `/api/tags/obj/del`          | `tag_remove_object`    | Remove a tag from an object            |
| `GET`    | `/api/tags/obj/list`         | `tag_list_by_object`   | Get all tags for an object             |
| `POST`   | `/api/tags/find/by/tags`     | `tag_find_by_tags`     | Find objects by their tags             |
| `POST`   | `/api/tags/find/by/affinity` | `tag_find_by_affinity` | Find similar objects via shared tags   |
| `POST`   | `/api/tags/search`           | `tag_search`           | Search tags by text                    |
| `PATCH`  | `/api/tags/relevance/update` | `tag_update_relevance` | Update a tag assignment's relevance    |
| `POST`   | `/api/tags/stats`            | `tag_stats`            | Get tag usage statistics               |
| `POST`   | `/api/tags/bulk/add`         | `tag_bulk_add`         | Add multiple tags to an object         |
| `DELETE` | `/api/tags/bulk/del`         | `tag_bulk_remove`      | Remove multiple tags from an object    |
| `POST`   | `/api/tags/list/by/module`   | `tag_list_by_module`   | List objects in a module with tag info |
| `PATCH`  | `/api/tags/merge`            | `tag_merge`            | Merge two tags into one                |

---

## Methods Reference

### `tag_add`

Creates a new tag in the system.

**Source:** `src/methods/tag-add.ts`
**Route:** `POST /api/tags/tag/add`

#### Parameters

| Param         | Type   | Required | Default                    | Description                             |
| ------------- | ------ | -------- | -------------------------- | --------------------------------------- |
| `name`        | string | yes      | —                          | Tag name (min 1 char)                   |
| `slug`        | string | no       | auto-generated from `name` | URL-friendly slug                       |
| `description` | string | no       | —                          | Tag description                         |
| `color`       | string | no       | —                          | Hex color code (`#RRGGBB`)              |
| `category`    | string | no       | —                          | Grouping category                       |
| `weight`      | number | no       | `1.0`                      | Weight for affinity calculations (0–10) |
| `updated_by`  | string | no       | —                          | User ID of creator                      |

If `slug` is omitted, it is auto-generated from `name` using the `slugify()` utility (lowercase, dashes, alphanumeric only).

#### Response

```json
{
	"ok": true,
	"status": 200,
	"data": {
		"tag": {
			"id": 1,
			"name": "JavaScript",
			"slug": "javascript",
			"description": "Programming language tag",
			"color": "#F7DF1E",
			"category": "programming",
			"weight": 5.0,
			"is_active": true,
			"created": "2026-02-24T...",
			"updated": "2026-02-24T...",
			"updated_by": null
		}
	}
}
```

#### Errors

- `400 VALIDATION_ERROR` — Invalid input parameters
- `400 DUPLICATE_TAG` — Tag name or slug already exists

---

### `tag_object`

Assigns a tag to an object.

**Source:** `src/methods/tag-object.ts`
**Route:** `POST /api/tags/obj/add`

#### Parameters

| Param         | Type    | Required | Default | Description                 |
| ------------- | ------- | -------- | ------- | --------------------------- |
| `tag_slug`    | string  | yes      | —       | Tag slug to assign          |
| `id_object`   | string  | yes      | —       | Object identifier           |
| `module`      | string  | yes      | —       | Module that owns the object |
| `relevance`   | number  | no       | `1.0`   | Relevance score (0–1)       |
| `updated_by`  | string  | no       | —       | User ID                     |
| `auto_tagged` | boolean | no       | `false` | Whether auto-assigned       |

#### Response

```json
{
	"ok": true,
	"data": {
		"taggable": {
			"id": 1,
			"tag_id": 5,
			"module": "projects",
			"id_object": "project123",
			"relevance_score": 0.9,
			"created": "...",
			"updated": "...",
			"updated_by": "user456",
			"auto_tagged": false
		}
	}
}
```

#### Errors

- `404 TAG_NOT_FOUND` — No tag with the given slug
- `400 DUPLICATE_TAG_ASSIGNMENT` — Object already has this tag

---

### `tag_remove_object`

Removes a tag assignment from an object. The tag itself remains in the system.

**Source:** `src/methods/tag-remove-object.ts`
**Route:** `DELETE /api/tags/obj/del`

#### Parameters

| Param       | Type   | Required | Description                 |
| ----------- | ------ | -------- | --------------------------- |
| `tag_slug`  | string | yes      | Tag slug to remove          |
| `id_object` | string | yes      | Object identifier           |
| `module`    | string | yes      | Module that owns the object |

#### Response

```json
{
	"ok": true,
	"data": {
		"removed": true,
		"message": "Tag removed successfully"
	}
}
```

If the tag was not assigned: `{ "removed": false, "message": "Tag was not assigned to this object" }`.

#### Errors

- `404 TAG_NOT_FOUND` — No tag with the given slug

---

### `tag_update_relevance`

Updates the relevance score of an existing tag-object assignment.

**Source:** `src/methods/tag-update-relevance.ts`
**Route:** `PATCH /api/tags/relevance/update`

#### Parameters

| Param        | Type   | Required | Default | Description               |
| ------------ | ------ | -------- | ------- | ------------------------- |
| `tag_slug`   | string | yes      | —       | Tag slug                  |
| `id_object`  | string | yes      | —       | Object identifier         |
| `module`     | string | yes      | —       | Module name               |
| `relevance`  | number | yes      | —       | New relevance score (0–1) |
| `updated_by` | string | no       | —       | User ID                   |

#### Errors

- `404 TAG_NOT_FOUND` — No tag with the given slug
- `404 TAG_ASSIGNMENT_NOT_FOUND` — Tag is not assigned to this object

---

### `tag_list`

Lists tags with pagination, filtering, and sorting.

**Source:** `src/methods/tag-list.ts`
**Route:** `GET /api/tags/list`

Parameters are passed as **query string** parameters.

#### Parameters

| Param             | Type    | Required | Default | Description                                        |
| ----------------- | ------- | -------- | ------- | -------------------------------------------------- |
| `limit`           | number  | no       | `20`    | Max results (1–100)                                |
| `offset`          | number  | no       | `0`     | Pagination offset                                  |
| `category`        | string  | no       | —       | Filter by category                                 |
| `active_only`     | boolean | no       | `true`  | Only return active tags                            |
| `order_by`        | enum    | no       | `name`  | Sort field: `name`, `created`, `updated`, `weight` |
| `order_direction` | enum    | no       | `asc`   | Sort direction: `asc`, `desc`                      |

#### Response

```json
{
  "ok": true,
  "data": {
    "tags": [ ... ],
    "total": 42
  }
}
```

The `total` field contains the unfiltered count (respecting `category` and `active_only` but not `limit`/`offset`), useful for pagination controls.

---

### `tag_list_by_object`

Retrieves all tags assigned to a specific object, including assignment metadata.

**Source:** `src/methods/tag-list-by-object.ts`
**Route:** `GET /api/tags/obj/list`

#### Parameters

| Param         | Type    | Required | Default | Description             |
| ------------- | ------- | -------- | ------- | ----------------------- |
| `id_object`   | string  | yes      | —       | Object identifier       |
| `module`      | string  | yes      | —       | Module name             |
| `active_only` | boolean | no       | `true`  | Only return active tags |

#### Response

Returns tags joined with assignment metadata, ordered by `relevance_score` descending:

```json
{
	"ok": true,
	"data": {
		"tags": [
			{
				"tagId": 5,
				"tagName": "JavaScript",
				"tagSlug": "javascript",
				"category": "programming",
				"color": "#F7DF1E",
				"weight": 5.0,
				"relevanceScore": 0.95,
				"created": "...",
				"updated": "...",
				"updated_by": "user456",
				"auto_tagged": false
			}
		]
	}
}
```

---

### `tag_list_by_module`

Lists objects within a module along with their aggregated tag information.

**Source:** `src/methods/tag-list-by-module.ts`
**Route:** `POST /api/tags/list/by/module`

#### Parameters

| Param           | Type     | Required | Default | Description                         |
| --------------- | -------- | -------- | ------- | ----------------------------------- |
| `module`        | string   | yes      | —       | Module to search within             |
| `tag_slugs`     | string[] | no       | —       | Filter to objects having these tags |
| `min_tag_count` | number   | no       | `0`     | Minimum number of tags per object   |
| `max_tag_count` | number   | no       | —       | Maximum number of tags per object   |
| `limit`         | number   | no       | `100`   | Max results (1–1000)                |
| `offset`        | number   | no       | `0`     | Pagination offset                   |

#### Response

```json
{
	"ok": true,
	"data": {
		"objects": [
			{
				"id_object": "project123",
				"tagCount": 5,
				"avgRelevance": "0.85",
				"tagList": "JavaScript,React,TypeScript",
				"tagSlugs": "javascript,react,typescript"
			}
		]
	}
}
```

Results are ordered by tag count descending. The `HAVING` clause is applied for `min_tag_count` / `max_tag_count` filtering.

---

### `tag_search`

Full-text search across tag names, slugs, and descriptions using SQL `LIKE`.

**Source:** `src/methods/tag-search.ts`
**Route:** `POST /api/tags/search`

#### Parameters

| Param         | Type    | Required | Default | Description                                            |
| ------------- | ------- | -------- | ------- | ------------------------------------------------------ |
| `query`       | string  | no       | —       | Search query (matched against name, slug, description) |
| `category`    | string  | no       | —       | Filter by category                                     |
| `active_only` | boolean | no       | `true`  | Only return active tags                                |
| `limit`       | number  | no       | `20`    | Max results (1–100)                                    |
| `offset`      | number  | no       | `0`     | Pagination offset                                      |

The `query` is wrapped in `%query%` wildcards and applied to `name`, `slug`, and `description` with `OR` logic. Results are ordered alphabetically by name.

---

### `tag_find_by_tags`

Finds objects within a target module that have specific tags. Supports "any" or "all" match modes and calculates affinity scores.

**Source:** `src/methods/tag-find-by-tags.ts`
**Route:** `POST /api/tags/find/by/tags`

#### Parameters

| Param                | Type     | Required | Default | Description                                 |
| -------------------- | -------- | -------- | ------- | ------------------------------------------- |
| `tag_slugs`          | string[] | yes      | —       | Tag slugs to search for (min 1)             |
| `target_module`      | string   | yes      | —       | Module to search within                     |
| `match_type`         | enum     | no       | `any`   | `any` = at least one tag; `all` = every tag |
| `min_affinity_score` | number   | no       | `0.1`   | Minimum affinity score threshold            |
| `limit`              | number   | no       | `20`    | Max results (1–100)                         |
| `exclude_objects`    | string[] | no       | `[]`    | Object IDs to exclude                       |
| `active_tags_only`   | boolean  | no       | `true`  | Only consider active tags                   |

#### Affinity calculation

```
affinity_score = SUM(relevance_score * tag_weight)
```

When `match_type = "all"`, the HAVING clause also requires `COUNT(DISTINCT tag_id) = number_of_requested_tags`.

#### Response

```json
{
	"ok": true,
	"data": {
		"objects": [
			{
				"module": "projects",
				"id_object": "project123",
				"affinityScore": 4.75,
				"matchingTags": 3,
				"tagDetails": "JavaScript:0.9,React:0.85,TypeScript:0.8"
			}
		]
	}
}
```

Results are ordered by `affinity_score` descending.

#### Errors

- `404 NO_VALID_TAGS` — None of the provided slugs match existing tags

---

### `tag_find_by_affinity`

Finds objects in a target module that share tags with a source object. Useful for "related items" and recommendation features.

**Source:** `src/methods/tag-find-by-affinity.ts`
**Route:** `POST /api/tags/find/by/affinity`

#### Parameters

| Param                | Type     | Required | Default | Description                          |
| -------------------- | -------- | -------- | ------- | ------------------------------------ |
| `source_id_object`   | string   | yes      | —       | Source object ID                     |
| `source_module`      | string   | yes      | —       | Module of the source object          |
| `target_module`      | string   | yes      | —       | Module to search for similar objects |
| `min_affinity_score` | number   | no       | `0.3`   | Minimum affinity threshold           |
| `limit`              | number   | no       | `10`    | Max results (1–100)                  |
| `exclude_objects`    | string[] | no       | `[]`    | Object IDs to exclude                |

#### Affinity calculation

Uses a three-way join (`source_tags ↔ tags ↔ target_tags`) and calculates:

```
affinity_score = SUM(source_relevance * target_relevance * tag_weight)
```

The source object is automatically excluded from results. Results are ordered by `affinity_score` descending.

#### Response

```json
{
	"ok": true,
	"data": {
		"objects": [
			{
				"module": "articles",
				"id_object": "article789",
				"affinityScore": 3.2,
				"matchingTags": 2,
				"tagDetails": "JavaScript:0.9,React:0.7"
			}
		]
	}
}
```

---

### `tag_bulk_add`

Assigns multiple tags to an object in a single operation.

**Source:** `src/methods/tag-bulk-add.ts`
**Route:** `POST /api/tags/bulk/add`

#### Parameters

| Param                | Type     | Required | Default | Description                                   |
| -------------------- | -------- | -------- | ------- | --------------------------------------------- |
| `tag_slugs`          | string[] | yes      | —       | Tag slugs to add (min 1)                      |
| `id_object`          | string   | yes      | —       | Object identifier                             |
| `module`             | string   | yes      | —       | Module name                                   |
| `relevance`          | number   | no       | `1.0`   | Relevance score applied to all (0–1)          |
| `updated_by`         | string   | no       | —       | User ID                                       |
| `auto_tagged`        | boolean  | no       | `false` | Whether auto-assigned                         |
| `overwrite_existing` | boolean  | no       | `false` | Remove all existing tags on this object first |

When `overwrite_existing = true`, all existing tag assignments for the object are deleted before adding the new ones.

Each tag is inserted individually. If a tag assignment already exists (unique constraint violation), it is recorded as an error rather than aborting the entire operation.

#### Response

```json
{
  "ok": true,
  "data": {
    "tagged": [
      { "tag_slug": "javascript", "result": { "id": 1, ... } },
      { "tag_slug": "react", "result": { "id": 2, ... } }
    ],
    "errors": [
      { "tag_slug": "duplicate-tag", "error": "Already tagged" }
    ],
    "summary": "2 tags added, 1 errors"
  }
}
```

#### Errors

- `404 TAGS_NOT_FOUND` — One or more tag slugs don't exist (all must exist; partial matches are rejected)

---

### `tag_bulk_remove`

Removes multiple tag assignments from an object in a single operation.

**Source:** `src/methods/tag-bulk-remove.ts`
**Route:** `DELETE /api/tags/bulk/del`

#### Parameters

| Param       | Type     | Required | Description                 |
| ----------- | -------- | -------- | --------------------------- |
| `tag_slugs` | string[] | yes      | Tag slugs to remove (min 1) |
| `id_object` | string   | yes      | Object identifier           |
| `module`    | string   | yes      | Module name                 |

#### Response

```json
{
	"ok": true,
	"data": {
		"removed_count": 3,
		"message": "Removed 3 tags from projects:project123"
	}
}
```

#### Errors

- `404 NO_VALID_TAGS` — None of the provided slugs match existing tags

---

### `tag_merge`

Merges a source tag into a target tag. All assignments from the source are moved to the target, duplicates are removed, and the source tag is deactivated.

**Source:** `src/methods/tag-merge.ts`
**Route:** `PATCH /api/tags/merge`

#### Parameters

| Param             | Type   | Required | Description                              |
| ----------------- | ------ | -------- | ---------------------------------------- |
| `source_tag_slug` | string | yes      | Tag to merge from (will be deactivated)  |
| `target_tag_slug` | string | yes      | Tag to merge into (receives assignments) |
| `updated_by`      | string | no       | User ID performing the merge             |

#### Merge process

1. Look up both source and target tags by slug.
2. Fetch all `taggables` assignments for the source tag.
3. For each assignment, attempt to update `tag_id` to the target tag.
4. If a unique constraint violation occurs (object already has the target tag), delete the source assignment instead.
5. Deactivate the source tag (`is_active = false`).

#### Response

```json
{
	"ok": true,
	"data": {
		"merged_count": 15,
		"skipped_count": 3,
		"message": "Merged 15 assignments, skipped 3 duplicates. Source tag deactivated."
	}
}
```

#### Errors

- `400 INVALID_MERGE_REQUEST` — Source and target slugs are the same
- `404 SOURCE_TAG_NOT_FOUND` — Source tag slug doesn't exist
- `404 TARGET_TAG_NOT_FOUND` — Target tag slug doesn't exist

---

### `tag_stats`

Retrieves comprehensive tag usage statistics with optional filtering.

**Source:** `src/methods/tag-stats.ts`
**Route:** `POST /api/tags/stats`

#### Parameters

| Param              | Type    | Required | Default | Description                              |
| ------------------ | ------- | -------- | ------- | ---------------------------------------- |
| `tag_slug`         | string  | no       | —       | Get stats for a specific tag             |
| `category`         | string  | no       | —       | Filter by category                       |
| `module`           | string  | no       | —       | Filter by module (narrows the LEFT JOIN) |
| `include_inactive` | boolean | no       | `false` | Include inactive tags                    |
| `limit`            | number  | no       | `20`    | Max results (1–100)                      |

When `module` is provided, the LEFT JOIN condition is extended to filter taggables by that module, so statistics reflect usage within that specific module only.

#### Response

```json
{
	"ok": true,
	"data": {
		"stats": [
			{
				"tagId": 5,
				"tagName": "JavaScript",
				"tagSlug": "javascript",
				"category": "programming",
				"weight": 5.0,
				"totalUsage": 120,
				"avgRelevance": "0.87",
				"moduleBreakdown": "projects:45,articles:30,users:45",
				"autoTaggedCount": 20,
				"manualTaggedCount": 100,
				"lastUsed": 1740000000
			}
		]
	}
}
```

Results are ordered by `totalUsage` descending.

---

## Affinity Scoring

The tags module implements a weighted affinity scoring system used by `tag_find_by_tags` and `tag_find_by_affinity`.

### Concepts

- **Tag weight** (`tags.weight`, 0–10): Indicates the importance of a tag. Default is `1.0`.
- **Relevance score** (`taggables.relevance_score`, 0–1): Indicates how relevant a specific tag is to a specific object. Default is `1.0`.

### Formulas

**Find by tags** — how well an object matches a set of requested tags:

```
affinity = SUM(relevance_score × tag_weight)
```

**Find by affinity** — how similar a target object is to a source object based on shared tags:

```
affinity = SUM(source_relevance × target_relevance × tag_weight)
```

### Use cases

- **Recommendations:** "Users who liked X also liked Y" via `tag_find_by_affinity`
- **Filtering:** "Show all projects tagged with JavaScript AND React" via `tag_find_by_tags` with `match_type: "all"`
- **Discovery:** "Find articles related to this project" via cross-module affinity search

---

## Error Codes

All errors follow the `LiWEResponse` format with `ok: false`.

| Code                       | HTTP Status | Description                                       |
| -------------------------- | ----------- | ------------------------------------------------- |
| `VALIDATION_ERROR`         | 400         | Invalid input parameters (Zod validation failure) |
| `DUPLICATE_TAG`            | 400         | Tag name or slug already exists                   |
| `DUPLICATE_TAG_ASSIGNMENT` | 400         | Object already has this tag                       |
| `INVALID_MERGE_REQUEST`    | 400         | Source and target tags are the same               |
| `TAG_NOT_FOUND`            | 404         | Tag with given slug doesn't exist                 |
| `TAG_ASSIGNMENT_NOT_FOUND` | 404         | Tag is not assigned to the specified object       |
| `TAGS_NOT_FOUND`           | 404         | One or more tag slugs don't exist                 |
| `NO_VALID_TAGS`            | 404         | None of the provided slugs match existing tags    |
| `SOURCE_TAG_NOT_FOUND`     | 404         | Source tag slug doesn't exist (merge)             |
| `TARGET_TAG_NOT_FOUND`     | 404         | Target tag slug doesn't exist (merge)             |
| `DATABASE_ERROR`           | 500         | Unexpected database error                         |

---

## Dependencies

### Runtime

| Package               | Version     | Purpose                                                          |
| --------------------- | ----------- | ---------------------------------------------------------------- |
| `@backend/liwe3/core` | workspace:* | Core framework (LiWEApp, permissions, response helpers, slugify) |
| `drizzle-orm`         | ^0.45.1     | Database ORM                                                     |
| `zod`                 | ^4.3.6      | Schema validation                                                |

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
@backend/modules/tags/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── docs/
│   └── documentation.md
├── sql/
│   └── tags.sql              # Raw SQL schema (tables, indexes, triggers, views)
├── src/
│   ├── index.ts              # Module init, route registration, permissions
│   ├── schema.ts             # Drizzle ORM schema, relations, type exports
│   ├── perms.ts              # Permission definitions
│   ├── methods.ts            # Re-exports all methods
│   └── methods/
│       ├── index.ts          # Re-export hub
│       ├── utils.ts          # Common imports (LiWE, Drizzle, Zod, schema)
│       ├── tag-add.ts
│       ├── tag-object.ts
│       ├── tag-remove-object.ts
│       ├── tag-update-relevance.ts
│       ├── tag-list.ts
│       ├── tag-list-by-object.ts
│       ├── tag-list-by-module.ts
│       ├── tag-search.ts
│       ├── tag-find-by-tags.ts
│       ├── tag-find-by-affinity.ts
│       ├── tag-bulk-add.ts
│       ├── tag-bulk-remove.ts
│       ├── tag-merge.ts
│       └── tag-stats.ts
└── tests/
    ├── setup.ts              # Test utilities (createTestApp, factories, resetMocks)
    ├── validation.test.ts    # Schema validation tests
    ├── methods-simple.test.ts
    ├── comprehensive.test.ts
    ├── tag-list.test.ts
    ├── methods.test.ts       # (excluded — complex Drizzle mocking)
    ├── integration.test.ts   # (excluded)
    └── edge-cases.test.ts    # (excluded)
```
