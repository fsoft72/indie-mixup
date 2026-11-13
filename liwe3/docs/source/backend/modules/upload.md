# Upload Module

The **upload** module provides multipart file upload capabilities backed by Cloudflare R2 storage. It implements a chunked upload protocol (initiate, upload parts, complete/abort), automatic thumbnail generation via Cloudflare Queues, file listing with cursor-based pagination, file retrieval with CDN caching, and pattern-based deletion.

**Package:** `@backend/modules/upload`
**Version:** 1.0.0
**Storage:** Cloudflare R2 (`UPLOAD_BUCKET`, `THUMBNAIL_BUCKET`)
**Queues:** Cloudflare Queues (`THUMBNAIL_QUEUE`)
**Validation:** Zod
**HTTP Framework:** Hono

---

## Table of Contents

- [Architecture](#architecture)
- [Upload Flow](#upload-flow)
- [Key Format](#key-format)
- [Permissions](#permissions)
- [Events](#events)
- [Queue Workers](#queue-workers)
- [API Endpoints](#api-endpoints)
- [Methods Reference](#methods-reference)
  - [upload_initiate](#upload_initiate)
  - [upload_part](#upload_part)
  - [upload_complete](#upload_complete)
  - [upload_abort](#upload_abort)
  - [upload_list](#upload_list)
  - [upload_get](#upload_get)
  - [upload_del](#upload_del)
- [Types](#types)
- [Error Codes](#error-codes)
- [Dependencies](#dependencies)
- [File Structure](#file-structure)

---

## Architecture

The module is stateless — it does **not** use a database. All file metadata is stored directly in R2 object storage. The module relies on:

- **`UPLOAD_BUCKET`** — Primary R2 bucket for uploaded files.
- **`THUMBNAIL_BUCKET`** — Separate R2 bucket for generated thumbnails (falls back to `UPLOAD_BUCKET` if not configured).
- **`THUMBNAIL_QUEUE`** — Cloudflare Queue for asynchronous thumbnail generation after upload completion.

During `module_init()`, the module:

1. Initializes queue handlers via `queue_init()`.
2. Registers 7 HTTP routes on the Hono app.
3. Registers permissions with the global permissions system.

All route handlers support a `response` field on the `LiWEResponse` object. When set (e.g. for binary file streaming), the raw `Response` is returned directly instead of the JSON envelope.

---

## Upload Flow

The module implements a standard multipart upload protocol:

```
1. Client → POST /api/upload/initiate
   ← { uploadId, key }

2. Client → POST /api/upload/part  (repeat for each chunk)
   Headers: X-Upload-Id, X-Key, X-Part-Number
   Body: raw binary data
   ← { partNumber, etag }

3a. Client → POST /api/upload/complete
    Body: { uploadId, key, parts: [{partNumber, etag}, ...] }
    ← { success, key, size, etag }

3b. Client → POST /api/upload/abort  (if cancelling)
    Body: { uploadId, key }
    ← true
```

After a successful `upload_complete`:

- The `upload.file_complete` event is emitted.
- If `THUMBNAIL_QUEUE` is available, a message is sent to generate a thumbnail asynchronously.

---

## Key Format

Files are stored in R2 with a composite key format:

```
domain|folder/timestamp|safeFilename
```

Where:

- **`domain`** — The user's domain (e.g. `test`, `prod`). Defaults to `_` if unavailable.
- **`folder`** — Virtual folder path (default: `uploads`). Leading/trailing slashes are stripped.
- **`timestamp`** — Base-36 encoded `Date.now()` for uniqueness.
- **`safeFilename`** — Original filename with `|` and `/` replaced by `_`.

### Key utility functions (`src/methods/utils.ts`)

| Function        | Signature                             | Description                                                      |
| --------------- | ------------------------------------- | ---------------------------------------------------------------- |
| `keyBuild`      | `(domain, folder, fileName) → string` | Builds a full R2 key with timestamp                              |
| `keyExp`        | `(key) → DomainName`                  | Parses a key into `{ domain, path, fullPath, originalFileName }` |
| `keyRebuild`    | `(key) → string`                      | Validates an existing key (passes through if valid)              |
| `keyFullFolder` | `(domain, folder) → string`           | Builds a `domain                                                 |
| `keyAddFolder`  | `(folder, key) → string`              | Inserts an additional folder segment into an existing key        |

### Thumbnail keys

Thumbnails are stored with the pattern:

```
domain|thumbnails/fullPath|originalFileName
```

The `thumbnails/` segment is inserted between the domain and the file path.

---

## Permissions

Registered under the `upload` module namespace during `module_init()`.

| Permission         | Constant                | Description                                             |
| ------------------ | ----------------------- | ------------------------------------------------------- |
| `upload.send_file` | `UPLOAD_PERM_SEND_FILE` | User can upload files (initiate, part, complete, abort) |
| `upload.delete`    | `UPLOAD_PERM_DELETE`    | User can delete files and folders                       |

**Note:** `upload_list` requires authentication (checks `app.user`) but no specific permission. `upload_get` has no authentication check — it serves files publicly with CDN caching.

---

## Events

The module emits events via `liwe_event_emit()`:

| Event                  | Constant                     | Emitted when                     | Payload                        |
| ---------------------- | ---------------------------- | -------------------------------- | ------------------------------ |
| `upload.file_complete` | `UPLOAD_EVENT_FILE_COMPLETE` | Upload is completed successfully | `{ success, key, size, etag }` |
| `upload.abort`         | `UPLOAD_EVENT_ABORT`         | Upload is aborted                | _(none)_                       |

---

## Queue Workers

Initialized in `queue_init()` during module startup. Two queue handlers are registered:

### `upload.thumbnail`

Triggered after a successful upload when `THUMBNAIL_QUEUE` is available.

**Process:**

1. Fetches the uploaded file from `UPLOAD_BUCKET` by key.
2. Determines MIME type from the file extension via `ext2mime()`.
3. Generates a 300x300 JPEG thumbnail using `@liwe3/thumbnailer`.
4. Stores the thumbnail in `THUMBNAIL_BUCKET` with a `thumbnails/` path prefix.
5. Acknowledges the queue message on success.

If thumbnail generation fails, the message is **not acknowledged**, allowing the queue to retry.

### `upload.delete`

Handles asynchronous file deletion (both the original file and its thumbnail).

**Process:**

1. Deletes the file from `UPLOAD_BUCKET`.
2. Deletes the corresponding thumbnail from `THUMBNAIL_BUCKET`.
3. Acknowledges the queue message.

---

## API Endpoints

| Method   | Route                  | Handler           | Auth               | Description                      |
| -------- | ---------------------- | ----------------- | ------------------ | -------------------------------- |
| `POST`   | `/api/upload/initiate` | `upload_initiate` | `upload.send_file` | Start a multipart upload         |
| `POST`   | `/api/upload/part`     | `upload_part`     | `upload.send_file` | Upload a file chunk              |
| `POST`   | `/api/upload/complete` | `upload_complete` | `upload.send_file` | Complete and assemble the upload |
| `POST`   | `/api/upload/abort`    | `upload_abort`    | `upload.send_file` | Abort and cleanup partial upload |
| `GET`    | `/api/upload/list`     | `upload_list`     | authenticated      | List files in a folder           |
| `DELETE` | `/api/upload/del`      | `upload_del`      | `upload.delete`    | Delete files by pattern          |
| `GET`    | `/api/upload/get`      | `upload_get`      | public             | Retrieve a file by key           |

---

## Methods Reference

### `upload_initiate`

Starts a new multipart upload on R2.

**Source:** `src/methods/upload-initiate.ts`
**Route:** `POST /api/upload/initiate`
**Permission:** `upload.send_file`

#### Parameters (JSON body)

| Param      | Type   | Required | Default   | Description                  |
| ---------- | ------ | -------- | --------- | ---------------------------- |
| `fileName` | string | yes      | —         | Original filename            |
| `fileType` | string | yes      | —         | MIME type (e.g. `image/png`) |
| `folder`   | string | no       | `uploads` | Virtual destination folder   |

The folder is prefixed with the user's `domain` internally. For example, if the user belongs to domain `test` and folder is `profiles`, the R2 prefix becomes `test|profiles`.

If `fileType` is empty, defaults to `application/octet-stream`.

#### Response

```json
{
	"ok": true,
	"data": {
		"uploadId": "abc123...",
		"key": "test|uploads/m1abc2x|my-photo.png"
	}
}
```

The returned `uploadId` and `key` must be used in all subsequent `upload_part`, `upload_complete`, and `upload_abort` calls.

---

### `upload_part`

Uploads a single chunk of binary data for an in-progress multipart upload.

**Source:** `src/methods/upload-part.ts`
**Route:** `POST /api/upload/part`
**Permission:** `upload.send_file`

#### Parameters (HTTP headers + raw body)

This method does **not** accept a JSON body. Instead:

| Header          | Type   | Required | Description                           |
| --------------- | ------ | -------- | ------------------------------------- |
| `X-Upload-Id`   | string | yes      | The `uploadId` from `upload_initiate` |
| `X-Key`         | string | yes      | The `key` from `upload_initiate`      |
| `X-Part-Number` | number | yes      | Sequential part number (1-based)      |

The **request body** must be the raw binary chunk data (`application/octet-stream`).

#### Response

```json
{
	"ok": true,
	"data": {
		"partNumber": 1,
		"etag": "\"abc123def456...\""
	}
}
```

The client must collect all `{ partNumber, etag }` pairs and send them to `upload_complete`.

#### Errors

- `400 ERROR_MISSING_HEADERS` — One or more required headers are missing
- `400 ERROR_EMPTY_BODY` — Request body is empty

---

### `upload_complete`

Completes a multipart upload by assembling all parts into the final object.

**Source:** `src/methods/upload-complete.ts`
**Route:** `POST /api/upload/complete`
**Permission:** `upload.send_file`

#### Parameters (JSON body)

| Param      | Type   | Required | Description                                                  |
| ---------- | ------ | -------- | ------------------------------------------------------------ |
| `uploadId` | string | yes      | The `uploadId` from `upload_initiate`                        |
| `key`      | string | yes      | The `key` from `upload_initiate`                             |
| `parts`    | array  | yes      | Array of `{ partNumber, etag }` from each `upload_part` call |

#### Side effects

1. R2 assembles all parts into the final object and deletes the individual parts.
2. Emits `upload.file_complete` event with `{ success, key, size, etag }`.
3. If `THUMBNAIL_QUEUE` is available, queues a thumbnail generation job with `{ key, uploadId, domain, action: 'upload.thumbnail' }`.

#### Response

```json
{
	"ok": true,
	"data": {
		"success": true,
		"key": "test|uploads/m1abc2x|my-photo.png",
		"size": 1048576,
		"etag": "\"abc123...\""
	}
}
```

---

### `upload_abort`

Aborts an in-progress multipart upload and cleans up all uploaded parts.

**Source:** `src/methods/upload-abort.ts`
**Route:** `POST /api/upload/abort`
**Permission:** `upload.send_file`

#### Parameters (JSON body)

| Param      | Type   | Required | Description                           |
| ---------- | ------ | -------- | ------------------------------------- |
| `uploadId` | string | yes      | The `uploadId` from `upload_initiate` |
| `key`      | string | yes      | The `key` from `upload_initiate`      |

#### Side effects

- R2 deletes all uploaded parts and frees storage.
- Emits `upload.abort` event.

#### Response

```json
{
	"ok": true,
	"data": true
}
```

---

### `upload_list`

Lists all files inside a specific folder with cursor-based pagination.

**Source:** `src/methods/upload-list.ts`
**Route:** `GET /api/upload/list`
**Auth:** Requires authenticated user (no specific permission)

#### Parameters (query string)

| Param    | Type   | Required | Default | Description                                             |
| -------- | ------ | -------- | ------- | ------------------------------------------------------- |
| `folder` | string | yes      | —       | Folder to list (prefixed with user's domain internally) |
| `cursor` | string | no       | —       | Pagination cursor from a previous truncated response    |
| `limit`  | number | no       | —       | Maximum number of objects per call                      |

#### Response

```json
{
	"ok": true,
	"data": {
		"objects": [
			{
				"key": "test|uploads/m1abc2x|photo.png",
				"etag": "\"abc123...\"",
				"size": 1048576,
				"version": "v1",
				"uploaded": "2026-02-24T12:00:00.000Z"
			}
		],
		"truncated": false,
		"cursor": null
	}
}
```

When `truncated` is `true`, pass the returned `cursor` to the next call to retrieve additional results.

#### Errors

- `401 ERROR_NOT_AUTHENTICATED` — No authenticated user

---

### `upload_get`

Retrieves a file from R2 by its key. Returns the raw binary stream with proper MIME type headers and aggressive CDN caching (1 year, immutable).

**Source:** `src/methods/upload-get.ts`
**Route:** `GET /api/upload/get`
**Auth:** Public (no authentication required)

#### Parameters (query string)

| Param     | Type   | Required | Default | Description                               |
| --------- | ------ | -------- | ------- | ----------------------------------------- |
| `key`     | string | yes      | —       | Full or partial key (see below)           |
| `variant` | string | no       | —       | `file` (default) or `thumb` for thumbnail |

#### Key resolution

The `key` can be provided in two formats:

- **Full key:** `domain|path/timestamp|filename` (3-segment, contains 2 pipes) — used as-is.
- **Partial key:** `path/timestamp|filename` — the system domain is prepended automatically.

When `variant = "thumb"`, the key is rewritten to fetch from `THUMBNAIL_BUCKET` with the `thumbnails/` path prefix.

#### Response

Returns a raw `Response` object (not the standard JSON envelope) with:

- **Body:** File binary stream
- **Headers:**
  - `Content-Type` from R2 metadata
  - `ETag` from the R2 object
  - `Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable` (1 year)

#### Errors

- `404 FILE_NOT_FOUND` — File does not exist in the bucket

---

### `upload_del`

Deletes one or more files matching a pattern. Also deletes corresponding thumbnails.

**Source:** `src/methods/upload-del.ts`
**Route:** `DELETE /api/upload/del`
**Permission:** `upload.delete`

#### Parameters (JSON body)

| Param     | Type   | Required | Description                                    |
| --------- | ------ | -------- | ---------------------------------------------- |
| `pattern` | string | yes      | File pattern to delete (supports trailing `*`) |

#### Pattern matching

The pattern is simple:

- **`folder/*`** — Deletes all files under the folder.
- **`folder/subfolder`** — Deletes all files under the folder (prefix match).
- The pattern is prefixed with the user's domain internally.

#### Deletion process

1. Lists all objects in `UPLOAD_BUCKET` matching the prefix (handles pagination via cursor).
2. For each batch, deletes both the original files and their corresponding thumbnails from `THUMBNAIL_BUCKET`.
3. Continues until all pages are processed (`truncated = false`).

#### Response

```json
{
	"ok": true,
	"data": true
}
```

#### Errors

- `403 INSUFFICIENT_PERMISSIONS` — User lacks `upload.delete` permission

---

## Types

Defined in `src/types.ts` with Zod schemas.

### `UploadMultipartInfo`

Returned by `upload_initiate`.

```typescript
{
	uploadId: string; // Unique multipart upload ID
	key: string; // R2 object key
}
```

### `UploadMultipartPart`

Returned by `upload_part`.

```typescript
{
	partNumber: number; // Sequential part number
	etag: string; // Chunk ETag for verification
}
```

### `UploadMultipartComplete`

Returned by `upload_complete`.

```typescript
{
	success: boolean; // Upload success flag
	key: string; // Final R2 object key
	size: number; // Total file size in bytes
	etag: string; // Final object ETag
}
```

### `UploadFile`

Individual file object in listing results.

```typescript
{
	key: string; // R2 object key
	etag: string; // ETag hash of contents
	size: number; // File size in bytes
	version: string; // Object version string
	uploaded: Date; // Last modified/uploaded date
}
```

### `UploadFileList`

Returned by `upload_list`.

```typescript
{
  objects: UploadFile[];  // Array of file objects
  truncated: boolean;     // Whether more results are available
  cursor?: string;        // Pagination cursor (present if truncated)
}
```

### `DomainName`

Internal type returned by `keyExp()`.

```typescript
{
	domain: string; // Domain name
	path: string; // Folder path (without filename)
	fullPath: string; // File name with folder path
	originalFileName: string; // Original filename
}
```

---

## Error Codes

All errors follow the `LiWEResponse` format with `ok: false`.

| Code                       | HTTP Status | Description                                       |
| -------------------------- | ----------- | ------------------------------------------------- |
| `VALIDATION_ERROR`         | 400         | Invalid input parameters (Zod validation failure) |
| `ERROR_MISSING_HEADERS`    | 400         | Missing required headers on `upload_part`         |
| `ERROR_EMPTY_BODY`         | 400         | Empty request body on `upload_part`               |
| `ERROR_NO_PERMISSION`      | 403         | User lacks `upload.send_file` permission          |
| `INSUFFICIENT_PERMISSIONS` | 403         | User lacks `upload.delete` permission             |
| `ERROR_NOT_AUTHENTICATED`  | 401         | No authenticated user (for `upload_list`)         |
| `FILE_NOT_FOUND`           | 404         | File does not exist in R2                         |
| `ERROR_NO_CONTEXT`         | 500         | Missing Hono context (internal error)             |

---

## Dependencies

### Runtime

| Package               | Version     | Purpose                                                          |
| --------------------- | ----------- | ---------------------------------------------------------------- |
| `@backend/liwe3/core` | workspace:* | Core framework (LiWEApp, permissions, events, ext2mime)          |
| `@liwe3/thumbnailer`  | workspace:* | Thumbnail generation (`createThumbnail`)                         |
| `drizzle-orm`         | ^0.45.1     | Database ORM (imported but unused — no DB tables in this module) |
| `zod`                 | ^4.3.6      | Schema validation                                                |

### Development

| Package       | Version | Purpose                  |
| ------------- | ------- | ------------------------ |
| `hono`        | ^4.12.0 | HTTP framework           |
| `vitest`      | ^4.0.18 | Test runner              |
| `@vitest/ui`  | ^4.0.18 | Visual test UI           |
| `typescript`  | ^5.9.3  | TypeScript compiler      |
| `@types/node` | ^25.3.0 | Node.js type definitions |

### Cloudflare Workers Runtime

The module depends on Cloudflare Workers types at runtime:

- `@cloudflare/workers-types` — `Message`, `R2Object`

### Environment Bindings

| Binding            | Type     | Required | Description                                                |
| ------------------ | -------- | -------- | ---------------------------------------------------------- |
| `UPLOAD_BUCKET`    | R2Bucket | yes      | Primary file storage bucket                                |
| `THUMBNAIL_BUCKET` | R2Bucket | no       | Dedicated thumbnail bucket (falls back to `UPLOAD_BUCKET`) |
| `THUMBNAIL_QUEUE`  | Queue    | no       | Queue for async thumbnail generation                       |

---

## File Structure

```
@backend/modules/upload/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── index.ts              # Module init, route registration, permissions
    ├── types.ts              # Zod schemas and TypeScript types
    ├── perms.ts              # Permission definitions and constants
    ├── events.ts             # Event constants
    ├── queue.ts              # Queue handlers (thumbnail, delete)
    ├── methods.ts            # Re-exports from methods/
    └── methods/
        ├── index.ts          # Re-export hub
        ├── utils.ts          # Key utilities (keyBuild, keyExp, etc.)
        ├── upload-initiate.ts
        ├── upload-part.ts
        ├── upload-complete.ts
        ├── upload-abort.ts
        ├── upload-list.ts
        ├── upload-get.ts
        └── upload-del.ts
```
