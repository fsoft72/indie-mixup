# Tags Module Documentation

## Overview

The Tags module provides a comprehensive tagging system for categorizing and organizing objects across different modules. It supports tag creation, object tagging, tag-based search, affinity calculations, and advanced features like bulk operations and tag merging.

## Database Schema

### Tags Table Structure

| Field       | Type        | Description                                         | Required             |
| ----------- | ----------- | --------------------------------------------------- | -------------------- |
| id          | integer     | Auto-incrementing primary key                       | Yes (auto-generated) |
| name        | string(100) | Tag name (unique)                                   | Yes                  |
| slug        | string(100) | URL-friendly slug (unique)                          | Yes                  |
| description | text        | Tag description                                     | No                   |
| color       | string(7)   | Hex color code for tag display                      | No                   |
| category    | string(50)  | Tag category for organization                       | No                   |
| weight      | real        | Tag weight for relevance calculations (default 1.0) | No                   |
| is_active   | boolean     | Whether the tag is active (default true)            | Yes                  |
| created     | timestamp   | Creation timestamp                                  | No (auto-generated)  |
| updated     | timestamp   | Last update timestamp                               | No (auto-generated)  |
| updated_by  | string(64)  | User ID who last updated                            | No                   |

### Taggables Table Structure

| Field           | Type       | Description                                   | Required             |
| --------------- | ---------- | --------------------------------------------- | -------------------- |
| id              | integer    | Auto-incrementing primary key                 | Yes (auto-generated) |
| tag_id          | integer    | Foreign key to tags table                     | Yes                  |
| module          | string(50) | Module name that owns the object              | Yes                  |
| id_object       | string(64) | Object identifier within the module           | Yes                  |
| relevance_score | real       | Relevance score between 0 and 1 (default 1.0) | No                   |
| created         | timestamp  | Creation timestamp                            | No (auto-generated)  |
| updated         | timestamp  | Last update timestamp                         | No (auto-generated)  |
| updated_by      | string(64) | User ID who created the assignment            | No                   |
| auto_tagged     | boolean    | Whether tag was auto-assigned (default false) | No                   |

## API Endpoints

### GET /api/tags/list

Lists tags with pagination and filtering support.

**Request Parameters (Query String):**

- `limit` (optional): Maximum number of tags to return (1-100, default 20)
- `offset` (optional): Starting row for pagination (0+, default 0)
- `category` (optional): Category filter
- `active_only` (optional): Include only active tags (default true)
- `order_by` (optional): Field to order by ('name', 'created', 'updated', 'weight', default 'name')
- `order_direction` (optional): Sort direction ('asc', 'desc', default 'asc')

**Response Type:** `{ tags: Tag[], total: number }`

**Usage Example:**

```bash
curl -X GET "http://localhost:8787/api/tags/list?limit=10&category=programming&order_by=weight&order_direction=desc"
```

### POST /api/tags/tag/add

Creates a new tag in the system.

**Request Parameters:**

- `name` (required): Tag name (min 1 character)
- `slug` (optional): URL-friendly slug (auto-generated if not provided)
- `description` (optional): Tag description
- `color` (optional): Hex color code (must be valid 6-digit hex)
- `category` (optional): Tag category for organization
- `weight` (optional): Tag weight for relevance calculations (0-10, default 1.0)
- `updated_by` (optional): User ID who created the tag

**Response Type:** `{ tag: Tag }`

**Usage Example:**

```bash
curl -X POST "http://localhost:8787/api/tags/tag/add" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "JavaScript",
    "description": "Programming language tag",
    "color": "#F7DF1E",
    "category": "programming",
    "weight": 5.0
  }'
```

### POST /api/tags/obj/add

Assigns a tag to an object.

**Request Parameters:**

- `tag_slug` (required): Tag slug to identify the tag
- `id_object` (required): Object identifier
- `module` (required): Module name that owns the object
- `relevance` (optional): Relevance score between 0 and 1 (default 1.0)
- `updated_by` (optional): User ID who created the assignment
- `auto_tagged` (optional): Whether tag was auto-assigned (default false)

**Response Type:** `{ taggable: Taggable }`

**Usage Example:**

```bash
curl -X POST "http://localhost:8787/api/tags/obj/add" \
  -H "Content-Type: application/json" \
  -d '{
    "tag_slug": "javascript",
    "id_object": "project123",
    "module": "projects",
    "relevance": 0.9
  }'
```

### DELETE /api/tags/obj/del

Removes a tag from an object.

**Request Parameters:**

- `tag_slug` (required): Tag slug to identify the tag
- `id_object` (required): Object identifier
- `module` (required): Module name that owns the object

**Response Type:** `{ removed: number }`

### GET /api/tags/obj/list

Lists tags assigned to a specific object.

**Request Parameters:**

- `id_object` (required): Object identifier
- `module` (required): Module name that owns the object
- `active_only` (optional): Include only active tags (default true)

**Response Type:** `{ tags: TagWithRelevance[] }`

### POST /api/tags/find/by/tags

Finds objects that have specific tags.

**Request Parameters:**

- `tag_slugs` (required): Array of tag slugs to search for (min 1 required)
- `target_module` (required): Module to search within
- `match_type` (optional): Whether to match 'any' or 'all' tags (default 'any')
- `min_affinity_score` (optional): Minimum affinity score for results (default 0.1)
- `limit` (optional): Maximum results to return (1-100, default 20)
- `exclude_objects` (optional): Object IDs to exclude from results
- `active_tags_only` (optional): Whether to consider only active tags (default true)

**Response Type:** `{ objects: ObjectWithAffinity[] }`

**Usage Example:**

```bash
curl -X POST "http://localhost:8787/api/tags/find/by/tags" \
  -H "Content-Type: application/json" \
  -d '{
    "tag_slugs": ["javascript", "react"],
    "target_module": "projects",
    "match_type": "all",
    "min_affinity_score": 0.5,
    "limit": 10
  }'
```

### POST /api/tags/find/by/affinity

Finds objects with similar tag profiles to a given object.

**Request Parameters:**

- `id_object` (required): Reference object identifier
- `module` (required): Module of the reference object
- `target_module` (optional): Module to search within (defaults to same module)
- `min_affinity_score` (optional): Minimum affinity score for results (default 0.1)
- `limit` (optional): Maximum results to return (default 20)
- `exclude_objects` (optional): Object IDs to exclude from results

**Response Type:** `{ objects: ObjectWithAffinity[] }`

### POST /api/tags/search

Searches for tags by name, slug, or description.

**Request Parameters:**

- `query` (optional): Search query (searches name, slug, description)
- `category` (optional): Category filter
- `active_only` (optional): Include only active tags (default true)
- `limit` (optional): Maximum results to return (1-100, default 20)
- `offset` (optional): Results offset for pagination (default 0)

**Response Type:** `{ tags: Tag[] }`

**Usage Example:**

```bash
curl -X POST "http://localhost:8787/api/tags/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "javascript",
    "category": "programming",
    "limit": 10
  }'
```

### PATCH /api/tags/relevance/update

Updates the relevance score of a tag assignment.

**Request Parameters:**

- `tag_slug` (required): Tag slug to identify the tag
- `id_object` (required): Object identifier
- `module` (required): Module name that owns the object
- `relevance` (required): New relevance score between 0 and 1
- `updated_by` (optional): User ID who made the update

**Response Type:** `{ updated: Taggable }`

### POST /api/tags/stats

Gets statistical information about tags and tagging.

**Request Parameters:**

- `module` (optional): Module to get stats for (if not provided, returns global stats)
- `include_inactive` (optional): Include inactive tags in stats (default false)

**Response Type:** `{ stats: TagStats }`

### POST /api/tags/bulk/add

Adds multiple tags to an object at once.

**Request Parameters:**

- `tag_slugs` (required): Array of tag slugs to add (min 1 required)
- `id_object` (required): Object identifier
- `module` (required): Module name that owns the object
- `relevance` (optional): Relevance score for all tags (0-1, default 1.0)
- `updated_by` (optional): User ID who made the assignment
- `auto_tagged` (optional): Whether tags were auto-assigned (default false)
- `overwrite_existing` (optional): Whether to remove existing tags first (default false)

**Response Type:** `{ tagged: TaggedObject[], errors: TagError[], summary: string }`

**Usage Example:**

```bash
curl -X POST "http://localhost:8787/api/tags/bulk/add" \
  -H "Content-Type: application/json" \
  -d '{
    "tag_slugs": ["javascript", "react", "frontend"],
    "id_object": "project123",
    "module": "projects",
    "relevance": 0.9,
    "overwrite_existing": true
  }'
```

### DELETE /api/tags/bulk/del

Removes multiple tags from an object at once.

**Request Parameters:**

- `tag_slugs` (required): Array of tag slugs to remove (min 1 required)
- `id_object` (required): Object identifier
- `module` (required): Module name that owns the object

**Response Type:** `{ removed: TaggedObject[], errors: TagError[], summary: string }`

### POST /api/tags/list/by/module

Lists all tags used within a specific module.

**Request Parameters:**

- `module` (required): Module name to list tags for
- `limit` (optional): Maximum results to return (default 50)
- `order_by` (optional): Field to order by ('usage_count', 'tag_name', default 'usage_count')
- `active_only` (optional): Include only active tags (default true)

**Response Type:** `{ tags: TagUsageInfo[] }`

### PATCH /api/tags/merge

Merges two tags, moving all assignments from source to target tag.

**Request Parameters:**

- `source_tag_slug` (required): Slug of the tag to merge from
- `target_tag_slug` (required): Slug of the tag to merge into
- `delete_source` (optional): Whether to delete the source tag after merging (default true)
- `updated_by` (optional): User ID who performed the merge

**Response Type:** `{ merged: MergeResult }`

## Exported Functions

### module_init(app: LiWEApp)

Initializes the tags module by registering all route handlers and permissions with the provided Hono app instance.

**Parameters:**

- `app`: LiWE application instance containing the Hono router and database connection

**Usage:**

```typescript
import { module_init } from '@backend/modules/tags';

// Initialize the tags module
module_init( app );
```

### tag_add(app: LiWEApp, params: TagAddParams)

Creates a new tag with automatic slug generation if not provided.

**Parameters:**

- `app`: LiWE application instance
- `params`: Tag data conforming to AddTagSchema

**Returns:** `Promise<LiWEResponse<TagAddResult>>`

### tag_object(app: LiWEApp, params: TagObjectParams)

Assigns a tag to an object with relevance scoring.

**Parameters:**

- `app`: LiWE application instance
- `params`: Tag assignment data

**Returns:** `Promise<LiWEResponse<TagObjectResult>>`

### tag_list(app: LiWEApp, params: TagListParams)

Lists tags with pagination and filtering support.

**Parameters:**

- `app`: LiWE application instance
- `params`: Listing parameters with pagination options

**Returns:** `Promise<LiWEResponse<TagListResult>>`

### tag_search(app: LiWEApp, params: TagSearchParams)

Searches tags by name, slug, or description with pagination.

**Parameters:**

- `app`: LiWE application instance
- `params`: Search parameters

**Returns:** `Promise<LiWEResponse<TagSearchResult>>`

### tag_find_by_tags(app: LiWEApp, params: TagFindByTagsParams)

Finds objects that have specific tags with affinity scoring.

**Parameters:**

- `app`: LiWE application instance
- `params`: Search parameters including tag slugs and match criteria

**Returns:** `Promise<LiWEResponse<TagFindByTagsResult>>`

### tag_find_by_affinity(app: LiWEApp, params: TagFindByAffinityParams)

Finds objects with similar tag profiles to a reference object.

**Parameters:**

- `app`: LiWE application instance
- `params`: Affinity search parameters

**Returns:** `Promise<LiWEResponse<TagFindByAffinityResult>>`

### tag_bulk_add(app: LiWEApp, params: TagBulkAddParams)

Adds multiple tags to an object efficiently in a single operation.

**Parameters:**

- `app`: LiWE application instance
- `params`: Bulk assignment parameters

**Returns:** `Promise<LiWEResponse<TagBulkAddResult>>`

## Exported Types

### Tag

Complete tag record type from database schema.

### NewTag

Type for inserting new tag records.

### Taggable

Complete taggable record type from database schema.

### NewTaggable

Type for inserting new taggable records.

### ObjectWithAffinity

Object found by tag search with affinity scoring information.

### TaggedObject

Single tag assignment result with metadata.

### TagError

Tag operation error information.

## Permissions

The module registers the following permissions:

- `tags.create`: Create new tags and add tags to objects
- `tags.read`: View and search tags and tagged objects
- `tags.update`: Update tag relevance and merge tags
- `tags.delete`: Remove tags from objects and delete tags
- `tags.admin`: Full administrative access to tags system including bulk operations

## Key Features

### Affinity Scoring

The system calculates affinity scores based on:

- Tag weight (defined at tag level)
- Relevance score (defined at assignment level)
- Combined score: `relevance_score * tag_weight`

### Auto-generated Slugs

Tags automatically generate URL-friendly slugs from names using the `slugify` function.

### Bulk Operations

Efficient bulk adding and removing of tags with detailed success/error reporting.

### Tag Merging

Ability to merge tags, moving all assignments from source to target tag.

### Module-based Organization

Tags can be filtered and organized by the modules that use them.

### Search Capabilities

- Text search across tag names, slugs, and descriptions
- Tag-based object finding with affinity matching
- Similar object discovery based on shared tag profiles

## Error Handling

All endpoints return standardized LiWEResponse format:

- Success responses include `success: true` and `data` field
- Error responses include `success: false`, `message`, and optional `code`
- Common error codes:
  - `VALIDATION_ERROR`: Input validation failed
  - `TAG_NOT_FOUND`: Specified tag does not exist
  - `DUPLICATE_TAG`: Tag name/slug already exists
  - `DUPLICATE_TAG_ASSIGNMENT`: Object already has the specified tag
  - `DATABASE_ERROR`: Database operation failed
