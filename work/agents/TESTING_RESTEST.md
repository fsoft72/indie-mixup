# ResTest Testing Framework Guide

## When to Read This File

**Read this guide when you need to:**

- ✅ Write or create API tests for a LiWE3 backend module
- ✅ Understand the ResTest JSON-based testing framework
- ✅ Test CRUD operations, relationships, or cascading deletes
- ✅ Verify event emission and inter-module communication
- ✅ Debug or troubleshoot failing ResTest tests
- ✅ Understand test file structure and organization

**Prerequisites:**

- Module JSON definition exists (see `LIWE3_MODULE_JSON.md`)
- Module implementation is complete (see `LIWE3_METHOD_IMPLEMENTATION_GUIDE.md`)
- Basic understanding of HTTP APIs and JSON

---

## Quick Start Template

### Minimum Module Test Setup

Every module MUST have this file structure:

```
app/modules/YOUR_MODULE/backend/
└── tests/restest/
    ├── all.json                    # Entry point (REQUIRED)
    └── YOUR_FEATURE.tests.json     # Feature tests
```

Note: custom app modules live under `app/modules/<mod>/backend/tests/restest/`; LiWE3 framework modules (`user`, `tags`, `comment`, etc.) live under `liwe3/modules/<mod>/backend/tests/restest/`.

**Relative path depth depends on where your module lives.** Compute it from
`<your-module>/backend/tests/restest/` to the target file, `backend/` segment
included in the target path too. A module under `app/modules/<name>/` is 6
levels of `../` to reach the repo root, then down into
`liwe3/modules/user/backend/tests/restest/admin-login.tests.json`. A module
living under `liwe3/modules/*` instead only needs 4 levels, since source and
target share the `liwe3/modules/` parent - don't copy the shorter path
verbatim for an `app/modules/*` module.

### Entry Point Template (`all.json`)

**CRITICAL**: Every module MUST import admin login, then enter test mode, before running tests. Example for a module under `app/modules/<name>/` (6 levels of `../`):

```json
{
	"system": {
		"base_url": "http://localhost:8787",
		"authorization_template": "Bearer %(token)s"
	},
	"actions": [
		{
			"action": "include",
			"filename": "../../../../../../liwe3/modules/user/backend/tests/restest/admin-login.tests.json",
			"exec": true
		},
		{
			"action": "include",
			"filename": "../../../../../../liwe3/modules/system/backend/tests/restest/test-enter.tests.json",
			"exec": true,
			"show_filename": true
		},
		{
			"action": "include",
			"filename": "your-feature.tests.json",
			"exec": true
		}
	]
}
```

For a module living under `liwe3/modules/*` itself, the shorter 4-level form applies instead: `"../../../user/backend/tests/restest/admin-login.tests.json"`.

The `test-enter.tests.json` include switches the worker to a disposable test database (`DB_TEST`), wipes it clean, reseeds default data, and replaces `%(token)s` and `%(admin_token)s` with a new admin session valid against the test DB. This protects your dev database from test side effects. It uses `"run-once": true` so it only executes once even if included from multiple test files.

### Basic Test Template

```json
{
	"actions": [
		{
			"title": "Get initial count",
			"method": "GET",
			"url": "/api/items/list",
			"fields": [["#data", "init_count"]]
		},
		{
			"title": "Create item",
			"method": "POST",
			"url": "/api/item/add",
			"body": {
				"name": "Test Item"
			},
			"tests": [
				{ "field": "ok", "value": true }
			],
			"fields": [["data.id", "item_id"]]
		},
		{
			"title": "Verify item was created",
			"method": "GET",
			"url": "/api/items/list",
			"tests": [
				{
					"field": "#data",
					"value": "${init_count + 1}"
				}
			]
		},
		{
			"title": "Delete item",
			"method": "DELETE",
			"url": "/api/item/del",
			"body": {
				"id": "%(item_id)s"
			},
			"tests": [
				{ "field": "ok", "value": true }
			]
		}
	]
}
```

---

## ResTest Framework Overview

**ResTest** is a JSON-based API testing framework for the LiWE3 monorepo that provides:

| Feature                | Description                                     |
| ---------------------- | ----------------------------------------------- |
| **Declarative Tests**  | Define tests in JSON without writing code       |
| **Variable Storage**   | Extract and reuse response data across requests |
| **Expression Support** | Use JavaScript expressions for dynamic values   |
| **HTTP Actions**       | Make authenticated API requests                 |
| **Assertions**         | Validate response data with flexible tests      |
| **Modular Design**     | Include and reuse test files                    |
| **Event Testing**      | Verify inter-module communication               |

### Core Philosophy

1. **Store → Test → Cleanup Pattern**: Always capture initial state, perform operations, verify results, clean up
2. **Authentication First**: Every module imports admin login for authenticated requests
3. **Comprehensive Coverage**: Test complete workflows (Create → Read → Update → Delete)
4. **Event Verification**: Test side effects in other modules

---

## File Structure

### Directory Organization

| Location                                                          | Purpose                                              | Required              |
| ----------------------------------------------------------------- | ---------------------------------------------------- | --------------------- |
| `app/modules/YOUR_MODULE/backend/tests/restest/`                  | Module test directory                                | ✅ Yes                |
| `all.json`                                                        | Entry point, imports admin login and test files      | ✅ Yes                |
| `*.tests.json`                                                    | Individual test suites                               | ✅ Yes (at least one) |
| `liwe3/modules/user/backend/tests/restest/admin-login.tests.json` | Admin authentication setup (imported by all modules) | ✅ Yes (imported)     |

### Entry Point File (`all.json`)

Path shown here is illustrative only - see "Relative path depth depends on
where your module lives" above for the actual level count and the `backend/`
segment your module needs:

```json
{
	"system": {
		"base_url": "http://localhost:8787",
		"authorization_template": "Bearer %(token)s"
	},
	"actions": [
		{
			"action": "include",
			"filename": "<computed-path>/user/backend/tests/restest/admin-login.tests.json",
			"exec": true
		},
		{
			"action": "include",
			"filename": "basic-crud.tests.json",
			"exec": true
		},
		{
			"action": "include",
			"filename": "relationships.tests.json",
			"exec": true
		}
	]
}
```

### System Configuration

| Field                    | Description                       | Example                   |
| ------------------------ | --------------------------------- | ------------------------- |
| `base_url`               | Base URL for all API requests     | `"http://localhost:8787"` |
| `authorization_template` | Template for Authorization header | `"Bearer %(token)s"`      |

### Run-Once Flag

Used in `admin-login.tests.json` to ensure it only executes once when included multiple times:

```json
{
  "run-once": true,
  "actions": [...]
}
```

---

## Action Types

### Action Types Table

| Action Type      | Purpose                                        | Required Fields    | Example Use Case                     |
| ---------------- | ---------------------------------------------- | ------------------ | ------------------------------------ |
| **HTTP Request** | Make API request, store response, test results | `method`, `url`    | Create/read/update/delete operations |
| **include**      | Import and execute another test file           | `filename`, `exec` | Import admin-login, organize tests   |
| **batch_set**    | Create named reusable action groups            | `name`, `actions`  | Token switching, common setup        |
| **copy**         | Copy variable to another variable              | `from`, `to`       | Switch between user tokens           |
| **dump**         | Debug - print variables to console             | `fields`           | Debugging test failures              |

### 1. HTTP Request Action

The most common action type for making API requests.

```json
{
	"title": "Optional description of what this does",
	"method": "POST",
	"url": "/api/comment/add",
	"auth": true,
	"body": {
		"module": "test",
		"comment": "Hello World"
	},
	"params": {
		"query_param": "value"
	},
	"fields": [
		["data.id", "created_comment_id"]
	],
	"tests": [
		{
			"field": "ok",
			"value": true
		}
	]
}
```

#### HTTP Action Fields

| Field    | Type    | Required | Description                                          |
| -------- | ------- | -------- | ---------------------------------------------------- |
| `title`  | string  | No       | Human-readable description                           |
| `method` | string  | Yes      | HTTP method: GET, POST, PUT, DELETE, PATCH           |
| `url`    | string  | Yes      | API endpoint (relative to `base_url`)                |
| `auth`   | boolean | No       | Set to `false` to skip auth header (default: `true`) |
| `body`   | object  | No       | Request body (for POST/PUT/PATCH)                    |
| `params` | object  | No       | URL query parameters                                 |
| `fields` | array   | No       | Extract response data: `[["path", "var_name"]]`      |
| `tests`  | array   | No       | Assertions to validate response                      |

### 2. Include Action

Import and execute another test file.

```json
{
	"action": "include",
	"filename": "../../../user/tests/restest/admin-login.tests.json",
	"exec": true
}
```

#### Include Action Fields

| Field      | Type    | Required | Description                          |
| ---------- | ------- | -------- | ------------------------------------ |
| `action`   | string  | Yes      | Must be `"include"`                  |
| `filename` | string  | Yes      | Relative path to test file           |
| `exec`     | boolean | Yes      | Set to `true` to execute immediately |

### 3. Batch Set Action

Create named reusable action groups.

```json
{
	"action": "batch_set",
	"name": "switch_admin",
	"actions": [
		{
			"title": "Switching to Admin",
			"action": "copy",
			"from": "admin_token",
			"to": "token"
		}
	]
}
```

#### Batch Set Fields

| Field     | Type   | Required | Description                              |
| --------- | ------ | -------- | ---------------------------------------- |
| `action`  | string | Yes      | Must be `"batch_set"`                    |
| `name`    | string | Yes      | Batch identifier (use with `batch_exec`) |
| `actions` | array  | Yes      | Array of actions to group                |

### 4. Copy Action

Copy a variable value to another variable.

```json
{
	"action": "copy",
	"from": "source_var",
	"to": "dest_var"
}
```

#### Copy Action Fields

| Field    | Type   | Required | Description               |
| -------- | ------ | -------- | ------------------------- |
| `action` | string | Yes      | Must be `"copy"`          |
| `from`   | string | Yes      | Source variable name      |
| `to`     | string | Yes      | Destination variable name |

### 5. Dump Action

Debug helper - prints current variable values to console.

```json
{
	"title": "Debug checkpoint",
	"action": "dump",
	"fields": ["var1", "var2", "var3"]
}
```

#### Dump Action Fields

| Field    | Type   | Required | Description               |
| -------- | ------ | -------- | ------------------------- |
| `action` | string | Yes      | Must be `"dump"`          |
| `title`  | string | No       | Description of dump point |
| `fields` | array  | Yes      | Variables to print        |

---

## Variables & Expressions

### Variable Storage Syntax

Use the `fields` array in HTTP actions to extract and store response data:

```json
"fields": [
  ["data.id", "comment_id"],           // Store data.id in comment_id
  ["data.token", "auth_token"],        // Store data.token in auth_token
  ["#data", "item_count"]              // Store array length in item_count
]
```

### Variable Storage Patterns

| Pattern             | Syntax                   | Example                                      | Description           |
| ------------------- | ------------------------ | -------------------------------------------- | --------------------- |
| **Simple field**    | `["path", "var"]`        | `["data.id", "user_id"]`                     | Store field value     |
| **Nested field**    | `["path.nested", "var"]` | `["data.profile.name", "username"]`          | Store nested value    |
| **Array length**    | `["#path", "var"]`       | `["#data", "count"]`                         | Store array length    |
| **Multiple values** | Multiple arrays          | `[["data.id", "id"], ["data.name", "name"]]` | Store multiple fields |

### Variable Interpolation

Use `%(variable)s` syntax to insert variable values into requests:

```json
{
	"method": "DELETE",
	"url": "/api/comment/del",
	"body": {
		"id": "%(comment_id)s"
	}
}
```

### System Variables

These variables are automatically available after importing `admin-login.tests.json`:

| Variable                    | Description                                   | Set By                   |
| --------------------------- | --------------------------------------------- | ------------------------ |
| `%(system_admin_username)s` | System admin username                         | Environment/config       |
| `%(system_admin_password)s` | System admin password                         | Environment/config       |
| `%(token)s`                 | Current auth token (test DB after test-enter) | admin-login → test-enter |
| `%(admin_token)s`           | Admin auth token (test DB after test-enter)   | admin-login → test-enter |
| `%(id_admin)s`              | Admin user ID                                 | admin-login              |

### JavaScript Expressions

Use `${expression}` syntax for dynamic values in test assertions:

```json
"tests": [
  {
    "field": "#data",
    "value": "${init_count + 1}"     // Compare to init_count + 1
  }
]
```

#### Expression Syntax

| Syntax           | Purpose            | Example                 |
| ---------------- | ------------------ | ----------------------- |
| `${var}`         | Use variable value | `${user_id}`            |
| `${var + 1}`     | Arithmetic         | `${count + 1}`          |
| `${var - 2}`     | Subtraction        | `${init_count - 2}`     |
| `${var1 + var2}` | Multiple variables | `${replies + comments}` |

### Special Operators

| Operator                 | Purpose                    | Example                         | Result                           |
| ------------------------ | -------------------------- | ------------------------------- | -------------------------------- |
| `#data`                  | Get array length           | `["#data", "count"]`            | Stores array length in `count`   |
| `#path.to.array`         | Length of nested array     | `["#data.items", "item_count"]` | Stores nested array length       |
| `data[id='value']`       | Filter array by field      | `data[id='%(user_id)s']`        | Find array item with matching ID |
| `data[id='value'].field` | Access filtered item field | `data[id='%(user_id)s'].name`   | Get field from filtered item     |

#### Filter Examples

```json
{
	"title": "Verify specific user's status",
	"tests": [
		{
			"field": "data[id='%(user_id)s'].status",
			"value": "active"
		},
		{
			"field": "data[username='admin'].role",
			"value": "admin"
		}
	]
}
```

---

## Assertions

### Test Structure

The `tests` array validates response data:

```json
"tests": [
  {
    "field": "ok",
    "value": true
  },
  {
    "field": "data.username",
    "value": "admin"
  },
  {
    "field": "#data",
    "value": "${expected_count}"
  }
]
```

### Common Assertion Patterns

| Pattern              | Field                   | Value           | Purpose                         |
| -------------------- | ----------------------- | --------------- | ------------------------------- |
| **Success response** | `"ok"`                  | `true`          | Verify API returned success     |
| **Error response**   | `"ok"`                  | `false`         | Verify API returned error       |
| **Exact value**      | `"data.field"`          | `"expected"`    | Match exact field value         |
| **Number value**     | `"data.count"`          | `5`             | Match numeric value             |
| **Boolean value**    | `"data.active"`         | `true`          | Match boolean                   |
| **Array length**     | `"#data"`               | `10`            | Verify array has exact length   |
| **Dynamic count**    | `"#data"`               | `"${init + 1}"` | Compare to expression           |
| **Nested field**     | `"data.user.name"`      | `"John"`        | Match nested value              |
| **Filtered item**    | `"data[id='x'].status"` | `"active"`      | Match specific array item field |

### Assertion Examples Table

| Test Case          | Example JSON                                               | Description                |
| ------------------ | ---------------------------------------------------------- | -------------------------- |
| **Test success**   | `{"field": "ok", "value": true}`                           | API call succeeded         |
| **Test error**     | `{"field": "ok", "value": false}`                          | API call failed (expected) |
| **Test string**    | `{"field": "data.name", "value": "John"}`                  | String field matches       |
| **Test number**    | `{"field": "data.age", "value": 25}`                       | Number field matches       |
| **Test boolean**   | `{"field": "data.active", "value": true}`                  | Boolean field matches      |
| **Test count**     | `{"field": "#data", "value": 5}`                           | Array has 5 items          |
| **Test increment** | `{"field": "#data", "value": "${init + 1}"}`               | Array grew by 1            |
| **Test decrement** | `{"field": "#data", "value": "${init - 1}"}`               | Array shrunk by 1          |
| **Test filtered**  | `{"field": "data[id='123'].name", "value": "John"}`        | Item 123's name is John    |
| **Test nested**    | `{"field": "data.user.profile.email", "value": "a@b.com"}` | Deep nested match          |

### Complete Assertion Example

```json
{
	"title": "Verify user creation and list update",
	"method": "GET",
	"url": "/api/users/list",
	"tests": [
		{
			"field": "ok",
			"value": true
		},
		{
			"field": "#data",
			"value": "${init_count + 1}"
		},
		{
			"field": "data[id='%(new_user_id)s'].username",
			"value": "testuser"
		},
		{
			"field": "data[id='%(new_user_id)s'].active",
			"value": true
		}
	]
}
```

---

## Test Patterns

### Pattern 1: CRUD Testing

Complete Create → Read → Update → Delete workflow.

```json
{
	"actions": [
		{
			"title": "Get initial count",
			"method": "GET",
			"url": "/api/items/list",
			"fields": [["#data", "init_count"]]
		},
		{
			"title": "CREATE - Add new item",
			"method": "POST",
			"url": "/api/item/add",
			"body": {
				"name": "Test Item",
				"description": "Test Description"
			},
			"tests": [
				{ "field": "ok", "value": true },
				{ "field": "data.name", "value": "Test Item" }
			],
			"fields": [["data.id", "item_id"]]
		},
		{
			"title": "Verify item was created",
			"method": "GET",
			"url": "/api/items/list",
			"tests": [
				{
					"field": "#data",
					"value": "${init_count + 1}"
				}
			]
		},
		{
			"title": "READ - Get specific item",
			"method": "GET",
			"url": "/api/item/get",
			"body": { "id": "%(item_id)s" },
			"tests": [
				{ "field": "ok", "value": true },
				{ "field": "data.name", "value": "Test Item" },
				{ "field": "data.id", "value": "%(item_id)s" }
			]
		},
		{
			"title": "UPDATE - Modify item",
			"method": "PUT",
			"url": "/api/item/update",
			"body": {
				"id": "%(item_id)s",
				"name": "Updated Item"
			},
			"tests": [
				{ "field": "ok", "value": true },
				{ "field": "data.name", "value": "Updated Item" }
			]
		},
		{
			"title": "Verify update",
			"method": "GET",
			"url": "/api/item/get",
			"body": { "id": "%(item_id)s" },
			"tests": [
				{ "field": "data.name", "value": "Updated Item" }
			]
		},
		{
			"title": "DELETE - Remove item",
			"method": "DELETE",
			"url": "/api/item/del",
			"body": { "id": "%(item_id)s" },
			"tests": [
				{ "field": "ok", "value": true }
			]
		},
		{
			"title": "Verify deletion",
			"method": "GET",
			"url": "/api/items/list",
			"tests": [
				{
					"field": "#data",
					"value": "${init_count}"
				}
			]
		}
	]
}
```

### Pattern 2: Relationship Testing

Test parent-child relationships and data integrity.

```json
{
	"actions": [
		{
			"title": "Get initial count",
			"method": "GET",
			"url": "/api/comments/list",
			"body": {
				"module": "test",
				"id_obj": "obj123"
			},
			"fields": [["#data", "init_count"]]
		},
		{
			"title": "Create parent comment",
			"method": "POST",
			"url": "/api/comment/add",
			"body": {
				"module": "test",
				"id_obj": "obj123",
				"comment": "Parent comment"
			},
			"fields": [["data.id", "parent_id"]]
		},
		{
			"title": "Create first reply",
			"method": "POST",
			"url": "/api/comment/add",
			"body": {
				"module": "test",
				"id_obj": "obj123",
				"id_follow_up": "%(parent_id)s",
				"comment": "First reply"
			},
			"fields": [["data.id", "reply1_id"]]
		},
		{
			"title": "Create second reply",
			"method": "POST",
			"url": "/api/comment/add",
			"body": {
				"module": "test",
				"id_obj": "obj123",
				"id_follow_up": "%(parent_id)s",
				"comment": "Second reply"
			},
			"fields": [["data.id", "reply2_id"]]
		},
		{
			"title": "Verify all comments exist",
			"method": "GET",
			"url": "/api/comments/list",
			"body": {
				"module": "test",
				"id_obj": "obj123"
			},
			"tests": [
				{
					"field": "#data",
					"value": "${init_count + 3}"
				}
			]
		}
	]
}
```

### Pattern 3: Event Testing

Verify inter-module communication via events.

```json
{
	"actions": [
		{
			"title": "Get initial activitylog count",
			"method": "GET",
			"url": "/api/activity_log/list",
			"fields": [["#data", "log_count"]]
		},
		{
			"title": "Perform action that emits event",
			"method": "POST",
			"url": "/api/comment/add",
			"body": {
				"module": "test",
				"id_obj": "xyz",
				"comment": "Test comment"
			},
			"fields": [["data.id", "comment_id"]]
		},
		{
			"title": "Verify activitylog entry was created",
			"method": "GET",
			"url": "/api/activity_log/list",
			"tests": [
				{
					"field": "#data",
					"value": "${log_count + 1}"
				}
			],
			"fields": [["data[0].id", "log_entry_id"]]
		},
		{
			"title": "Verify log entry details",
			"method": "GET",
			"url": "/api/activity_log/get",
			"body": {
				"id": "%(log_entry_id)s"
			},
			"tests": [
				{
					"field": "data.event_type",
					"value": "comment.added"
				},
				{
					"field": "data.id_obj",
					"value": "%(comment_id)s"
				}
			]
		},
		{
			"title": "Cleanup - delete comment",
			"method": "DELETE",
			"url": "/api/comment/del",
			"body": {
				"id": "%(comment_id)s"
			}
		}
	]
}
```

### Pattern 4: Cascading Delete Testing

Verify that deleting a parent properly cascades to children.

```json
{
	"actions": [
		{
			"title": "Get initial count",
			"method": "GET",
			"url": "/api/comments/list",
			"body": {
				"module": "test",
				"id_obj": "obj123"
			},
			"fields": [["#data", "init_count"]]
		},
		{
			"title": "Create parent",
			"method": "POST",
			"url": "/api/comment/add",
			"body": {
				"module": "test",
				"id_obj": "obj123",
				"comment": "Parent"
			},
			"fields": [["data.id", "parent_id"]]
		},
		{
			"title": "Create child 1",
			"method": "POST",
			"url": "/api/comment/add",
			"body": {
				"module": "test",
				"id_obj": "obj123",
				"id_follow_up": "%(parent_id)s",
				"comment": "Child 1"
			}
		},
		{
			"title": "Create child 2",
			"method": "POST",
			"url": "/api/comment/add",
			"body": {
				"module": "test",
				"id_obj": "obj123",
				"id_follow_up": "%(parent_id)s",
				"comment": "Child 2"
			}
		},
		{
			"title": "Verify all created",
			"method": "GET",
			"url": "/api/comments/list",
			"body": {
				"module": "test",
				"id_obj": "obj123"
			},
			"tests": [
				{
					"field": "#data",
					"value": "${init_count + 3}"
				}
			]
		},
		{
			"title": "Delete parent (should cascade)",
			"method": "DELETE",
			"url": "/api/comment/del",
			"body": {
				"id": "%(parent_id)s"
			}
		},
		{
			"title": "Verify all deleted",
			"method": "GET",
			"url": "/api/comments/list",
			"body": {
				"module": "test",
				"id_obj": "obj123"
			},
			"tests": [
				{
					"field": "#data",
					"value": "${init_count}"
				}
			]
		}
	]
}
```

---

## Complete Examples

### Example 1: Simple CRUD Module

**File: `liwe3/modules/tags/backend/tests/restest/all.json`**

```json
{
	"system": {
		"base_url": "http://localhost:8787",
		"authorization_template": "Bearer %(token)s"
	},
	"actions": [
		{
			"action": "include",
			"filename": "../../../user/tests/restest/admin-login.tests.json",
			"exec": true
		},
		{
			"action": "include",
			"filename": "basic-crud.tests.json",
			"exec": true
		}
	]
}
```

**File: `liwe3/modules/tags/backend/tests/restest/basic-crud.tests.json`**

```json
{
	"actions": [
		{
			"title": "Get initial tag count",
			"method": "GET",
			"url": "/api/tags/list",
			"fields": [["#data", "init_count"]]
		},
		{
			"title": "Create a new tag",
			"method": "POST",
			"url": "/api/tag/add",
			"body": {
				"name": "test-tag",
				"color": "#FF0000"
			},
			"tests": [
				{
					"field": "ok",
					"value": true
				},
				{
					"field": "data.name",
					"value": "test-tag"
				},
				{
					"field": "data.color",
					"value": "#FF0000"
				}
			],
			"fields": [["data.id", "tag_id"]]
		},
		{
			"title": "Verify tag was created",
			"method": "GET",
			"url": "/api/tags/list",
			"tests": [
				{
					"field": "#data",
					"value": "${init_count + 1}"
				},
				{
					"field": "data[id='%(tag_id)s'].name",
					"value": "test-tag"
				}
			]
		},
		{
			"title": "Update tag color",
			"method": "PUT",
			"url": "/api/tag/update",
			"body": {
				"id": "%(tag_id)s",
				"color": "#00FF00"
			},
			"tests": [
				{
					"field": "ok",
					"value": true
				},
				{
					"field": "data.color",
					"value": "#00FF00"
				}
			]
		},
		{
			"title": "Verify update",
			"method": "GET",
			"url": "/api/tag/get",
			"body": {
				"id": "%(tag_id)s"
			},
			"tests": [
				{
					"field": "data.color",
					"value": "#00FF00"
				}
			]
		},
		{
			"title": "Delete the tag",
			"method": "DELETE",
			"url": "/api/tag/del",
			"body": {
				"id": "%(tag_id)s"
			},
			"tests": [
				{
					"field": "ok",
					"value": true
				}
			]
		},
		{
			"title": "Verify tag was deleted",
			"method": "GET",
			"url": "/api/tags/list",
			"tests": [
				{
					"field": "#data",
					"value": "${init_count}"
				}
			]
		}
	]
}
```

### Example 2: Comment Module with Relationships

**File: `liwe3/modules/comment/backend/tests/restest/follow-up.tests.json`**

```json
{
	"actions": [
		{
			"title": "Save current number of comments in DB",
			"method": "GET",
			"url": "/api/comments/list",
			"body": {
				"module": "test",
				"id_obj": "abc123"
			},
			"fields": [["#data", "init_comments"]]
		},
		{
			"title": "Create parent comment",
			"method": "POST",
			"url": "/api/comment/add",
			"body": {
				"module": "test",
				"id_obj": "abc123",
				"comment": "Parent comment"
			},
			"fields": [["data.id", "parent_id"]]
		},
		{
			"title": "Create first reply",
			"method": "POST",
			"url": "/api/comment/add",
			"body": {
				"module": "test",
				"id_obj": "abc123",
				"id_follow_up": "%(parent_id)s",
				"comment": "First reply"
			},
			"fields": [["data.id", "reply1_id"]]
		},
		{
			"title": "Create second reply",
			"method": "POST",
			"url": "/api/comment/add",
			"body": {
				"module": "test",
				"id_obj": "abc123",
				"id_follow_up": "%(parent_id)s",
				"comment": "Second reply"
			},
			"fields": [["data.id", "reply2_id"]]
		},
		{
			"title": "Create nested reply (reply to reply)",
			"method": "POST",
			"url": "/api/comment/add",
			"body": {
				"module": "test",
				"id_obj": "abc123",
				"id_follow_up": "%(reply2_id)s",
				"comment": "Nested reply"
			}
		},
		{
			"title": "Verify we have 4 comments total",
			"method": "GET",
			"url": "/api/comments/list",
			"body": {
				"module": "test",
				"id_obj": "abc123"
			},
			"tests": [
				{
					"field": "#data",
					"value": "${init_comments + 4}"
				}
			]
		},
		{
			"title": "Delete parent (should cascade delete all replies)",
			"method": "DELETE",
			"url": "/api/comment/del",
			"body": {
				"id": "%(parent_id)s"
			}
		},
		{
			"title": "Verify all comments were deleted",
			"method": "GET",
			"url": "/api/comments/list",
			"body": {
				"module": "test",
				"id_obj": "abc123"
			},
			"tests": [
				{
					"field": "#data",
					"value": "${init_comments}"
				}
			]
		}
	]
}
```

### Example 3: Event Emission Testing

**File: `liwe3/modules/comment/backend/tests/restest/event-emission.tests.json`**

```json
{
	"actions": [
		{
			"title": "Get initial activitylog count",
			"method": "GET",
			"url": "/api/activity_log/list",
			"fields": [["#data", "log_count"]]
		},
		{
			"title": "Add comment (emits comment.added event)",
			"method": "POST",
			"url": "/api/comment/add",
			"body": {
				"module": "test",
				"id_obj": "xyz",
				"comment": "Test comment"
			},
			"fields": [["data.id", "comment_id"]]
		},
		{
			"title": "Verify activitylog entry was created",
			"method": "GET",
			"url": "/api/activity_log/list",
			"tests": [
				{
					"field": "#data",
					"value": "${log_count + 1}"
				}
			]
		},
		{
			"title": "Verify log entry has correct event type",
			"method": "GET",
			"url": "/api/activity_log/list",
			"tests": [
				{
					"field": "data[0].event_type",
					"value": "comment.added"
				}
			]
		},
		{
			"title": "Cleanup - delete comment",
			"method": "DELETE",
			"url": "/api/comment/del",
			"body": {
				"id": "%(comment_id)s"
			}
		}
	]
}
```

---

## Testing Checklist

### Pre-Test Setup

- [ ] Module JSON definition is complete
- [ ] Module implementation is complete
- [ ] Test directory exists: `app/modules/YOUR_MODULE/backend/tests/restest/`
- [ ] `all.json` entry point created

### Entry Point (`all.json`)

- [ ] `system.base_url` configured
- [ ] `system.authorization_template` set to `"Bearer %(token)s"`
- [ ] First action imports `admin-login.tests.json`
- [ ] Second action imports `test-enter.tests.json` (switches to test DB)
- [ ] All test files included with `"exec": true`

### Test File Structure

- [ ] Organized by feature (one `.tests.json` per feature)
- [ ] Each test has descriptive `title` fields
- [ ] Initial state captured (counts, existing data)
- [ ] Operations performed (create, update, delete)
- [ ] Results verified with assertions
- [ ] Cleanup performed to restore initial state

### CRUD Testing

- [ ] **CREATE**: New item created successfully
- [ ] **CREATE**: Verify count increased by 1
- [ ] **CREATE**: Store item ID for later use
- [ ] **READ**: Get specific item by ID
- [ ] **READ**: Verify field values match
- [ ] **READ**: List returns expected count
- [ ] **UPDATE**: Modify item successfully
- [ ] **UPDATE**: Verify changes persisted
- [ ] **DELETE**: Remove item successfully
- [ ] **DELETE**: Verify count back to initial state

### Relationship Testing

- [ ] Create parent record
- [ ] Create child records linked to parent
- [ ] Verify relationships in list/get operations
- [ ] Test nested relationships (grandchildren)
- [ ] Verify total count matches expected

### Cascading Delete Testing

- [ ] Create parent with multiple children
- [ ] Verify all records exist
- [ ] Delete parent
- [ ] Verify all children deleted
- [ ] Verify count back to initial state

### Event Testing

- [ ] Get initial state of target module (e.g., activitylog)
- [ ] Perform action that emits event
- [ ] Verify event created record in target module
- [ ] Verify event data is correct
- [ ] Cleanup created records

### Edge Cases

- [ ] Test with missing required fields
- [ ] Test with invalid IDs
- [ ] Test duplicate operations
- [ ] Test permission failures (if applicable)
- [ ] Test empty list results

### Assertion Coverage

- [ ] All operations check `"ok": true` or `"ok": false`
- [ ] Array counts verified with `#data`
- [ ] Specific field values checked
- [ ] Filtered array items tested
- [ ] Dynamic expressions used where appropriate

---

## Common Patterns Table

| Pattern                   | When to Use                         | Example Code                                                      |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| **Store initial count**   | Before any create/delete operations | `"fields": [["#data", "init_count"]]`                             |
| **Store created ID**      | After creating record               | `"fields": [["data.id", "item_id"]]`                              |
| **Use stored ID**         | In subsequent operations            | `"body": {"id": "%(item_id)s"}`                                   |
| **Verify count increase** | After create                        | `"tests": [{"field": "#data", "value": "${init_count + 1}"}]`     |
| **Verify count decrease** | After delete                        | `"tests": [{"field": "#data", "value": "${init_count - 1}"}]`     |
| **Verify cleanup**        | End of test                         | `"tests": [{"field": "#data", "value": "${init_count}"}]`         |
| **Test success**          | Every operation                     | `"tests": [{"field": "ok", "value": true}]`                       |
| **Test failure**          | Expected errors                     | `"tests": [{"field": "ok", "value": false}]`                      |
| **Verify specific item**  | After create/update                 | `"tests": [{"field": "data[id='%(id)s'].name", "value": "test"}]` |
| **Skip auth**             | Public endpoints                    | `"auth": false`                                                   |

---

## Troubleshooting

### Common Issues

| Problem                        | Cause                                  | Solution                                                |
| ------------------------------ | -------------------------------------- | ------------------------------------------------------- |
| **Test fails with auth error** | Admin login not imported               | Add admin-login.tests.json include at start of all.json |
| **Variable not found**         | Variable not stored or typo            | Check fields array, verify variable name spelling       |
| **Count assertion fails**      | Wrong initial count or missing cleanup | Verify init_count captured before operations            |
| **Filtered array fails**       | Wrong field name or ID not found       | Check response structure with dump action               |
| **Expression error**           | Invalid JavaScript syntax              | Verify ${} syntax and variable names                    |
| **Path not found**             | Incorrect JSON path                    | Use dump action to see response structure               |
| **Delete doesn't cleanup**     | Cascading delete not implemented       | Fix implementation or adjust test expectations          |
| **Event not created**          | Event emission not implemented         | Check method implementation for liwe_event_emit()       |

### Debugging Tips

| Technique                 | Code                                               | Purpose                        |
| ------------------------- | -------------------------------------------------- | ------------------------------ |
| **Dump variables**        | `{"action": "dump", "fields": ["var1", "var2"]}`   | See current variable values    |
| **Print response**        | `{"action": "dump", "fields": ["_last_response"]}` | See last HTTP response         |
| **Add checkpoint titles** | `"title": "DEBUG: After create"`                   | Identify which step failed     |
| **Simplify test**         | Comment out later actions                          | Isolate failing step           |
| **Check API directly**    | Use curl/Postman                                   | Verify API works outside tests |

### Debug Action Example

```json
{
	"title": "DEBUG CHECKPOINT - After creating comment",
	"action": "dump",
	"fields": ["comment_id", "parent_id", "init_count"]
}
```

---

## Related Documentation

| Document                                 | Purpose                             | When to Read                      |
| ---------------------------------------- | ----------------------------------- | --------------------------------- |
| **LIWE3_MODULE_ORGANIZATION_GUIDE.md**   | Module structure, file organization | When creating a new module        |
| **LIWE3_MODULE_JSON.md**                 | JSON schema for module definitions  | When defining module API contract |
| **LIWE3_METHOD_IMPLEMENTATION_GUIDE.md** | Implementing endpoint methods       | When writing method logic         |
| **liwe3-backend.md**                     | Core API reference                  | When using LiWE3 utilities        |
| **TESTING_RESTEST.md**                   | This document                       | When writing ResTest tests        |

---

## Quick Reference

### Must-Remember Rules

1. ✅ **ALWAYS import admin-login.tests.json** in every module's all.json
2. ✅ **ALWAYS include test-enter.tests.json** after admin-login to use the test database
3. ✅ **Store initial counts** before performing operations
4. ✅ **Test complete workflows** (Create → Read → Update → Delete)
5. ✅ **Verify cleanup** (counts back to initial state)
6. ✅ **Test inter-module interactions** (events, cascading deletes)

### Variable Syntax Quick Reference

```json
// Store
"fields": [["response.path", "var_name"]]

// Use
"body": { "id": "%(var_name)s" }

// Expression
"tests": [{ "field": "#data", "value": "${var_name + 1}" }]
```

### Action Template Quick Reference

```json
// HTTP Request
{
  "title": "Description",
  "method": "POST",
  "url": "/api/endpoint",
  "body": {},
  "fields": [["data.id", "var"]],
  "tests": [{ "field": "ok", "value": true }]
}

// Include
{
  "action": "include",
  "filename": "path/to/file.tests.json",
  "exec": true
}

// Copy
{
  "action": "copy",
  "from": "source",
  "to": "dest"
}

// Dump
{
  "action": "dump",
  "fields": ["var1", "var2"]
}
```

---

## Running Tests

### Local Development

Prerequisite: run a fresh D1 migration, then start `wrangler dev` against it, before running tests:

```bash
# Migrate local D1 (all modules, or a specific one)
./scripts/db_push.sh all

# Start development server (`pnpm dev` in the root does not start it)
pnpm -C app/backend dev
```

Then run tests via `rt.sh`:

```bash
# Run all module tests
./scripts/rt.sh app/modules/YOUR_MODULE/backend/tests/restest/all.json

# Run specific test file
./scripts/rt.sh app/modules/YOUR_MODULE/backend/tests/restest/specific.tests.json
```

`rt.sh` wraps the `restest` CLI (from the pyenv environment), automatically passing `--env-cf ./app/backend/.dev.vars`, and logs to `/ramdisk/restest.log`.

**`restest` aborts the whole run on the first non-2xx response by default.**
If your suite needs to assert an expected error response (`{"field": "ok",
"value": false}`, `409` duplicate, `400` invalid enum, `404` not-found), you
must pass `--dont-stop-on-error` on the CLI - without it, the run stops dead at
the first intentional-failure request and every test after it silently never
executes (no failure is reported for them; they just don't run). This is easy
to miss because the run _looks_ like it passed (`EXIT:0` from a half-executed
suite is worse than a failure):

```bash
restest app/modules/<name>/backend/tests/restest/all.json \
  --env-cf ./app/backend/.dev.vars --dont-stop-on-error
```

Error-path assertions don't need their own ResTest cases if unit tests already
cover them thoroughly, but at least one of each is worth having end-to-end
since it also exercises the Zod validation layer and the actual HTTP status
code, which unit tests calling the method function directly do not.

**Warning:** calling `/api/system/admin/test/enter` switches the running worker to `DB_TEST` mode for the rest of that server's lifetime. If someone sends a stray manual request against a live `wrangler dev` mid-session (e.g. poking the API by hand), the DB can get left in test mode, causing confusing "Invalid credentials" failures on the next `rt.sh` run. Restart `wrangler dev` to reset it back to normal.

### CI/CD

Tests should run automatically in your CI/CD pipeline to verify:

- All API endpoints work correctly
- Inter-module communication functions
- Cascading deletes work properly
- Events are emitted and handled
- Data integrity is maintained

---

## Summary

**ResTest** is a powerful JSON-based testing framework that enables:

- ✅ Declarative API testing without code
- ✅ Variable storage and reuse across requests
- ✅ Flexible assertions with JavaScript expressions
- ✅ Modular, reusable test organization
- ✅ Complete workflow testing (CRUD, relationships, events)
- ✅ Inter-module interaction verification

**Key Success Factors:**

1. Always import admin-login.tests.json
2. Follow store → test → cleanup pattern
3. Test complete workflows, not just individual operations
4. Verify side effects (events, cascading deletes)
5. Use descriptive titles and organize by feature

**Remember:** Every module test MUST import `admin-login.tests.json` and follow the store → test → cleanup pattern for robust, maintainable tests.
