# LiWE3 Module JSON Reference

## When to Read This File

Read this file when you need to:

- **Create a new module JSON definition** from scratch
- **Add or modify endpoints** in an existing module
- **Define database schemas** and types for a module
- **Set up permissions and events** for module operations
- **Understand the complete module JSON structure** and conventions
- **Validate a module JSON** before code generation

**DO NOT read this file** when:

- Implementing method logic (read `LIWE3_METHOD_IMPLEMENTATION_GUIDE.md` instead)
- Writing ResTest tests (read `LIWE3_RESTEST.md` instead)
- Organizing module file structure (read `LIWE3_MODULE_ORGANIZATION_GUIDE.md` instead)

## IMPORTANT

**IMPORTANT RULES**

- When you need to add creation and update date, use `created` and `updated` fields.
- **NEVER** add `created_at` or `updated_at`

---

## Quick Template (Minimal Working Module)

This is a complete, minimal module JSON that you can use as a starting point:

```json
{
	"id": "mod.example.v001",
	"name": "Example",
	"doc": "An example module for demonstration purposes",
	"short_descr": "Example module",
	"version": 1,
	"modified": 0,
	"locked_by": "",
	"endpoints": {
		"endp.example.list": {
			"id": "endp.example.list",
			"method": "GET",
			"url": "/example/list",
			"short_descr": "List all examples",
			"description": "Return a list of all examples in the system",
			"parameters": [],
			"returnType": "ExampleItem",
			"returnName": "",
			"is_array": true,
			"permissions": {
				"public": false,
				"logged": true,
				"admins": false
			}
		}
	},
	"functions": {},
	"enums": {},
	"types": {
		"typ.example.item": {
			"id": "typ.example.item",
			"name": "ExampleItem",
			"description": "An example item",
			"doc": "",
			"db_table": "example_items",
			"db_clear": false,
			"fields": [
				{
					"id": "fld.example.id",
					"name": "id",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Unique identifier",
					"index": "u",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.example.domain",
					"name": "domain",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Domain this item belongs to",
					"index": "m",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.example.name",
					"name": "name",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Item name",
					"index": "",
					"size": 255,
					"min_length": 0
				}
			]
		}
	},
	"permissions": {},
	"events": {},
	"id_owner": "user.system.admin",
	"domain": "system"
}
```

---

## Module Structure Overview

A module JSON file consists of these main sections:

| Section         | Purpose                                               | Required | Can be Empty         |
| --------------- | ----------------------------------------------------- | -------- | -------------------- |
| Module Metadata | Basic module information (name, version, description) | ✅ Yes   | ❌ No                |
| `endpoints`     | API endpoint definitions                              | ✅ Yes   | ✅ Yes (`{}`)        |
| `types`         | Database schemas and response types                   | ✅ Yes   | ✅ Yes (`{}`)        |
| `permissions`   | Module permission definitions                         | ✅ Yes   | ✅ Yes (`{}`)        |
| `events`        | Event definitions for inter-module communication      | ✅ Yes   | ✅ Yes (`{}`)        |
| `functions`     | Reserved for future use                               | ✅ Yes   | ✅ Yes (always `{}`) |
| `enums`         | Reserved for future use                               | ✅ Yes   | ✅ Yes (always `{}`) |

**File Location:** `@backend/modules/work/modules/<module_name>.json`

**Modeling an `enum(a,b,c)` column** (LIWE3-PROJECT.md spec notation): since
`enums` is reserved/always empty, use `"type": "str"` with a sane `size` (e.g.
32) and a `description` spelling out the allowed values. Enforce the allowed
set by hand in the method's `f2c_start` block - see `METHOD_IMPLEMENTATION.md`.
Do not hand-edit the generated Zod schema; it is overwritten on regeneration.

---

## Module Metadata Fields

These fields appear at the root level of the JSON:

| Field         | Type   | Required | Description                   | Example                      |
| ------------- | ------ | -------- | ----------------------------- | ---------------------------- |
| `id`          | string | ✅       | Unique module ID              | `"mod.mjp8hzhj.821m"`        |
| `name`        | string | ✅       | Module name (PascalCase)      | `"Wallet"`, `"Upload"`       |
| `doc`         | string | ✅       | Detailed module documentation | `"Manages user wallets..."`  |
| `short_descr` | string | ✅       | Brief one-line description    | `"Wallet management module"` |
| `version`     | number | ✅       | Module version number         | `1`                          |
| `modified`    | number | ✅       | Modification timestamp        | `0`                          |
| `locked_by`   | string | ✅       | Lock status (usually empty)   | `""`                         |
| `id_owner`    | string | ✅       | Owner user ID                 | `"user.system.admin"`        |
| `domain`      | string | ✅       | Domain name                   | `"system"`, `"os3"`          |

### Example

```json
{
	"id": "mod.mwlt0000.main",
	"name": "Wallet",
	"doc": "Manages user wallets with multi-currency support, credit/debit operations, and transfer capabilities.",
	"short_descr": "Wallet management module",
	"version": 1,
	"modified": 0,
	"locked_by": "",
	"id_owner": "user.7146fb62e9a458952246479bcca935f7.4hue",
	"domain": "os3"
}
```

### Validation Rules

- `id` must follow format: `mod.<hash>.<hash>`
- `name` must be PascalCase with no spaces
- `version` must be positive integer
- `id_owner` must follow format: `user.<hash>.<hash>`

### `name` -> folder name gotcha (`lc_*` modules)

`flow2code`'s `mod_name()` does `mod.name.lower().replace(' ', '_').replace('-', '_')` -
it does **not** split camelCase. `"name": "LcTenant"` generates folder
`app/modules/lctenant/...`, not `lc_tenant/...`, breaking the project's mandatory
`lc_` prefix convention. Put the underscore in the JSON `name` yourself, e.g.
`"Lc_Tenant"` - it still lowercases to exactly the folder name you want. Verify
with `ls app/modules/` right after the first flow2code run.

---

## Endpoint Definitions

Endpoints define the API routes for your module.

### Endpoint Field Reference

| Field         | Type    | Required | Description           | Example                                     |
| ------------- | ------- | -------- | --------------------- | ------------------------------------------- |
| `id`          | string  | ✅       | Unique endpoint ID    | `"endp.mwlt0100.crt1"`                      |
| `method`      | string  | ✅       | HTTP method           | `"GET"`, `"POST"`, `"PATCH"`, `"DELETE"`    |
| `url`         | string  | ✅       | API path              | `"/wallet/create"`                          |
| `short_descr` | string  | ✅       | Brief description     | `"Create new wallet"`                       |
| `description` | string  | ✅       | Detailed description  | `"Creates a new wallet for the user..."`    |
| `parameters`  | array   | ✅       | Parameter definitions | `[]` or array of parameter objects          |
| `returnType`  | string  | ✅       | Return type name      | `"Wallet"` (must exist in `types`)          |
| `returnName`  | string  | ✅       | Return variable name  | Usually `""`                                |
| `is_array`    | boolean | ✅       | Returns array?        | `true` for lists, `false` for single object |
| `permissions` | object  | ✅       | Permission mapping    | See permission object below                 |

### HTTP Method Guidelines

| Method   | Use Case            | Body Required            | Typical Return            |
| -------- | ------------------- | ------------------------ | ------------------------- |
| `GET`    | Read/list data      | No (query params only)   | Single object or array    |
| `POST`   | Create new resource | Yes (JSON)               | Created object            |
| `PUT`    | Full update         | Yes (JSON)               | Updated object            |
| `PATCH`  | Partial update      | Yes (JSON)               | Updated object            |
| `DELETE` | Remove resource     | Optional (JSON or query) | Boolean or deleted object |

### URL Conventions

**Format:** `/module/entity/action` or `/module/action`

**Examples:**

- `/wallet/create` - Create wallet
- `/wallet/list` - List wallets
- `/wallet/get` - Get single wallet
- `/wallet/edit` - Update wallet
- `/wallet/del` - Delete wallet
- `/wallet/transaction/list` - List transactions (nested resource)

### Permission Object

The `permissions` object defines the endpoint's **route gate** - the minimum condition to enter the method. It is compiled into `routeGet( m, { perms: ... } )` in the generated `index.ts` and enforced at runtime. Full model: `PERMISSIONS.md`.

| Permission Key | Type    | Resulting gate                                                                    |
| -------------- | ------- | --------------------------------------------------------------------------------- |
| `public`       | boolean | `PUBLIC` - reachable with no authentication (a deliberate decision)               |
| `logged`       | boolean | `LOGGED` - any authenticated user. **Wins over `perm.*` on the same endpoint**    |
| `admins`       | boolean | `[ 'system.admin' ]` - the system-admin wildcard                                  |
| `perm.<id>`    | boolean | that permission's name. Several may be `true` -> the caller needs **one of** them |

**Rules:**

- **At least one flag must resolve to a gate.** All flags `false` -> the generator **rejects the module** (no default, no silently-public endpoint). Set exactly one of `public` / `logged` / `admins`, or one or more `perm.<id>`.
- Setting `logged: true` **and** a `perm.<id>: true` is a smell: the gate becomes `LOGGED` and the specific permission is only enforced if the method also checks it. Pick one.
- To change a gate: edit here, then regenerate. Never hand-edit `index.ts` (the drift test fails and the next regeneration reverts it).

### Permission Examples

```json
// Public endpoint (no auth required)
"permissions": {
  "public": true,
  "logged": false,
  "admins": false
}

// Any logged-in user
"permissions": {
  "public": false,
  "logged": true,
  "admins": false
}

// Requires specific permission
"permissions": {
  "public": false,
  "logged": false,
  "admins": false,
  "perm.mwlt0001.crt1": true
}

// Admin only
"permissions": {
  "public": false,
  "logged": false,
  "admins": true
}
```

### Complete Endpoint Example

```json
"endp.mwlt0100.crt1": {
  "id": "endp.mwlt0100.crt1",
  "method": "POST",
  "url": "/wallet/create",
  "short_descr": "Create a new wallet",
  "description": "Creates a new wallet for the authenticated user with specified currency. Returns the created wallet object.",
  "parameters": [
    {
      "id": "param.mwlt0101.nam1",
      "type": "str",
      "name": "name",
      "description": "Wallet name",
      "is_required": true,
      "is_private": false,
      "is_array": false,
      "is_query": false,
      "query": false,
      "default": "",
      "value": ""
    },
    {
      "id": "param.mwlt0102.cur1",
      "type": "str",
      "name": "currency",
      "description": "Currency code (e.g., USD, EUR)",
      "is_required": true,
      "is_private": false,
      "is_array": false,
      "is_query": false,
      "query": false,
      "default": "USD",
      "value": ""
    }
  ],
  "returnType": "Wallet",
  "returnName": "",
  "is_array": false,
  "permissions": {
    "public": false,
    "logged": false,
    "admins": false,
    "perm.mwlt0001.crt1": true
  }
}
```

### Endpoint Validation Rules

- `id` must follow format: `endp.<hash>.<hash>`
- `method` must be one of: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- `url` must start with `/`
- `returnType` must reference a type defined in the `types` section
- The `permissions` block must resolve to a gate (one of `public` / `logged` / `admins`, or one-or-more `perm.<id>`); all-false is rejected by the generator
- For GET requests, all parameters should have `is_query: true`
- For POST/PUT/PATCH, parameters should have `is_query: false`

---

## Parameter Definitions

Parameters define the inputs for an endpoint.

### Parameter Field Reference

| Field         | Type    | Required | Description                 | Example                                 |
| ------------- | ------- | -------- | --------------------------- | --------------------------------------- |
| `id`          | string  | ✅       | Unique parameter ID         | `"param.mwlt0101.nam1"`                 |
| `type`        | string  | ✅       | Data type                   | `"str"`, `"int"`, `"boolean"`, `"json"` |
| `name`        | string  | ✅       | Parameter name              | `"wallet_name"`, `"limit"`              |
| `description` | string  | ✅       | Parameter description       | `"Maximum results per page"`            |
| `is_required` | boolean | ✅       | Required parameter?         | `true` or `false`                       |
| `is_private`  | boolean | ✅       | Sensitive data?             | `true` for passwords, secrets           |
| `is_array`    | boolean | ✅       | Array parameter?            | `true` or `false`                       |
| `is_query`    | boolean | ✅       | Query parameter?            | `true` for GET, `false` for body        |
| `query`       | boolean | ✅       | Same as `is_query` (legacy) | Same as `is_query`                      |
| `default`     | string  | ✅       | Default value               | `""` or `"50"`                          |
| `value`       | string  | ✅       | Value placeholder           | Always `""`                             |

### Parameter Types

| Type         | Description       | Zod Schema                         | Example Value            |
| ------------ | ----------------- | ---------------------------------- | ------------------------ |
| `str`        | String value      | `z.string()`                       | `"john_doe"`             |
| `int`        | Integer number    | `z.number().int()`                 | `42`                     |
| `num`        | Float/decimal     | `z.number()`                       | `123.45`                 |
| `boolean`    | True/false        | `z.boolean()`                      | `true`                   |
| `json`       | JSON object/array | `z.any()`                          | `{"key": "value"}`       |
| `datetime`   | ISO date/time     | `z.string()`                       | `"2025-01-01T12:00:00Z"` |
| `<TypeName>` | Custom type       | References type in `types` section | Type-specific            |

### Parameter Examples

**Required string parameter:**

```json
{
	"id": "param.mwlt0101.nam1",
	"type": "str",
	"name": "name",
	"description": "Wallet name",
	"is_required": true,
	"is_private": false,
	"is_array": false,
	"is_query": false,
	"query": false,
	"default": "",
	"value": ""
}
```

**Optional integer with default:**

```json
{
	"id": "param.mwlt0102.lim1",
	"type": "int",
	"name": "limit",
	"description": "Maximum results per page",
	"is_required": false,
	"is_private": false,
	"is_array": false,
	"is_query": false,
	"query": false,
	"default": "50",
	"value": ""
}
```

**Query parameter (for GET requests):**

```json
{
	"id": "param.mwlt0103.id01",
	"type": "str",
	"name": "id",
	"description": "Wallet ID",
	"is_required": true,
	"is_private": false,
	"is_array": false,
	"is_query": true,
	"query": true,
	"default": "",
	"value": ""
}
```

**JSON metadata parameter:**

```json
{
	"id": "param.mwlt0104.met1",
	"type": "json",
	"name": "metadata",
	"description": "Optional metadata",
	"is_required": false,
	"is_private": false,
	"is_array": false,
	"is_query": false,
	"query": false,
	"default": "",
	"value": ""
}
```

**Private password parameter:**

```json
{
	"id": "param.mwlt0105.pwd1",
	"type": "str",
	"name": "password",
	"description": "User password",
	"is_required": true,
	"is_private": true,
	"is_array": false,
	"is_query": false,
	"query": false,
	"default": "",
	"value": ""
}
```

### Parameter Validation Rules

- `id` must follow format: `param.<hash>.<hash>`
- `type` must be a valid type (`str`, `int`, `num`, `boolean`, `json`, `datetime`, or custom type name)
- For GET requests, set `is_query: true` and `query: true`
- For POST/PUT/PATCH, set `is_query: false` and `query: false`
- Sensitive data (passwords, secrets) must have `is_private: true`
- `default` must be a string, even for numbers: `"50"` not `50`

---

## Type Definitions

Types define data structures for responses and database tables.

### Type Field Reference

| Field         | Type    | Required | Description            | Example                                     |
| ------------- | ------- | -------- | ---------------------- | ------------------------------------------- |
| `id`          | string  | ✅       | Unique type ID         | `"typ.mwlt1000.wlt1"`                       |
| `name`        | string  | ✅       | Type name (PascalCase) | `"Wallet"`, `"WalletTransaction"`           |
| `description` | string  | ✅       | Brief description      | `"Wallet entity"`                           |
| `doc`         | string  | ✅       | Detailed documentation | Can be `""`                                 |
| `db_table`    | string  | ✅       | Database table name    | `"wallet_wallets"` or `""` for non-DB types |
| `db_clear`    | boolean | ✅       | Clear on reset?        | Usually `false`                             |
| `fields`      | array   | ✅       | Array of field objects | See field definitions below                 |

### Database Table Types vs Response Types

**Database-backed type** (creates a table):

```json
{
	"id": "typ.mwlt1000.wlt1",
	"name": "Wallet",
	"description": "User wallet entity",
	"doc": "Represents a user's wallet with balance tracking",
	"db_table": "wallet_wallets",
	"db_clear": false,
	"fields": [/* field definitions */]
}
```

**Response-only type** (no database table):

```json
{
	"id": "typ.mwlt1005.bal1",
	"name": "WalletBalance",
	"description": "Wallet balance response",
	"doc": "",
	"db_table": "",
	"db_clear": false,
	"fields": [/* field definitions */]
}
```

### Type Validation Rules

- `id` must follow format: `typ.<hash>.<hash>`
- `name` must be PascalCase with no spaces
- If `db_table` is set, it should follow format: `module_tablename` (snake_case)
- All database types should have `id` and `domain` fields
- Database types should use appropriate indexes

---

## Field Definitions

Fields define the properties of a type.

### Field Reference Table

| Field         | Type    | Required | Description             | Example                                      |
| ------------- | ------- | -------- | ----------------------- | -------------------------------------------- |
| `id`          | string  | ✅       | Unique field ID         | `"fld.mwlt1001.id01"`                        |
| `name`        | string  | ✅       | Field name (snake_case) | `"id"`, `"wallet_name"`                      |
| `type`        | string  | ✅       | Data type               | `"str"`, `"int"`, `"boolean"`, custom type   |
| `is_array`    | boolean | ✅       | Array field?            | `true` or `false`                            |
| `is_required` | boolean | ✅       | Required field?         | `true` or `false`                            |
| `is_private`  | boolean | ✅       | Sensitive data?         | `true` for passwords, encrypted data         |
| `description` | string  | ✅       | Field description       | `"Unique wallet identifier"`                 |
| `index`       | string  | ✅       | Index type              | `"u"` (unique), `"m"` (indexed), `""` (none) |
| `size`        | number  | ✅       | Max string length       | `64`, `255`, or `0` (unlimited)              |
| `min_length`  | number  | ✅       | Min string length       | Usually `0`                                  |

### Field Types

| Type         | Database Type        | Zod Schema         | Use Case               |
| ------------ | -------------------- | ------------------ | ---------------------- |
| `str`        | `text`               | `z.string()`       | Text, IDs, names       |
| `int`        | `integer`            | `z.number().int()` | Counts, quantities     |
| `num`        | `real`               | `z.number()`       | Decimals, balances     |
| `boolean`    | `integer` (0/1)      | `z.boolean()`      | Flags, status          |
| `json`       | `text` (JSON string) | `z.any()`          | Metadata, complex data |
| `datetime`   | `text` (ISO string)  | `z.string()`       | Timestamps             |
| `<TypeName>` | N/A (nested)         | Type reference     | Nested objects         |

### Index Types

| Index Value | Description        | Use Case                                |
| ----------- | ------------------ | --------------------------------------- |
| `"u"`       | Unique index       | Primary keys, unique identifiers        |
| `"m"`       | Multiple (indexed) | Foreign keys, frequently queried fields |
| `""`        | No index           | Rarely queried fields, large text       |

### Standard Field Patterns

**Primary ID field:**

```json
{
	"id": "fld.mwlt1001.id01",
	"name": "id",
	"type": "str",
	"is_array": false,
	"is_required": true,
	"is_private": false,
	"description": "Unique wallet identifier",
	"index": "u",
	"size": 64,
	"min_length": 0
}
```

**Domain field (multi-tenancy):**

```json
{
	"id": "fld.mwlt1002.dom1",
	"name": "domain",
	"type": "str",
	"is_array": false,
	"is_required": true,
	"is_private": false,
	"description": "Domain this wallet belongs to",
	"index": "m",
	"size": 64,
	"min_length": 0
}
```

**User reference:**

```json
{
	"id": "fld.mwlt1003.usr1",
	"name": "id_user",
	"type": "str",
	"is_array": false,
	"is_required": true,
	"is_private": false,
	"description": "User ID who owns this wallet",
	"index": "m",
	"size": 64,
	"min_length": 0
}
```

**Boolean field:**

```json
{
	"id": "fld.mwlt1004.act1",
	"name": "is_active",
	"type": "boolean",
	"is_array": false,
	"is_required": true,
	"is_private": false,
	"description": "Whether wallet is active",
	"index": "m",
	"size": 0,
	"min_length": 0
}
```

**Numeric field:**

```json
{
	"id": "fld.mwlt1005.bal1",
	"name": "balance",
	"type": "num",
	"is_array": false,
	"is_required": true,
	"is_private": false,
	"description": "Current wallet balance",
	"index": "",
	"size": 0,
	"min_length": 0
}
```

**JSON metadata field:**

```json
{
	"id": "fld.mwlt1006.met1",
	"name": "metadata",
	"type": "json",
	"is_array": false,
	"is_required": false,
	"is_private": false,
	"description": "Optional metadata",
	"index": "",
	"size": 0,
	"min_length": 0
}
```

**Nested type reference:**

```json
{
	"id": "fld.mwlt1007.inf1",
	"name": "wallet_info",
	"type": "Wallet",
	"is_array": false,
	"is_required": true,
	"is_private": false,
	"description": "Wallet details",
	"index": "",
	"size": 0,
	"min_length": 0
}
```

**Array of objects:**

```json
{
	"id": "fld.mwlt1008.trx1",
	"name": "transactions",
	"type": "WalletTransaction",
	"is_array": true,
	"is_required": false,
	"is_private": false,
	"description": "List of wallet transactions",
	"index": "",
	"size": 0,
	"min_length": 0
}
```

### Field Validation Rules

- `id` must follow format: `fld.<hash>.<hash>`
- `name` must be snake_case
- For database tables, always include: `id` (unique), `domain` (indexed)
- Use `index: "u"` only for truly unique fields (usually just `id`)
- Use `index: "m"` for foreign keys and frequently queried fields
- Set `size` to reasonable limits for strings (64 for IDs, 255 for names, 0 for unlimited)
- Sensitive fields must have `is_private: true`

---

## Permission Definitions

Permissions define what actions users can perform.

### Permission Field Reference

| Field         | Type   | Required | Description            | Example                    |
| ------------- | ------ | -------- | ---------------------- | -------------------------- |
| `id`          | string | ✅       | Unique permission ID   | `"perm.mwlt0001.crt1"`     |
| `name`        | string | ✅       | Permission name        | `"wallet.create"`          |
| `description` | string | ✅       | Permission description | `"Can create new wallets"` |

### Permission Naming Convention

**Format:** `module.action` (lowercase with dots)

**Common patterns:**

| Pattern           | Use Case                   | Example                            |
| ----------------- | -------------------------- | ---------------------------------- |
| `module.create`   | Create new records         | `wallet.create`                    |
| `module.edit`     | Modify existing records    | `wallet.edit`                      |
| `module.delete`   | Delete records             | `wallet.delete`                    |
| `module.list`     | View/list records          | `wallet.list`                      |
| `module.view`     | View single record         | `wallet.view`                      |
| `module.admin`    | Full module administration | `wallet.admin`                     |
| `module.<action>` | Custom actions             | `wallet.transfer`, `wallet.credit` |

### Permission Examples

```json
"permissions": {
  "perm.mwlt0001.crt1": {
    "id": "perm.mwlt0001.crt1",
    "name": "wallet.create",
    "description": "Can create new wallets"
  },
  "perm.mwlt0002.edt1": {
    "id": "perm.mwlt0002.edt1",
    "name": "wallet.edit",
    "description": "Can edit wallet details"
  },
  "perm.mwlt0003.del1": {
    "id": "perm.mwlt0003.del1",
    "name": "wallet.delete",
    "description": "Can delete wallets"
  },
  "perm.mwlt0004.lst1": {
    "id": "perm.mwlt0004.lst1",
    "name": "wallet.list",
    "description": "Can view wallet lists"
  },
  "perm.mwlt0005.crd1": {
    "id": "perm.mwlt0005.crd1",
    "name": "wallet.credit",
    "description": "Can credit funds to wallets"
  },
  "perm.mwlt0006.adm1": {
    "id": "perm.mwlt0006.adm1",
    "name": "wallet.admin",
    "description": "Full administrative access to all wallets"
  }
}
```

### Permission Validation Rules

- `id` must follow format: `perm.<hash>.<hash>`
- `name` must be lowercase with dots: `module.action`
- Use consistent naming across similar modules
- Create granular permissions for different operations
- Always include an admin permission for full access

---

## Event Definitions

Events notify other modules when actions occur.

### Event Field Reference

| Field         | Type   | Required | Description       | Example                           |
| ------------- | ------ | -------- | ----------------- | --------------------------------- |
| `id`          | string | ✅       | Unique event ID   | `"evt.mwlt0001.crt1"`             |
| `name`        | string | ✅       | Event name        | `"wallet.create"`                 |
| `description` | string | ✅       | Event description | `"A new wallet has been created"` |

### Event Naming Convention

**Format:** `module.action` (lowercase with dots)

**Common patterns:**

| Pattern           | Use Case       | Example                            |
| ----------------- | -------------- | ---------------------------------- |
| `module.create`   | Entity created | `wallet.create`                    |
| `module.update`   | Entity updated | `wallet.update`                    |
| `module.delete`   | Entity deleted | `wallet.delete`                    |
| `module.<action>` | Custom events  | `wallet.credit`, `wallet.transfer` |

### Event Examples

```json
"events": {
  "evt.mwlt0001.crt1": {
    "id": "evt.mwlt0001.crt1",
    "name": "wallet.create",
    "description": "A new wallet has been created"
  },
  "evt.mwlt0002.upd1": {
    "id": "evt.mwlt0002.upd1",
    "name": "wallet.update",
    "description": "A wallet has been updated"
  },
  "evt.mwlt0003.del1": {
    "id": "evt.mwlt0003.del1",
    "name": "wallet.delete",
    "description": "A wallet has been deleted"
  },
  "evt.mwlt0004.crd1": {
    "id": "evt.mwlt0004.crd1",
    "name": "wallet.credit",
    "description": "Funds have been credited to a wallet"
  },
  "evt.mwlt0005.dbt1": {
    "id": "evt.mwlt0005.dbt1",
    "name": "wallet.debit",
    "description": "Funds have been debited from a wallet"
  },
  "evt.mwlt0006.trf1": {
    "id": "evt.mwlt0006.trf1",
    "name": "wallet.transfer",
    "description": "A transfer between wallets has been completed"
  }
}
```

### Event Validation Rules

- `id` must follow format: `evt.<hash>.<hash>`
- `name` must be lowercase with dots: `module.action`
- Use consistent naming with permissions
- Emit events for all state-changing operations
- Document what data is included in the event payload

---

## Field Types Reference

Complete reference of all field types available:

| Type       | Description       | Database Type   | Zod Schema         | Size      | Index     | Example                  |
| ---------- | ----------------- | --------------- | ------------------ | --------- | --------- | ------------------------ |
| `str`      | String/text       | `text`          | `z.string()`       | Set limit | Any       | `"hello"`                |
| `int`      | Integer           | `integer`       | `z.number().int()` | `0`       | Any       | `42`                     |
| `num`      | Float/decimal     | `real`          | `z.number()`       | `0`       | Any       | `123.45`                 |
| `boolean`  | True/false        | `integer` (0/1) | `z.boolean()`      | `0`       | Any       | `true`                   |
| `json`     | JSON object/array | `text` (JSON)   | `z.any()`          | `0`       | `""` only | `{"key": "val"}`         |
| `datetime` | ISO date/time     | `text`          | `z.string()`       | `0`       | Any       | `"2025-01-01T12:00:00Z"` |
| `<Custom>` | Custom type       | N/A (nested)    | Type reference     | `0`       | `""` only | Type-specific            |

### Index Guidelines by Type

| Field Purpose               | Index | Reason                              |
| --------------------------- | ----- | ----------------------------------- |
| Primary ID                  | `"u"` | Unique identifier, frequent lookups |
| Foreign keys (user, domain) | `"m"` | Frequent joins and filters          |
| Status flags                | `"m"` | Often used in WHERE clauses         |
| Names, descriptions         | `""`  | Rarely used in queries              |
| Large text, metadata        | `""`  | Too large to index efficiently      |
| JSON fields                 | `""`  | Cannot index JSON data              |
| Nested types                | `""`  | Not stored in database              |

### Size Guidelines

| Field Type               | Recommended Size | Notes                      |
| ------------------------ | ---------------- | -------------------------- |
| IDs (module-generated)   | `64`             | Format: `prefix.hash.hash` |
| Domain names             | `64`             | Usually short identifiers  |
| User names               | `128`            | Reasonable username length |
| Emails                   | `255`            | Standard email max         |
| Short text (titles)      | `255`            | Standard short text        |
| Long text (descriptions) | `0`              | Unlimited                  |
| Numbers, booleans, dates | `0`              | Not applicable             |
| JSON                     | `0`              | Unlimited                  |

---

## Validation Rules

### ID Format Rules

| Entity Type | Format                | Pattern       | Example               |
| ----------- | --------------------- | ------------- | --------------------- |
| Module      | `mod.<hash>.<hash>`   | 3 parts, dots | `mod.mjp8hzhj.821m`   |
| Endpoint    | `endp.<hash>.<hash>`  | 3 parts, dots | `endp.mwlt0100.crt1`  |
| Parameter   | `param.<hash>.<hash>` | 3 parts, dots | `param.mwlt0101.nam1` |
| Type        | `typ.<hash>.<hash>`   | 3 parts, dots | `typ.mwlt1000.wlt1`   |
| Field       | `fld.<hash>.<hash>`   | 3 parts, dots | `fld.mwlt1001.id01`   |
| Permission  | `perm.<hash>.<hash>`  | 3 parts, dots | `perm.mwlt0001.crt1`  |
| Event       | `evt.<hash>.<hash>`   | 3 parts, dots | `evt.mwlt0001.crt1`   |
| User        | `user.<hash>.<hash>`  | 3 parts, dots | `user.system.admin`   |

### Naming Convention Rules

| Element         | Convention           | Valid                    | Invalid                           |
| --------------- | -------------------- | ------------------------ | --------------------------------- |
| Module name     | PascalCase           | `Wallet`, `UserAuth`     | `wallet`, `user_auth`             |
| Type name       | PascalCase           | `WalletTransaction`      | `wallet_transaction`              |
| Field name      | snake_case           | `id_user`, `wallet_name` | `idUser`, `WalletName`            |
| Permission name | lowercase.dot        | `wallet.create`          | `Wallet.Create`, `wallet_create`  |
| Event name      | lowercase.dot        | `wallet.create`          | `Wallet.Create`, `wallet_create`  |
| Table name      | lowercase_underscore | `wallet_wallets`         | `WalletWallets`, `wallet.wallets` |

### Required Field Rules

| Type              | Always Required Fields    | Index                          |
| ----------------- | ------------------------- | ------------------------------ |
| Database type     | `id`, `domain`            | `id` = `"u"`, `domain` = `"m"` |
| User-owned entity | `id`, `domain`, `id_user` | All indexed (`"u"` or `"m"`)   |
| Response type     | Varies                    | N/A                            |

**`created` / `updated` are NOT automatic.** The generator does not add audit
fields for you, despite other docs mentioning them. Every DB-backed type must
declare `created` and `updated` explicitly as `"type": "datetime"` fields, same
as `id`/`domain`. Confirmed by inspecting `user.json`'s own `UserInvite` /
`UserVerificationToken` types - they declare `created`/`updated` explicitly too.
**Never** name them `created_at` / `updated_at`.

### `is_required` on a combined add/update endpoint

If one endpoint handles both create (`id` omitted) and partial update (`id`
given) - the standard `xxx/add` pattern - do **not** mark create-only-required
fields (e.g. `domain`, `ragione_sociale`) as `is_required: true` in the JSON.
That makes the generated Zod schema reject every partial-update call that omits
them. Mirror `user.json`'s real `/user/add` endpoint: every field except `id`
is `is_required: false` at the JSON/Zod level, and the create-path business
rule ("these fields must be present when `id` is absent") is enforced by hand
inside `f2c_start` (see `METHOD_IMPLEMENTATION.md`), not by the schema.
Symptom if you get this wrong: a "partial update" test sends
`{ id, piano: 'pro' }` and gets a `400 VALIDATION_ERROR` before your code even
runs.

### Permission Mapping Rules

| Rule                    | Valid                                                | Invalid                              |
| ----------------------- | ---------------------------------------------------- | ------------------------------------ |
| Exactly one `true`      | `{"public": false, "logged": true, "admins": false}` | `{"public": true, "logged": true}`   |
| All others `false`      | `{"perm.x": true, "perm.y": false}`                  | `{"perm.x": true, "perm.y": true}`   |
| At least one key `true` | `{"admins": true}`                                   | `{"public": false, "logged": false}` |

---

## Complete Examples

### Example 1: Simple CRUD Module (Credentials)

```json
{
	"id": "mod.mcrd0000.main",
	"name": "Credentials",
	"doc": "Manages user credentials for external services",
	"short_descr": "Credentials management module",
	"version": 1,
	"modified": 0,
	"locked_by": "",
	"endpoints": {
		"endp.mcrd0100.crt1": {
			"id": "endp.mcrd0100.crt1",
			"method": "POST",
			"url": "/credentials/add",
			"short_descr": "Add new credentials",
			"description": "Create new credentials for an external service",
			"parameters": [
				{
					"id": "param.mcrd0101.svc1",
					"type": "str",
					"name": "service",
					"description": "Service name",
					"is_required": true,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				},
				{
					"id": "param.mcrd0102.usr1",
					"type": "str",
					"name": "username",
					"description": "Username for service",
					"is_required": true,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				},
				{
					"id": "param.mcrd0103.pwd1",
					"type": "str",
					"name": "password",
					"description": "Password for service",
					"is_required": true,
					"is_private": true,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				}
			],
			"returnType": "Credential",
			"returnName": "",
			"is_array": false,
			"permissions": {
				"public": false,
				"logged": true,
				"admins": false
			}
		},
		"endp.mcrd0200.lst1": {
			"id": "endp.mcrd0200.lst1",
			"method": "GET",
			"url": "/credentials/list",
			"short_descr": "List credentials",
			"description": "List all credentials for the current user",
			"parameters": [],
			"returnType": "Credential",
			"returnName": "",
			"is_array": true,
			"permissions": {
				"public": false,
				"logged": true,
				"admins": false
			}
		},
		"endp.mcrd0300.del1": {
			"id": "endp.mcrd0300.del1",
			"method": "DELETE",
			"url": "/credentials/del",
			"short_descr": "Delete credentials",
			"description": "Delete credentials by ID",
			"parameters": [
				{
					"id": "param.mcrd0301.id01",
					"type": "str",
					"name": "id",
					"description": "Credential ID",
					"is_required": true,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				}
			],
			"returnType": "Credential",
			"returnName": "",
			"is_array": false,
			"permissions": {
				"public": false,
				"logged": true,
				"admins": false
			}
		}
	},
	"functions": {},
	"enums": {},
	"types": {
		"typ.mcrd1000.crd1": {
			"id": "typ.mcrd1000.crd1",
			"name": "Credential",
			"description": "User credential entity",
			"doc": "Stores encrypted credentials for external services",
			"db_table": "credentials_credentials",
			"db_clear": false,
			"fields": [
				{
					"id": "fld.mcrd1001.id01",
					"name": "id",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Unique credential identifier",
					"index": "u",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.mcrd1002.dom1",
					"name": "domain",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Domain this credential belongs to",
					"index": "m",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.mcrd1003.usr1",
					"name": "id_user",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "User who owns this credential",
					"index": "m",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.mcrd1004.svc1",
					"name": "service",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Service name",
					"index": "m",
					"size": 128,
					"min_length": 0
				},
				{
					"id": "fld.mcrd1005.usn1",
					"name": "username",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Username for service",
					"index": "",
					"size": 255,
					"min_length": 0
				},
				{
					"id": "fld.mcrd1006.pwd1",
					"name": "password",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": true,
					"description": "Encrypted password",
					"index": "",
					"size": 0,
					"min_length": 0
				}
			]
		}
	},
	"permissions": {},
	"events": {
		"evt.mcrd0001.crt1": {
			"id": "evt.mcrd0001.crt1",
			"name": "credentials.create",
			"description": "New credentials have been created"
		},
		"evt.mcrd0002.del1": {
			"id": "evt.mcrd0002.del1",
			"name": "credentials.delete",
			"description": "Credentials have been deleted"
		}
	},
	"id_owner": "user.7146fb62e9a458952246479bcca935f7.4hue",
	"domain": "os3"
}
```

### Example 2: Complex Module with Transactions (Wallet)

```json
{
	"id": "mod.mwlt0000.main",
	"name": "Wallet",
	"doc": "Manages user wallets with multi-currency support, credit/debit operations, and transfer capabilities. Tracks all transactions and maintains accurate balance history.",
	"short_descr": "Wallet management module",
	"version": 1,
	"modified": 0,
	"locked_by": "",
	"endpoints": {
		"endp.mwlt0100.crt1": {
			"id": "endp.mwlt0100.crt1",
			"method": "POST",
			"url": "/wallet/create",
			"short_descr": "Create a new wallet",
			"description": "Creates a new wallet for the authenticated user with specified currency code",
			"parameters": [
				{
					"id": "param.mwlt0101.nam1",
					"type": "str",
					"name": "name",
					"description": "Wallet name",
					"is_required": true,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				},
				{
					"id": "param.mwlt0102.cur1",
					"type": "str",
					"name": "currency",
					"description": "Currency code (USD, EUR, etc)",
					"is_required": true,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "USD",
					"value": ""
				}
			],
			"returnType": "Wallet",
			"returnName": "",
			"is_array": false,
			"permissions": {
				"public": false,
				"logged": false,
				"admins": false,
				"perm.mwlt0001.crt1": true
			}
		},
		"endp.mwlt0200.crd1": {
			"id": "endp.mwlt0200.crd1",
			"method": "POST",
			"url": "/wallet/credit",
			"short_descr": "Credit funds to wallet",
			"description": "Add funds to a wallet and create a transaction record",
			"parameters": [
				{
					"id": "param.mwlt0201.wid1",
					"type": "str",
					"name": "id_wallet",
					"description": "Wallet ID",
					"is_required": true,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				},
				{
					"id": "param.mwlt0202.amt1",
					"type": "num",
					"name": "amount",
					"description": "Amount to credit",
					"is_required": true,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				},
				{
					"id": "param.mwlt0203.dsc1",
					"type": "str",
					"name": "description",
					"description": "Transaction description",
					"is_required": false,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				}
			],
			"returnType": "Wallet",
			"returnName": "",
			"is_array": false,
			"permissions": {
				"public": false,
				"logged": false,
				"admins": false,
				"perm.mwlt0005.crd1": true
			}
		},
		"endp.mwlt0300.trf1": {
			"id": "endp.mwlt0300.trf1",
			"method": "POST",
			"url": "/wallet/transfer",
			"short_descr": "Transfer between wallets",
			"description": "Transfer funds from one wallet to another",
			"parameters": [
				{
					"id": "param.mwlt0301.src1",
					"type": "str",
					"name": "id_wallet_from",
					"description": "Source wallet ID",
					"is_required": true,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				},
				{
					"id": "param.mwlt0302.dst1",
					"type": "str",
					"name": "id_wallet_to",
					"description": "Destination wallet ID",
					"is_required": true,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				},
				{
					"id": "param.mwlt0303.amt1",
					"type": "num",
					"name": "amount",
					"description": "Amount to transfer",
					"is_required": true,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				}
			],
			"returnType": "WalletTransferResult",
			"returnName": "",
			"is_array": false,
			"permissions": {
				"public": false,
				"logged": false,
				"admins": false,
				"perm.mwlt0007.trf1": true
			}
		}
	},
	"functions": {},
	"enums": {},
	"types": {
		"typ.mwlt1000.wlt1": {
			"id": "typ.mwlt1000.wlt1",
			"name": "Wallet",
			"description": "User wallet entity",
			"doc": "Stores wallet information including balance and currency",
			"db_table": "wallet_wallets",
			"db_clear": false,
			"fields": [
				{
					"id": "fld.mwlt1001.id01",
					"name": "id",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Unique wallet identifier",
					"index": "u",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1002.dom1",
					"name": "domain",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Domain this wallet belongs to",
					"index": "m",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1003.usr1",
					"name": "id_user",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "User who owns this wallet",
					"index": "m",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1004.nam1",
					"name": "name",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Wallet name",
					"index": "",
					"size": 255,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1005.cur1",
					"name": "currency",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Currency code",
					"index": "m",
					"size": 10,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1006.bal1",
					"name": "balance",
					"type": "num",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Current balance",
					"index": "",
					"size": 0,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1007.act1",
					"name": "is_active",
					"type": "boolean",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Whether wallet is active",
					"index": "m",
					"size": 0,
					"min_length": 0
				}
			]
		},
		"typ.mwlt1100.trx1": {
			"id": "typ.mwlt1100.trx1",
			"name": "WalletTransaction",
			"description": "Wallet transaction record",
			"doc": "Tracks all wallet transactions",
			"db_table": "wallet_transactions",
			"db_clear": false,
			"fields": [
				{
					"id": "fld.mwlt1101.id01",
					"name": "id",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Transaction ID",
					"index": "u",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1102.dom1",
					"name": "domain",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Domain",
					"index": "m",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1103.wid1",
					"name": "id_wallet",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Wallet ID",
					"index": "m",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1104.typ1",
					"name": "type",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Transaction type (credit/debit/transfer)",
					"index": "m",
					"size": 32,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1105.amt1",
					"name": "amount",
					"type": "num",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Transaction amount",
					"index": "",
					"size": 0,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1106.dsc1",
					"name": "description",
					"type": "str",
					"is_array": false,
					"is_required": false,
					"is_private": false,
					"description": "Transaction description",
					"index": "",
					"size": 0,
					"min_length": 0
				}
			]
		},
		"typ.mwlt1200.trf1": {
			"id": "typ.mwlt1200.trf1",
			"name": "WalletTransferResult",
			"description": "Transfer operation result",
			"doc": "",
			"db_table": "",
			"db_clear": false,
			"fields": [
				{
					"id": "fld.mwlt1201.src1",
					"name": "wallet_from",
					"type": "Wallet",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Source wallet",
					"index": "",
					"size": 0,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1202.dst1",
					"name": "wallet_to",
					"type": "Wallet",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Destination wallet",
					"index": "",
					"size": 0,
					"min_length": 0
				},
				{
					"id": "fld.mwlt1203.amt1",
					"name": "amount",
					"type": "num",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Transfer amount",
					"index": "",
					"size": 0,
					"min_length": 0
				}
			]
		}
	},
	"permissions": {
		"perm.mwlt0001.crt1": {
			"id": "perm.mwlt0001.crt1",
			"name": "wallet.create",
			"description": "Can create new wallets"
		},
		"perm.mwlt0002.edt1": {
			"id": "perm.mwlt0002.edt1",
			"name": "wallet.edit",
			"description": "Can edit wallet details"
		},
		"perm.mwlt0003.del1": {
			"id": "perm.mwlt0003.del1",
			"name": "wallet.delete",
			"description": "Can delete wallets"
		},
		"perm.mwlt0004.lst1": {
			"id": "perm.mwlt0004.lst1",
			"name": "wallet.list",
			"description": "Can view wallet lists"
		},
		"perm.mwlt0005.crd1": {
			"id": "perm.mwlt0005.crd1",
			"name": "wallet.credit",
			"description": "Can credit funds to wallets"
		},
		"perm.mwlt0006.dbt1": {
			"id": "perm.mwlt0006.dbt1",
			"name": "wallet.debit",
			"description": "Can debit funds from wallets"
		},
		"perm.mwlt0007.trf1": {
			"id": "perm.mwlt0007.trf1",
			"name": "wallet.transfer",
			"description": "Can transfer funds between wallets"
		},
		"perm.mwlt0008.adm1": {
			"id": "perm.mwlt0008.adm1",
			"name": "wallet.admin",
			"description": "Full administrative access to all wallets"
		}
	},
	"events": {
		"evt.mwlt0001.crt1": {
			"id": "evt.mwlt0001.crt1",
			"name": "wallet.create",
			"description": "A new wallet has been created"
		},
		"evt.mwlt0002.upd1": {
			"id": "evt.mwlt0002.upd1",
			"name": "wallet.update",
			"description": "A wallet has been updated"
		},
		"evt.mwlt0003.del1": {
			"id": "evt.mwlt0003.del1",
			"name": "wallet.delete",
			"description": "A wallet has been deleted"
		},
		"evt.mwlt0004.crd1": {
			"id": "evt.mwlt0004.crd1",
			"name": "wallet.credit",
			"description": "Funds have been credited to a wallet"
		},
		"evt.mwlt0005.dbt1": {
			"id": "evt.mwlt0005.dbt1",
			"name": "wallet.debit",
			"description": "Funds have been debited from a wallet"
		},
		"evt.mwlt0006.trf1": {
			"id": "evt.mwlt0006.trf1",
			"name": "wallet.transfer",
			"description": "A transfer between wallets has been completed"
		}
	},
	"id_owner": "user.7146fb62e9a458952246479bcca935f7.4hue",
	"domain": "os3"
}
```

### Example 3: Upload Module (File Operations)

```json
{
	"id": "mod.mjp8hzhj.821m",
	"name": "Upload",
	"doc": "Handles file uploads with storage management, metadata tracking, and access control. Supports multiple storage backends and automatic cleanup.",
	"short_descr": "File upload and storage management",
	"version": 1,
	"modified": 0,
	"locked_by": "",
	"endpoints": {
		"endp.upload.upload": {
			"id": "endp.upload.upload",
			"method": "POST",
			"url": "/upload/upload",
			"short_descr": "Upload a file",
			"description": "Upload a file with optional metadata. Returns file information including URL.",
			"parameters": [
				{
					"id": "param.upload.file",
					"type": "str",
					"name": "file",
					"description": "File data (multipart)",
					"is_required": true,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				},
				{
					"id": "param.upload.meta",
					"type": "json",
					"name": "metadata",
					"description": "Optional metadata",
					"is_required": false,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				}
			],
			"returnType": "UploadFile",
			"returnName": "",
			"is_array": false,
			"permissions": {
				"public": false,
				"logged": true,
				"admins": false
			}
		},
		"endp.upload.list": {
			"id": "endp.upload.list",
			"method": "GET",
			"url": "/upload/list",
			"short_descr": "List uploaded files",
			"description": "List all files uploaded by the current user",
			"parameters": [],
			"returnType": "UploadFile",
			"returnName": "",
			"is_array": true,
			"permissions": {
				"public": false,
				"logged": true,
				"admins": false
			}
		},
		"endp.upload.delete": {
			"id": "endp.upload.delete",
			"method": "DELETE",
			"url": "/upload/del",
			"short_descr": "Delete a file",
			"description": "Delete an uploaded file by ID",
			"parameters": [
				{
					"id": "param.upload.id",
					"type": "str",
					"name": "id",
					"description": "File ID",
					"is_required": true,
					"is_private": false,
					"is_array": false,
					"is_query": false,
					"query": false,
					"default": "",
					"value": ""
				}
			],
			"returnType": "UploadFile",
			"returnName": "",
			"is_array": false,
			"permissions": {
				"public": false,
				"logged": true,
				"admins": false
			}
		}
	},
	"functions": {},
	"enums": {},
	"types": {
		"typ.upload.file": {
			"id": "typ.upload.file",
			"name": "UploadFile",
			"description": "Uploaded file entity",
			"doc": "Stores uploaded file metadata and location",
			"db_table": "upload_files",
			"db_clear": false,
			"fields": [
				{
					"id": "fld.upload.id",
					"name": "id",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Unique file identifier",
					"index": "u",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.upload.domain",
					"name": "domain",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Domain this file belongs to",
					"index": "m",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.upload.user",
					"name": "id_user",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "User who uploaded this file",
					"index": "m",
					"size": 64,
					"min_length": 0
				},
				{
					"id": "fld.upload.filename",
					"name": "filename",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "Original filename",
					"index": "",
					"size": 255,
					"min_length": 0
				},
				{
					"id": "fld.upload.mimetype",
					"name": "mime_type",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "File MIME type",
					"index": "m",
					"size": 128,
					"min_length": 0
				},
				{
					"id": "fld.upload.size",
					"name": "size",
					"type": "int",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "File size in bytes",
					"index": "",
					"size": 0,
					"min_length": 0
				},
				{
					"id": "fld.upload.url",
					"name": "url",
					"type": "str",
					"is_array": false,
					"is_required": true,
					"is_private": false,
					"description": "File URL",
					"index": "",
					"size": 0,
					"min_length": 0
				},
				{
					"id": "fld.upload.metadata",
					"name": "metadata",
					"type": "json",
					"is_array": false,
					"is_required": false,
					"is_private": false,
					"description": "Optional metadata",
					"index": "",
					"size": 0,
					"min_length": 0
				}
			]
		}
	},
	"permissions": {},
	"events": {
		"evt.upload.uploaded": {
			"id": "evt.upload.uploaded",
			"name": "upload.uploaded",
			"description": "A file has been uploaded"
		},
		"evt.upload.deleted": {
			"id": "evt.upload.deleted",
			"name": "upload.deleted",
			"description": "A file has been deleted"
		}
	},
	"id_owner": "user.7146fb62e9a458952246479bcca935f7.4hue",
	"domain": "os3"
}
```

---

## Validation Checklist

Before finalizing your module JSON, verify all items:

### ID and Naming

- [ ] All IDs are unique and follow format conventions (`mod.`, `endp.`, `param.`, etc.)
- [ ] Module `name` is PascalCase (e.g., `Wallet`, `UserAuth`)
- [ ] Type names are PascalCase (e.g., `WalletTransaction`)
- [ ] Field names are snake_case (e.g., `id_user`, `wallet_name`)
- [ ] Permission names are lowercase.dot (e.g., `wallet.create`)
- [ ] Event names are lowercase.dot (e.g., `wallet.create`)
- [ ] Table names are lowercase_underscore (e.g., `wallet_wallets`)

### Required Fields

- [ ] All database types have `id` field with `index: "u"`
- [ ] All database types have `domain` field with `index: "m"`
- [ ] User-owned entities have `id_user` field with `index: "m"`
- [ ] All `description` fields are filled
- [ ] All `doc` fields are present (can be empty `""`)

### Types and Schemas

- [ ] String fields have appropriate `size` limits (64 for IDs, 255 for names, 0 for unlimited)
- [ ] Index flags are set correctly (`"u"` for unique, `"m"` for indexed, `""` for none)
- [ ] Sensitive fields have `is_private: true`
- [ ] All required fields have `is_required: true`
- [ ] Parameter types match field types
- [ ] Return types reference existing type names in `types` section

### Endpoints

- [ ] Each endpoint has exactly one permission set to `true`
- [ ] All others permissions are `false`
- [ ] HTTP methods match endpoint purpose (GET for reads, POST for creates, etc.)
- [ ] URLs follow `/module/entity/action` or `/module/action` pattern
- [ ] `is_array` is set correctly for list endpoints
- [ ] GET requests have `is_query: true` for all parameters
- [ ] POST/PUT/PATCH requests have `is_query: false` for all parameters

### Permissions and Events

- [ ] Permission IDs follow format: `perm.<hash>.<hash>`
- [ ] Event IDs follow format: `evt.<hash>.<hash>`
- [ ] Permission names use `module.action` format
- [ ] Event names use `module.action` format
- [ ] Events are defined for all state-changing operations
- [ ] Module has an admin permission if needed

### Metadata

- [ ] Module has valid `id_owner` (format: `user.<hash>.<hash>`)
- [ ] Module has valid `domain` (e.g., `"system"`, `"os3"`)
- [ ] Version is set to positive integer
- [ ] `functions` and `enums` are present (set to `{}`)

---

## Related Documentation

When working with modules, you'll need these additional guides:

| Task                       | Read This Document          | Location                                       |
| -------------------------- | --------------------------- | ---------------------------------------------- |
| **Organize module files**  | Module Organization Guide   | `/work/agent/backend/MODULE_CREATION.md`       |
| **Implement method logic** | Method Implementation Guide | `/work/agent/backend/METHOD_IMPLEMENTATION.md` |
| **Write ResTest tests**    | ResTest Testing Guide       | `/work/agent/backend/TESTING_RESTEST.md`       |
| **Core API reference**     | Backend API Reference       | `/work/agent/backend/API_REFERENCE.md`         |

---

## Quick Reference Tables

### ID Prefix Reference

| Prefix   | Entity     | Example               |
| -------- | ---------- | --------------------- |
| `mod.`   | Module     | `mod.mjp8hzhj.821m`   |
| `endp.`  | Endpoint   | `endp.mwlt0100.crt1`  |
| `param.` | Parameter  | `param.mwlt0101.nam1` |
| `typ.`   | Type       | `typ.mwlt1000.wlt1`   |
| `fld.`   | Field      | `fld.mwlt1001.id01`   |
| `perm.`  | Permission | `perm.mwlt0001.crt1`  |
| `evt.`   | Event      | `evt.mwlt0001.crt1`   |
| `user.`  | User       | `user.system.admin`   |

### Standard Database Fields

Every database type should include these fields:

| Field Name | Type       | Index | Size | Description                                              |
| ---------- | ---------- | ----- | ---- | -------------------------------------------------------- |
| `id`       | `str`      | `"u"` | 64   | Unique identifier                                        |
| `domain`   | `str`      | `"m"` | 64   | Multi-tenancy domain                                     |
| `id_user`  | `str`      | `"m"` | 64   | Owner user ID (if user-owned)                            |
| `created`  | `datetime` | `""`  | 0    | Record creation date - declare explicitly, not automatic |
| `updated`  | `datetime` | `""`  | 0    | Record update date - declare explicitly, not automatic   |

### Common CRUD Endpoints

| Action | Method   | URL              | Return Type | Returns Array |
| ------ | -------- | ---------------- | ----------- | ------------- |
| Create | `POST`   | `/module/create` | Entity      | `false`       |
| List   | `GET`    | `/module/list`   | Entity      | `true`        |
| Get    | `GET`    | `/module/get`    | Entity      | `false`       |
| Update | `PATCH`  | `/module/edit`   | Entity      | `false`       |
| Delete | `DELETE` | `/module/del`    | Entity      | `false`       |

---

## Example Modules to Study

Study these real module JSON files for reference:

| Module          | Location                                         | Complexity | Key Features                            |
| --------------- | ------------------------------------------------ | ---------- | --------------------------------------- |
| **Credentials** | `@backend/modules/work/modules/credentials.json` | Simple     | Basic CRUD, minimal fields              |
| **Upload**      | `@backend/modules/work/modules/upload.json`      | Medium     | File operations, metadata               |
| **Wallet**      | `@backend/modules/work/modules/wallet.json`      | Complex    | Multiple types, transactions, transfers |

---

## Summary

This document provides a complete reference for creating and validating LiWE3 module JSON definitions. The JSON file serves as the single source of truth for:

- **API endpoint definitions** - Methods, URLs, parameters, responses
- **Type schemas** - Database tables and response structures
- **Permission systems** - Access control definitions
- **Event definitions** - Inter-module communication contracts

Use the Quick Template to start, follow the validation checklist before finalizing, and refer to the example modules for real-world patterns.
