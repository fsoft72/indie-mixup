# LiWE3 Method Implementation Guide

## When to Read This File

Read this file when you are:

- **Implementing business logic** in `@backend/modules/*/src/methods/*.ts` files
- **Writing code inside f2c blocks** (between `/*=== f2c_start ===*/` and `/*=== f2c_end ===*/`)
- **Creating endpoint handlers** for CRUD operations (Create, Read, Update, Delete)
- **Adding authentication or domain filtering** to endpoints (for the permission _gate_, and the full access-control model, read `PERMISSIONS.md`)
- **Emitting events** or calling other module methods
- **Debugging method implementations** or fixing errors in existing methods
- **Learning LiWE3 backend patterns** and best practices

**Context:** The scaffolding (Zod schemas, types, route registration, database schemas) is auto-generated. Your job is to write implementation logic **ONLY inside f2c blocks**.

---

## Critical Rules

| Category  | Rule                                 | Details                                                                                                                                    |
| --------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ❌ NEVER  | Throw exceptions                     | Always return `responseError()` instead                                                                                                    |
| ❌ NEVER  | Modify code outside f2c blocks       | Scaffolding is auto-generated and will be overwritten                                                                                      |
| ❌ NEVER  | Import outside f2c headers           | All imports go in `f2c_start method_name_headers` block                                                                                    |
| ❌ NEVER  | Query other modules' tables directly | Use `liwe_event_call()` for inter-module communication                                                                                     |
| ❌ NEVER  | Skip domain filtering                | Always filter by `eq(table.domain, user.domain ?? '_')`                                                                                    |
| ❌ NEVER  | Use `any` types                      | Use proper TypeScript types and interfaces                                                                                                 |
| ❌ NEVER  | Silently swallow errors              | Always provide descriptive error messages                                                                                                  |
| ❌ NEVER  | Re-check the route's own gate        | The route already enforced `{ perms }` (see `PERMISSIONS.md`) - do not repeat `has_perms([SAME_PERM])`                                     |
| ❌ NEVER  | Emit events after return             | Events must be emitted **BEFORE** `responseSuccess()`                                                                                      |
| ❌ NEVER  | Use the `sql()` drizzle function     | Always create queries using drizzle `and()`, `or()`, `inArray()` and so on                                                                 |
| ✅ ALWAYS | Return responses                     | Use `responseSuccess(data)` or `responseError(message, status, code)`                                                                      |
| ✅ ALWAYS | Read JSDoc first                     | Check `@permissions` and `@events` fields before implementation                                                                            |
| ✅ ALWAYS | Validate params                      | Use validated data from Zod schema                                                                                                         |
| ✅ ALWAYS | Check authentication                 | Use `const user = await ctx.user(); if (!user) return ...`                                                                                 |
| ✅ ALWAYS | Use the right in-method check        | Route gate = simple case (done). In-method only for owner-OR-perm (`can_act_on`) or scope-widening (`capabilities`) - see `PERMISSIONS.md` |
| ✅ ALWAYS | Apply domain filtering               | All queries must filter by domain for multi-tenancy                                                                                        |
| ✅ ALWAYS | Use try/catch                        | Wrap database operations in error handling                                                                                                 |
| ✅ ALWAYS | Emit events before success           | If `@events` field is defined, emit before `responseSuccess()`                                                                             |
| ✅ ALWAYS | Use events for modules               | Inter-module communication via `liwe_event_call()`                                                                                         |
| ✅ ALWAYS | Add descriptive errors               | Include context in error messages                                                                                                          |
| ✅ ALWAYS | Put exit conditions at top           | Early returns for validation/auth checks                                                                                                   |
| ✅ ALWAYS | Use drizzle functions                | Always use drizzle functions like `and()`, `or()`, `eq()`, `inArray()` ...                                                                 |

---

## Understanding f2c Blocks

f2c blocks are **protected code zones** where you write your implementation. Everything outside these blocks is auto-generated.

### f2c Headers Block (Imports Only)

```typescript
/*=== f2c_start method_name_headers ===*/
import { liwe_event_emit, mkid } from '@backend/liwe3/core';
// import { can_act_on, capabilities } from '@backend/liwe3/core'; // only for case B / C, see PERMISSIONS.md
import { table_name } from '../schema';
import { EVENT_NAME } from '../events';
import { TypeName } from '../types';
/*=== f2c_end method_name_headers ===*/
```

**What goes here:**

- Core library imports (`@backend/liwe3/core`)
- Schema imports (`../schema`)
- Event constants (`../events`)
- Permission constants (`../perms`)
- Type imports (`../types`)

### f2c Logic Block (Implementation)

```typescript
/*=== f2c_start method_name ===*/
// ALL your business logic here:
// - User authentication checks
// - Permission checks
// - Database queries
// - Data transformations
// - Event emissions
// - Inter-module calls
// - Response construction
/*=== f2c_end method_name ===*/
```

### DO NOT TOUCH (Outside f2c Blocks)

- ❌ Zod schema definition
- ❌ Type exports (`export type MethodParams = ...`)
- ❌ Function signature
- ❌ Validation code
- ❌ JSDoc comments (unless adding to existing)
- ✅ **READ ONLY:** `@permissions` field → Which permission to check
- ✅ **READ ONLY:** `@events` field → Which event to emit

---

## Standard Method Structure

Every method follows this annotated template:

```typescript
/**
 * Brief description of what this method does
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {MethodParams} params - Request parameters
 * @param {LiWESysParams} [sys] - System parameters
 *
 * @permissions MODULE_PERM_ACTION  // ← READ THIS: Which permission to check
 * @events MODULE_EVENT_ACTION      // ← READ THIS: Which event to emit (if defined)
 *
 * @returns {Promise<LiWEResponse<ResultType>>} Result object
 */
export const method_name = async (
	ctx : LiWECtx,
	params : MethodParams,
	sys? : LiWESysParams,
) : Promise<LiWEResponse<ResultType>> => {
	// ============================================================
	// 1. VALIDATION (Already scaffolded - OUTSIDE f2c block)
	// ============================================================
	const validation = MethodSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}
	const { param1, param2 } = validation.data;

	/*=== f2c_start method_name ===*/

	// ============================================================
	// 2. USER AUTHENTICATION (if endpoint requires logged-in user)
	// ============================================================
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401 );

	// ============================================================
	// 3. FINE-GRAINED CHECK - ONLY if the rule depends on the data.
	// The route's { perms } gate already enforced the plain
	// "needs permission X" case; do NOT repeat it here.
	//   permission OR owner:  can_act_on( ctx, [ MODULE_PERM_ACTION ], row.id_owner )
	//   permission widens scope: capabilities( ctx, { seeAll: [ 'system.admin' ] } )
	// See PERMISSIONS.md.
	// ============================================================

	// ============================================================
	// 4. BUSINESS LOGIC with error handling
	// ============================================================
	try {
		// Your implementation here:
		// - Database queries
		// - Data transformations
		// - Inter-module calls
		// - Generate ID with mkid()
		// - Apply domain filtering

		// ============================================================
		// 5. EMIT EVENT (if defined for this endpoint)
		// CRITICAL: BEFORE responseSuccess()
		// ============================================================
		await liwe_event_emit( ctx, MODULE_EVENT_ACTION, {
			id: result.id,
			domain: user.domain ?? '_',
			id_user: user.id,
			// ... additional event data
		} );

		return responseSuccess( result );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Operation failed: ${error.message}`, 500 );
		}
		return responseError( 'Unknown error occurred', 500 );
	}

	/*=== f2c_end method_name ===*/
};
```

---

## Implementation Patterns (15 Common Patterns)

| Pattern                        | When to Use                                     | Code Snippet                                                                                                                                                                      |
| ------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. User Authentication**     | Any endpoint requiring logged-in user           | `const user = await ctx.user();`<br>`if (!user) return responseError('Unauthorized', 401);`                                                                                       |
| **2. Fine-grained check**      | Only when the rule needs the row / widens scope | `if (!await can_act_on(ctx, [PERM], row.id_owner)) return responseError('Permission denied', 403, ERR_PERMISSION_DENIED);`<br>(the route `{ perms }` gate handles the plain case) |
| **3. Domain Scoping**          | Multi-tenant queries                            | `eq(table.domain, user.domain ?? '_')`                                                                                                                                            |
| **4. SysParams Override**      | Internal calls bypassing auth                   | `let domain = sys?.skip_permissions_check ? sys?.domain : user.domain;`                                                                                                           |
| **5. Create Record**           | Insert new data                                 | `await ctx.app.db.insert(table).values({`<br>&nbsp;&nbsp;`id: mkid('prefix'),`<br>&nbsp;&nbsp;`domain: user.domain ?? '_',`<br>&nbsp;&nbsp;`...data`<br>`}).run();`               |
| **6. Query Single Record**     | Get one record by ID                            | `.where(and(eq(table.id, id), eq(table.domain, user.domain ?? '_'))).get()`                                                                                                       |
| **7. Query Multiple Records**  | List/search records                             | `.where(eq(table.domain, user.domain ?? '_'))` (no `.get()`)                                                                                                                      |
| **8. Update Record**           | Modify existing data                            | `.update(table).set({field: value}).where(and(...)).run()`                                                                                                                        |
| **9. Delete Record**           | Remove data                                     | `.delete(table).where(and(...)).run()`                                                                                                                                            |
| **10. Emit Event**             | Notify other modules                            | `await liwe_event_emit(ctx, EVENT_NAME, data);` **BEFORE** `responseSuccess()`                                                                                                    |
| **11. Call Another Module**    | Inter-module communication                      | `await liwe_event_call<T>(ctx, 'module', 'method', params)`                                                                                                                       |
| **12. Password Hashing**       | Store/verify passwords                          | `await hashPassword(plain)` / `await verifyPassword(plain, hash)`                                                                                                                 |
| **13. Complex Query**          | Multiple conditions                             | `and(eq(...), or(like(...), like(...)), eq(...))`                                                                                                                                 |
| **14. Select Specific Fields** | Optimize performance                            | `.select({ id: table.id, name: table.name })`                                                                                                                                     |
| **15. Transaction**            | Multiple operations (atomic)                    | `await ctx.app.db.transaction(async (tx) => { ... })`                                                                                                                             |

---

## Error Handling

### Pattern: Try/Catch with Descriptive Messages

```typescript
try {
  // Database operations here
  await ctx.app.db.insert(table).values(data).run();

  const result = await ctx.app.db.select().from(table).where(...).get();
  if (!result) return responseError('Creation failed', 500);

  return responseSuccess(result);

} catch (error) {
  if (error instanceof Error) {
    return responseError(`Operation failed: ${error.message}`, 500);
  }
  return responseError('Unknown error occurred', 500);
}
```

### Common Error Responses

| Status | Code                | Message                              | When to Use                    |
| ------ | ------------------- | ------------------------------------ | ------------------------------ |
| 400    | `VALIDATION_ERROR`  | `validation.error.message`           | Invalid input parameters       |
| 401    | -                   | `Unauthorized`                       | User not authenticated         |
| 403    | `PERMISSION_DENIED` | `Permission denied`                  | User lacks required permission |
| 404    | -                   | `Item not found`                     | Record doesn't exist           |
| 500    | -                   | `Operation failed: ${error.message}` | Database or internal error     |
| 500    | `CONFIG_ERROR`      | `Configuration missing`              | Missing required config        |

---

## Response Patterns

### Success Response

```typescript
// Simple success
return responseSuccess( data );

// Success with status
return responseSuccess( data, 201 ); // Created

// Empty success
return responseSuccess( { success: true } );
```

### Error Response

```typescript
// Simple error
return responseError( 'Error message', 500 );

// Error with code
return responseError( 'Validation failed', 400, 'VALIDATION_ERROR' );

// Contextual error
return responseError( `Failed to create ${name}: ${error.message}`, 500 );
```

---

## Event Emission

### When to Emit Events

Check the method's JSDoc `@events` field. If an event constant is listed, you **MUST** emit it.

```typescript
/**
 * @events CREDENTIALS_EVENT_CREATE  // ← Event is defined
 */
```

### How to Emit Events

```typescript
/*=== f2c_start method_name_headers ===*/
import { liwe_event_emit } from '@backend/liwe3/core';
import { MODULE_EVENT_ACTION } from '../events';
/*=== f2c_end method_name_headers ===*/

/*=== f2c_start method_name ===*/
try {
	// Perform operation
	const result = await createRecord();

	// CRITICAL: Emit BEFORE responseSuccess()
	await liwe_event_emit( ctx, MODULE_EVENT_ACTION, {
		id: result.id,
		domain: user.domain ?? '_',
		id_user: user.id,
		// ... additional event data
	} );

	return responseSuccess( result );
} catch ( error ) {
	return responseError( `Failed: ${error.message}`, 500 );
}
/*=== f2c_end method_name ===*/
```

### Event Naming Convention

Events follow the pattern: `module.action`

Examples:

- `comment.add`
- `user.deleted`
- `credentials.create`

---

## Database Operations

### Create (INSERT)

```typescript
import { mkid } from '@backend/liwe3/core';

const newRecord = {
	id: mkid( 'prefix' ), // e.g., 'user', 'comm', 'cred'
	domain: user.domain ?? '_',
	field1: value1,
	field2: value2,
};

await ctx.app.db.insert( table_name ).values( newRecord ).run();

const created = await ctx.app.db
	.select()
	.from( table_name )
	.where( eq( table_name.id, newRecord.id ) )
	.get();
```

### Read (SELECT)

```typescript
// Single record
const item = await ctx.app.db
	.select()
	.from( table_name )
	.where( and(
		eq( table_name.domain, user.domain ?? '_' ),
		eq( table_name.id, id ),
	) )
	.get(); // ← .get() returns single object or undefined

// Multiple records
const items = await ctx.app.db
	.select()
	.from( table_name )
	.where( eq( table_name.domain, user.domain ?? '_' ) );
// No .get() → returns array
```

### Update (UPDATE)

```typescript
await ctx.app.db
	.update( table_name )
	.set( {
		field: newValue,
		updated: Date.now(),
	} as any )
	.where( and(
		eq( table_name.id, id ),
		eq( table_name.domain, user.domain ?? '_' ),
	) )
	.run();
```

### The `$type<Date>()` trap on `datetime` columns

Generated `schema.ts` declares timestamp columns as
`created: integer('created').notNull().$type<Date>().default(sql\`(CURRENT_TIMESTAMP)\`)`.`.$type<Date>()`only overrides **TypeScript typing** - it adds no runtime
serialization. D1's bind layer cannot bind a raw`Date`object (only
string/number/boolean/null), so`created: new Date()`compiles fine and then
crashes at runtime as`DrizzleQueryError: ... SQLITE_ERROR`, surfaced as a
generic`500` with no useful client-side detail.

**Fix**, confirmed against `liwe3/modules/user`'s own methods:

- Use `Date.now()` (a plain number) for `created`/`updated`, never `new Date()`.
- Any `datetime` **parameter** coerced by Zod (`z.coerce.date()`) arrives as a
  real `Date` object - convert with `.getTime()` before writing it to a
  `datetime` column.
- The resulting object won't satisfy TypeScript's `Date`-typed column
  signature; cast the whole `.values(...)` / `.set(...)` argument `as any`,
  exactly like `user-add.ts` does. This is a known, accepted pattern in this
  codebase - not a hack you're introducing.

If a "create" or "update" call comes back `500` with no body, suspect this
first - check the dev server's console/log for `Operation failed: Failed
query: insert into ...` before looking anywhere else.

### Delete (DELETE)

```typescript
await ctx.app.db
	.delete( table_name )
	.where( and(
		eq( table_name.id, id ),
		eq( table_name.domain, user.domain ?? '_' ),
	) )
	.run();
```

### Query Helpers

```typescript
import { and, eq, like, or } from './utils';

// Equality
eq( table.field, value );

// Multiple conditions
and( eq( table.field1, value1 ), eq( table.field2, value2 ) );

// OR conditions
or( eq( table.field1, value1 ), eq( table.field2, value2 ) );

// Pattern matching
like( table.name, `%${searchTerm}%` );
```

---

## Permission Checks

**The route already enforced its permission gate before your f2c block runs.** The gate is declared in the module JSON and generated into `index.ts` as `routeGet( m, { perms: ... } )`. A caller who fails it gets a `401` / `403` and never reaches your code. **Full model: `PERMISSIONS.md`.**

So inside the method you only add a check when the decision **depends on the row you just loaded** or **changes how much you return**:

### Case B - permission OR resource owner

```typescript
/*=== f2c_start method_name_headers ===*/
import { ERR_PERMISSION_DENIED, can_act_on } from '@backend/liwe3/core';
import { MODULE_PERM_ACTION } from '../perms';
/*=== f2c_end method_name_headers ===*/

/*=== f2c_start method_name ===*/
const row = await ctx.app.db.select().from( table ).where( eq( table.id, id ) ).get();
if ( !row ) return responseError( 'Not found', 404 );

// caller may act on their own row, or needs the permission for anyone else's
if ( !await can_act_on( ctx, [ MODULE_PERM_ACTION ], row.id_owner ) ) {
	return responseError( 'Permission denied', 403, ERR_PERMISSION_DENIED );
}
/*=== f2c_end method_name ===*/
```

The route gate for such an endpoint is `logged` in the JSON.

### Case C - the permission widens the scope

```typescript
import { capabilities } from '@backend/liwe3/core';

let query = ctx.app.db.select().from( users );
const cap = await capabilities( ctx, { seeAllDomains: [ 'system.admin' ] } );
if ( !cap.seeAllDomains ) query.where( eq( users.domain, user.domain ?? '_' ) );
```

### Case A - just "needs permission X"

Nothing to write. It is already the route gate. Do **not** add `if ( !await has_perms( ctx, [ MODULE_PERM_X ] ) ) ...` - it is dead code, and it makes the denial response inconsistent with every other endpoint.

### `has_perms` / `has_perms_sync` special values

| Value in the `perms` array  | Meaning                                     |
| --------------------------- | ------------------------------------------- |
| `'public'` or `'anyone'`    | Always true (no auth needed)                |
| `'logged'` or `'is-logged'` | True if the user has any permission         |
| `'system.admin'`            | Wildcard - always true if the user holds it |

---

## Pre-Completion Checklist

Before marking your implementation complete, verify:

- [ ] ✅ **Read JSDoc** - Checked `@permissions` and `@events` fields
- [ ] ✅ All code is **inside f2c blocks**
- [ ] ✅ All imports are in `f2c_start method_name_headers` block
- [ ] ✅ Using `responseSuccess()` / `responseError()` (not throwing exceptions)
- [ ] ✅ User authentication check if required (`const user = await ctx.user()`)
- [ ] ✅ **No redundant permission check** - not repeating the route's `{ perms }` gate; an in-method check only for case B (`can_act_on`) or case C (`capabilities`)
- [ ] ✅ Domain filtering on **all** database queries
- [ ] ✅ Try/catch around database operations
- [ ] ✅ Descriptive error messages with context
- [ ] ✅ **Events emitted BEFORE `responseSuccess()`** - If defined in JSDoc `@events`
- [ ] ✅ Inter-module calls use `liwe_event_call()` (not direct table access)
- [ ] ✅ Sensitive data filtered from responses (passwords, encrypted data)
- [ ] ✅ Early returns for validation/auth failures
- [ ] ✅ Proper TypeScript types (no `any` unless absolutely necessary)

---

## Common Mistakes

### Mistake 1: Forgetting Domain Filter

❌ **Wrong:**

```typescript
const items = await ctx.app.db.select().from( table );
```

✅ **Correct:**

```typescript
const user = await ctx.user();
if ( !user ) return responseError( 'Unauthorized', 401 );

const items = await ctx.app.db
	.select()
	.from( table )
	.where( eq( table.domain, user.domain ?? '_' ) );
```

---

### Mistake 2: Throwing Exceptions

❌ **Wrong:**

```typescript
if ( !user ) throw new Error( 'Unauthorized' );
```

✅ **Correct:**

```typescript
if ( !user ) return responseError( 'Unauthorized', 401 );
```

---

### Mistake 3: Importing Outside f2c Headers

❌ **Wrong:**

```typescript
import { mkid } from '@backend/liwe3/core'; // At top of file

/*=== f2c_start method_name_headers ===*/
/*=== f2c_end method_name_headers ===*/
```

✅ **Correct:**

```typescript
/*=== f2c_start method_name_headers ===*/
import { mkid } from '@backend/liwe3/core';
/*=== f2c_end method_name_headers ===*/
```

---

### Mistake 4: Querying Other Module Tables

❌ **Wrong:**

```typescript
import { user_users } from '@backend/modules/user/schema';
const users = await ctx.app.db.select().from( user_users );
```

✅ **Correct:**

```typescript
import { liwe_event_call } from '@backend/liwe3/core';
const result = await liwe_event_call( ctx, 'user', 'list', {} );
```

---

### Mistake 5: Re-checking the route's own gate

❌ **Wrong** - the route is already `routeBody( credentials_add, { perms: [ CREDENTIALS_PERM_CREATE ] } )`:

```typescript
import { CREDENTIALS_PERM_CREATE } from '../perms';

// dead code: a caller without credentials.create was already 403'd by the gate
if ( !( await has_perms( ctx, [ CREDENTIALS_PERM_CREATE ] ) ) ) {
	return responseError( 'Permission denied', 403, 'PERMISSION_DENIED' );
}
```

✅ **Correct** - trust the gate for case A; check in-method only when the rule needs the data:

```typescript
import { ERR_PERMISSION_DENIED, can_act_on } from '@backend/liwe3/core';

// case B: caller may edit their own credential, or needs the permission for others'
if ( !await can_act_on( ctx, [ CREDENTIALS_PERM_CREATE ], row.id_owner ) ) {
	return responseError( 'Permission denied', 403, ERR_PERMISSION_DENIED );
}
```

---

### Mistake 6: Emitting Events After Return

❌ **Wrong:**

```typescript
return responseSuccess( result );

await liwe_event_emit( ctx, EVENT_CREATE, result ); // Never executes!
```

✅ **Correct:**

```typescript
await liwe_event_emit( ctx, EVENT_CREATE, result );

return responseSuccess( result );
```

---

### Mistake 7: Forgetting .get() for Single Record

❌ **Wrong:**

```typescript
const user = await ctx.app.db.select().from( users ).where( eq( users.id, id ) );
// Returns array, even if only one result
```

✅ **Correct:**

```typescript
const user = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
// Returns single object or undefined
```

---

### Mistake 8: Not Using Validated Data

❌ **Wrong:**

```typescript
const { field1, field2 } = params; // Using unvalidated params
```

✅ **Correct:**

```typescript
const validation = MethodSchema.safeParse( params );
if ( !validation.success ) {
	return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
}
const { field1, field2 } = validation.data; // Using validated data
```

---

## Top 15 Most-Used Core APIs

### Responses (MOST IMPORTANT)

```typescript
// Success response
responseSuccess<T>(data?: T, status?: number): LiWEResponse<T>

// Error response
responseError(message: string, status?: number, code?: string): LiWEResponse<T>
```

### ID Generation

```typescript
// Generate unique ID with prefix
mkid(prefix: string): Promise<string>
// Returns: "prefix.hash.random" (e.g., "user.a1b2c3.x9y8")
```

### User & Permissions

```typescript
// Get current authenticated user
ctx.user(): Promise<LiWEUser | null>
// Usage: const user = await ctx.user();

// The route already enforced its { perms } gate. In-method, only:
can_act_on(ctx: LiWECtx, perms: string[], ownerId?: string | null): Promise<boolean>  // case B
capabilities(ctx: LiWECtx, spec: Record<string, string[]>): Promise<Record<string, boolean>>  // case C
has_perms(ctx: LiWECtx, perms: string[]): Promise<boolean>  // the primitive both use
```

### Events

```typescript
// Emit event to notify listeners
liwe_event_emit(ctx: LiWECtx, event: string, data?: any): Promise<LiWEResponse>

// Call another module's method
liwe_event_call<T>(
  ctx: LiWECtx,
  moduleName: string,
  methodName: string,
  params?: Record<string, any>
): Promise<LiWEResponse<T>>
```

### Crypto

```typescript
// Hash password for storage
hashPassword(password: string): Promise<string>

// Verify password against hash
verifyPassword(password: string, hashed: string): Promise<boolean>

// SHA-256 hash
sha256(text: string): Promise<string>

// SHA-512 hash
sha512(text: string): Promise<string>

// Encrypt data
encryptData(data: string, secret: string): Promise<string>

// Decrypt data
decryptData(encrypted: string, secret: string): Promise<string>
```

### Database

```typescript
// Drizzle D1 database instance
ctx.app.db;
// Methods: select(), insert(), update(), delete(), where(), get(), run()
```

### Drizzle Query Helpers

```typescript
import { and, eq, like, or, sql } from './utils';

eq( column, value ); // Equality: WHERE column = value
and( ...conditions ); // AND: WHERE cond1 AND cond2
or( ...conditions ); // OR: WHERE cond1 OR cond2
like( column, pattern ); // LIKE: WHERE column LIKE pattern
sql`...`; // Raw SQL
```

### Type Conversion

```typescript
// Convert to integer (returns 0 if falsy)
int(value: any): number

// Convert to float (returns 0.0 if falsy)
float(value: any): number
```

---

## Complete Code Examples

### Example 1: Create with Events and Inter-module Call

**File:** `@backend/modules/comment/src/methods/comment-add.ts`

```typescript
/*=== f2c_start comment_add ===*/
const user = await ctx.user();
if ( !user ) return responseError( 'User not authenticated', 401, 'UNAUTHORIZED' );

const comm : Comment = {
	id: mkid( 'comm' ),
	domain: user.domain ?? '_',
	id_user: user.id,
	module,
	id_obj,
	comment,
	id_follow_up,
};

await ctx.app.db.insert( comment_comments ).values( comm ).run();

const res = await ctx.app.db.select().from( comment_comments ).where( and(
	eq( comment_comments.id, comm.id ),
) ).get();

if ( !res ) return responseError( 'Failed to retrieve the added comment', 500, 'RETRIEVAL_ERROR' );

const ci : CommentItem = {
	id: res.id,
	created: res.created!,
	comment: res.comment,
	user: {
		id: user.id,
		username: user.username,
	},
};

// Emit event
await liwe_event_emit( ctx, COMMENT_EVENT_ADD, {
	id: ci.id,
	domain: user.domain ?? '_',
	module,
	id_obj,
	id_user: ci.user.id,
} );

// Log to activity log (inter-module call)
await liwe_event_call( ctx, 'activitylog', 'event.add', {
	domain: user.domain ?? '_',
	event: 'comment.add',
	module,
	id_user: ci.user.id,
	data: {
		id_obj,
		username: ci.user.username,
	},
} );

return responseSuccess( ci );
/*=== f2c_end comment_add ===*/
```

**Patterns used:**

- ✅ User authentication
- ✅ ID generation with `mkid()`
- ✅ Domain scoping
- ✅ Database insert and retrieve
- ✅ Event emission
- ✅ Inter-module call
- ✅ Proper error handling

---

### Example 2: CRUD with SysParams Override

**File:** `@backend/modules/user/src/methods/user-add.ts`

```typescript
/*=== f2c_start user_add ===*/
let userDomain : string = '';
if ( sys?.skip_permissions_check == true ) {
	userDomain = sys?.domain || '__no_domain';
} else {
	userDomain = ( await ctx.user() )?.domain || '__no_domain';
}

try {
	const userData : User = {
		id: id ?? '',
		username: username ?? '',
		email: email ?? '',
		name: name ?? '',
		lastname: lastname ?? '',
		perms: ( perms as any ) ?? '',
		enabled: enabled ?? true,
		password: '',
		domain: userDomain,
		level: 0,
	};

	// if there is a forced domain in SysParams, use it
	if ( sys?.domain ) userData.domain = sys.domain;

	// Generate ID if not provided
	if ( !userData.id ) {
		userData.id = mkid( 'user' );
		params.id = userData.id;
	}

	// Hash the password before storing it
	userData.password = await hashPassword( password ?? 'n0p4ssw0rd' );

	// Insert user into database
	await ctx.app.db.insert( users ).values( userData ).run();
	const user = await ctx.app.db.select().from( users ).where( eq( users.id, userData.id ) ).get();

	if ( !user ) return responseError( 'User creation failed', 500 );

	// Return user data without sensitive fields
	user.domain = null;
	user.password = null;

	return responseSuccess( user as any );
} catch ( error ) {
	if ( error instanceof Error ) {
		throw error;
	}
	throw new Error( 'Unknown error occurred' );
}
/*=== f2c_end user_add ===*/
```

**Patterns used:**

- ✅ SysParams domain override
- ✅ Conditional ID generation
- ✅ Password hashing
- ✅ Try/catch error handling
- ✅ Sensitive data filtering

---

### Example 3: Complete CRUD with Specific Permissions and Events

**File:** `@backend/modules/credentials/src/methods/credentials-add.ts`

```typescript
/*=== f2c_start credentials_add_headers ===*/
import { encryptData, liwe_event_emit, mkid } from '@backend/liwe3/core';
import { credentials_items } from '../schema';
import { CREDENTIALS_EVENT_CREATE } from '../events';
/*=== f2c_end credentials_add_headers ===*/

/**
 * Add a new credentials to the system.
 * If `data_enc` is passed to the endpoint, it will be encoded before being saved.
 *
 * @permissions credentials.create  // ← the route gate: routeBody(credentials_add, { perms: [ CREDENTIALS_PERM_CREATE ] })
 * @events credentials.create       // ← Emit CREDENTIALS_EVENT_CREATE
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {CredentialsAddParams} params - Request parameters
 * @param {LiWESysParams} [sys] - System parameters
 *
 * @returns {Promise<LiWEResponse<CredentialsItem>>} Result object
 */
export const credentials_add = async (...) => {
  // Validation code here (OUTSIDE f2c block)...

/*=== f2c_start credentials_add ===*/
// The route gate already enforced credentials.create - no has_perms() here.
const user = await ctx.user();
if (!user) return responseError('Unauthorized', 401);

try {
  // Encrypt data_enc if provided
  let encryptedData: string | undefined;
  if (data_enc) {
    const secret = ctx.app.cfg.site.secret;
    if (!secret) return responseError('Encryption secret not configured', 500, 'CONFIG_ERROR');
    encryptedData = await encryptData(data_enc, secret);
  }

  // Create new credential record
  const newCredential = {
    id: mkid('cred'),
    domain: user.domain ?? '_',
    id_owner: user.id,
    name,
    type,
    metadata,
    data_enc: encryptedData,
  };

  // Insert into database
  await ctx.app.db.insert(credentials_items).values(newCredential).run();

  // Retrieve the created record
  const created = await ctx.app.db
    .select()
    .from(credentials_items)
    .where(eq(credentials_items.id, newCredential.id))
    .get();

  if (!created) return responseError('Failed to retrieve created credential', 500, 'RETRIEVAL_ERROR');

  // Convert to result type (exclude sensitive data)
  const result: CredentialsItem = {
    id: created.id,
    domain: created.domain,
    id_owner: created.id_owner,
    name: created.name,
    type: created.type,
    metadata: created.metadata,
    data_enc: undefined, // Do not return encrypted data
  };

  // IMPORTANT: Emit event BEFORE responseSuccess
  await liwe_event_emit(ctx, CREDENTIALS_EVENT_CREATE, result);

  return responseSuccess(result);
} catch (error) {
  if (error instanceof Error) {
    return responseError(`Failed to add credential: ${error.message}`, 500);
  }
  return responseError('Unknown error occurred', 500);
}
/*=== f2c_end credentials_add ===*/
```

**Patterns used:**

- ✅ User authentication
- ✅ Permission enforced by the route gate (`{ perms: [ CREDENTIALS_PERM_CREATE ] }`), not re-checked in the method
- ✅ Domain scoping
- ✅ ID generation
- ✅ Data encryption
- ✅ Database insert and retrieve
- ✅ Sensitive data filtering
- ✅ **Event emission BEFORE responseSuccess**
- ✅ Descriptive error handling

---

## Troubleshooting FAQ

### Q: Why is `ctx.user()` null?

- Route is not protected by session middleware
- User is not logged in
- Session token is invalid/expired
- For public endpoints, this is expected

### Q: My query returns empty array despite data existing

- Verify domain filtering: `eq(table.domain, user.domain ?? '_')`
- Check test data has correct domain value
- Ensure user object has correct domain

### Q: How do I access data from another module?

- Use `liwe_event_call(ctx, 'moduleName', 'methodName', params)`
- **Never** import and query another module's tables directly
- This maintains module isolation

### Q: Should I use `.run()` or `.get()` after query?

- `.run()` → For `insert()`, `update()`, `delete()` operations
- `.get()` → For `select()` when you want a **single record**
- No suffix → For `select()` when you want an **array of records**

### Q: How do I handle optional parameters?

- Zod schema should have `.optional()` for optional fields
- Use destructuring with defaults: `const { field = 'default' } = validation.data`

### Q: Where do I put my imports?

- **ALL imports** go in `f2c_start method_name_headers` block
- Never import outside f2c blocks

### Q: Can I modify the Zod schema or function signature?

- **NO** - These are generated externally and will be overwritten
- Only modify code inside `f2c_start`/`f2c_end` blocks

### Q: How do I know which permission to check and which event to emit?

1. **READ the JSDoc comment** above the method (outside f2c blocks)
2. Look for `@permissions PERMISSION_CONSTANT`
3. Look for `@events EVENT_CONSTANT`
4. Import the constants from `../perms` and `../events`

---

## Related Documentation

All files live in `work/agents/`.

| Document                   | Purpose                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `INDEX.md`                 | Which doc to read for which task                                                                                            |
| `MODULE_CREATION.md`       | Module structure, file organization, the f2c / regeneration workflow                                                        |
| `MODULE_JSON_REFERENCE.md` | JSON schema: endpoints, types, fields, the `permissions` block, events                                                      |
| `PERMISSIONS.md`           | Access control end to end: route gates, `has_perms` / `capabilities` / `can_act_on`, the JSON-to-gate pipeline, audit tests |
| `LIWE3-BACKEND.md`         | `@backend/liwe3/core` API reference (signatures, return types, behavior)                                                    |
| `TESTING_RESTEST.md`       | ResTest JSON testing format                                                                                                 |
