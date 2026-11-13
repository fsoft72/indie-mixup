# LiWE3 Backend Core API Reference

## When to Read This File

Read this file when you are:

- **Importing anything from `@backend/liwe3/core`** and need to know what is exported and how to use it
- **Writing method implementations** and need the exact signature of `responseSuccess`, `responseError`, `has_perms`, `liwe_event_emit`, etc.
- **Setting up a new module's `module_init()`** and need `LiWEApp`, `permissions_register`, route helpers
- **Working with sessions, JWT, passwords, TOTP, or encrypted DB columns**
- **Debugging a type error** coming from a core export

**Do not read this file** if you only need the f2c implementation patterns (read `METHOD_IMPLEMENTATION.md`) or the module JSON schema (read `MODULE_JSON_REFERENCE.md`). This file documents _what the library gives you_, not _how to structure a module_.

**Source of truth:** `liwe3/backend/core/src/`. This package is framework code - **read only, never modify**. All exports below are pulled from `liwe3/backend/core/src/index.ts`, which re-exports every module listed here except where noted.

---

## Quick Reference Table

| Need to...                                 | Use                                                                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Build success/error API responses          | `responseSuccess`, `responseError`, `responseRaw`, `LiWEResponse`                                                                      |
| Check user authentication                  | `await ctx.user()` (on the request `LiWECtx`)                                                                                          |
| Check permissions (has at least one)       | `has_perms(ctx, perms)` / `has_perms_sync(user, perms)`                                                                                |
| "permission OR resource owner"             | `can_act_on(ctx, perms, ownerId?)`                                                                                                     |
| Resolve several capabilities at once       | `capabilities(ctx, { name: perms[] })`                                                                                                 |
| Declare the permission gate of a route     | `routeGet(m, { perms })` / `routeBody(m, { perms })` / `routeRaw(m, { perms })` (generated)                                            |
| Register module permissions                | `permissions_register({ module, perms })`                                                                                              |
| Validate params against a Zod schema       | `paramsValidation(schema, params)`                                                                                                     |
| Generate a unique ID                       | `mkid(prefix?, ext?)`                                                                                                                  |
| Hash / verify a password                   | `hashPassword`, `verifyPassword`                                                                                                       |
| Create / verify a JWT                      | `jwtCreate`, `jwtVerify`                                                                                                               |
| Create / read a session                    | `sessionCreate`, `sessionGet`, `sessionDestroy`, `sessionRefresh`                                                                      |
| Emit / listen to inter-module events       | `liwe_event_emit`, `liwe_event_register`, `liwe_event_call`                                                                            |
| Wrap a GET/body Hono handler (+ its gate)  | `routeGet(m, { perms })`, `routeBody(m, { perms })`                                                                                    |
| Wrap a raw-body handler (binary upload)    | `routeRaw(m, { perms })` - gate only, never reads the body                                                                             |
| Introspect the declared route gates        | `GET /api/system/admin/routes/list` (gated `system.admin`)                                                                             |
| Send an email via SES                      | `sendMail`                                                                                                                             |
| Get an email template (verify/reset)       | `getVerificationEmail`, `getPasswordResetEmail`                                                                                        |
| Store encrypted data in a D1 column        | `secret`, `secretjson` (Drizzle custom types)                                                                                          |
| Store a `Date` as a Unix timestamp column  | `timestampDate`                                                                                                                        |
| Format/parse dates                         | `date_format`, `date_get`, `parseTime`                                                                                                 |
| Log something                              | `ctx.app.log` (or `logger` directly)                                                                                                   |
| Standard error codes                       | `error-codes.ts` constants (`ERR_NOT_FOUND`, ...)                                                                                      |
| Set up env vars / bindings per environment | [Environment variables & bindings](#environment-variables--bindings-wranglerjsonc) (`DEV_MODE`, `ALLOWED_ORIGINS`, `RL_AUTH`/`RL_2FA`) |

---

## `LiWEApp` (`app.ts`)

The central application object. One instance per Worker, created via `app_init(name, env)`. It wraps the Hono app, the D1 database, KV and config.

**`LiWEApp` holds no per-request state.** Cloudflare reuses the same isolate for concurrent requests, so anything mutable stored on it would leak across requests. The current user and session live on the per-request [`LiWECtx`](#request-context-ctxts) instead.

```typescript
import { LiWEApp, app_init } from '@backend/liwe3/core';

const app = app_init( 'my-app', env ); // sets up CORS, logging, session middleware
```

### Key properties/getters

| Member           | Type                | Notes                                                                         |
| ---------------- | ------------------- | ----------------------------------------------------------------------------- |
| `app.name`       | `string`            | App name passed to constructor                                                |
| `app.env`        | `any`               | Raw Cloudflare Worker env bindings                                            |
| `app.isDev`      | `boolean`           | True if `DEV_MODE=true` or running under Miniflare                            |
| `app.cfg`        | `AppConfig`         | Parsed config (see `config.ts`); populated by `loadConfigFromString()`        |
| `app.db`         | `DrizzleD1Database` | Lazily created Drizzle instance bound to `env.DB`. Throws if `env.DB` missing |
| `app.kv`         | `KVNamespace`       | `env.KV`. Throws if missing                                                   |
| `app.hono`       | `Hono`              | The underlying Hono app - use to register routes                              |
| `app.fetch`      | `Hono['fetch']`     | Worker fetch handler entry point                                              |
| `app.log`        | `logger`            | Logging façade, see [Logger](#logger-loggerts)                                |
| `app.isTestMode` | `boolean`           | True after `useTestDB()`                                                      |

### Key methods

- `loadConfigFromString(jsonString, options?)` - parses `config.json`, resolves `{{VAR}}` templates from env, configures the logger and DB secret. Call once at startup.
- `moduleRegister(initFn, seedFn?)` - runs a module's `module_init(app)` immediately; stores `seedFn` for replay after test DB resets. **Every LiWE3 module calls this.**
- `useTestDB()` / `useMainDB()` - switch `app.db` between `env.DB` and `env.DB_TEST` (used by ResTest).
- `replayModuleSeeders()` - re-runs all registered seed functions (used after wiping the test DB).
- `queueAdd(action, handler)` / `queueExec(message)` - register and dispatch Cloudflare Queue consumers by `message.body.action`. `handler: (ctx, message) => Promise<void>`; queues run outside any request, so `queueExec` builds a system ctx via `ctxSystem(app)`.

### `app_init(name, env)`

Creates a `LiWEApp`, then wires:

1. CORS (dynamic origin in dev, `ALLOWED_ORIGINS` env var in prod)
2. `requestLoggerMiddleware` - request/response logging with request IDs
3. `app` set into Hono context (`c.get('app')`)
4. `ctxMiddleware` - resolves the session from the JWT bearer token and sets the request `LiWECtx` into `c.get('ctx')`
5. `userContextMiddleware` - adds `userId`/`domain` to the logger context
6. A `GET /api/_dbg/hello` debug route, and `GET /api/system/admin/routes/list` (gated `system.admin`, returns every route's declared gate)

Rate limiting on the credential endpoints (`/api/user/login`, `/token/refresh`, `/set/password`, `/2fa/verify`) is **not** wired here - the `user` module does it in its `module_init` f2c block, so core stays module-agnostic. No-op when the `RL_*` bindings are absent (local dev).

You typically call this once in the Worker entry point (`app/worker/`), never inside a module.

---

## Environment variables & bindings (`wrangler.jsonc`)

The core reads these from `env` (the Cloudflare Worker bindings). Each named environment in `wrangler.jsonc` (`env.stage`, `env.prod`, ...) is **independent** - wrangler does **not** inherit `vars`, `ratelimits`, `d1_databases`, etc. into a named environment, so every one of these must be repeated per environment.

### `DEV_MODE` (var, `"true"` / `"false"`)

Drives `app.isDev`. When `"true"` (or running under Miniflare): CORS reflects the caller origin, `useTestDB()` is allowed, the public-routes boot log fires. **Must be `"false"` in stage/prod.**

### `ALLOWED_ORIGINS` (var, comma-separated origins)

The CORS allowlist. Behaviour depends on `DEV_MODE`:

| `DEV_MODE` | `ALLOWED_ORIGINS`                                                     | Result                                                                                  |
| ---------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `"true"`   | anything (or unset)                                                   | dev reflects the caller origin                                                          |
| `"false"`  | empty **or** contains `*`                                             | **`app_init` throws at boot** - the worker does not start (fail fast, never start open) |
| `"false"`  | explicit list, e.g. `https://app.example.com,https://www.example.com` | exactly those origins get `Access-Control-Allow-Origin`                                 |

A placeholder like `REPLACE_WITH_PROD_ORIGINS` passes the boot check (it is neither empty nor `*`) but then **no real browser origin matches**, so every cross-origin call from the frontend fails silently. Replace it with the actual front-end origin(s) before deploying.

### `RL_AUTH` / `RL_2FA` (rate-limit bindings)

Cloudflare's native Workers rate limiting. Declared as:

```jsonc
"ratelimits": [
  { "name": "RL_AUTH", "namespace_id": "1001", "simple": { "limit": 10, "period": 60 } },
  { "name": "RL_2FA",  "namespace_id": "1002", "simple": { "limit": 5,  "period": 60 } }
]
```

- `name` is the binding the code reads (`rateLimitMiddleware('RL_AUTH', ...)` → `env.RL_AUTH`).
- `namespace_id` is an integer **you choose** - not a resource to create in the dashboard, just a label that scopes the counters. Two Workers using the same `namespace_id` share a bucket. Counters are per-datacentre and best-effort, not globally strict.
- When the binding is **absent**, `rateLimitMiddleware` is a **no-op** - so a stage/prod environment with no `ratelimits` block has **no throttling on login / 2FA / token refresh**. Add the block to `env.stage` and `env.prod`.
- The limit is **skipped for local development traffic** (`isLocalDev`): `app.isDev` (`DEV_MODE` or Miniflare) **and** a loopback client (`127.0.0.1`, `::1`) or no `CF-Connecting-IP` header. Without it a ResTest run (all requests from the same address, a few seconds) would answer 429 after 10 logins. Outside dev mode nothing is skipped, and a deployed worker with `DEV_MODE` set by mistake is still limited, since its clients have public addresses.

The `user` module wires these in its `module_init` (see the `app_init` note above): `RL_AUTH` on `/api/user/login`, `/token/refresh`, `/set/password`, `/password/change-expired`; `RL_2FA` on `/api/user/2fa/verify`.

### Other bindings the core expects

`DB` (D1, required - `app.db` throws without it), `KV` (required for sessions), `UPLOAD_BUCKET` / `THUMBNAIL_BUCKET` (R2, upload module), `THUMBNAIL_QUEUE` (queue producer), `ASSETS` (static assets fetcher). Config-file secrets (`jwt.secret`, `db.secret`, `ses.*`) come from `config.json` with `{{VAR}}` templating resolved from `env` - see [Config](#config-configts).

---

## Request context (`ctx.ts`)

`LiWECtx` is the object representing **one in-flight request**. It is built once by `ctxMiddleware` and passed explicitly as the first argument of every method, event handler and queue action.

```typescript
export interface LiWECtx {
	app : LiWEApp; // shared, stateless resources (db, kv, cfg, log, hono)
	c : Context | null; // Hono context, null outside HTTP (queues, seeders, cron)
	sessionId : string | null; // null when unauthenticated
	session : () => Promise<SessionData | null>; // memoized: at most one KV fetch per request
	user : () => Promise<LiWEUser | null>; // null when unauthenticated
}
```

**Never store a `LiWECtx` on `LiWEApp`, in a module-level variable, or in any structure that outlives the request.** That is exactly the leak this design removes.

| Helper                                     | Purpose                                                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `ctxCreate(app, c, sessionId, getSession)` | Builds a ctx with a memoized session resolver. Called by `ctxMiddleware`; you rarely call it directly          |
| `ctxSystem(app, user?)`                    | Ctx for code running outside a request (queue consumers, seeders, cron, tests). `c` and `sessionId` are `null` |
| `ctxAsUser(ctx, user)`                     | Derives a ctx bound to another user (impersonation, system calls that must run as a given user)                |

Inside an f2c block:

```typescript
const user = await ctx.user();
if ( !user ) return responseError( 'Unauthorized', 401 );

// NOTE: the route already enforced its permission gate (see PERMISSIONS.md).
// Do NOT re-check the same permission here. An in-method check is for the
// data-dependent cases only:
//   permission OR owner   -> can_act_on( ctx, [ MODULE_PERM_ACTION ], row.id_owner )
//   permission widens scope -> capabilities( ctx, { seeAll: [ 'system.admin' ] } )

const rows = await ctx.app.db.select().from( table ).where( eq( table.domain, user.domain ?? '_' ) );
```

| Old (shared state - removed)                              | New                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| `await app.user`                                          | `await ctx.user()`                                          |
| `has_perms(app, ...)`                                     | `has_perms(ctx, ...)`                                       |
| `app.sessionId`                                           | `ctx.sessionId`                                             |
| `app.db` / `app.kv` / `app.cfg` / `app.log`               | `ctx.app.db` / `ctx.app.kv` / `ctx.app.cfg` / `ctx.app.log` |
| `liwe_event_emit(app, ...)` / `liwe_event_call(app, ...)` | `liwe_event_emit(ctx, ...)` / `liwe_event_call(ctx, ...)`   |

---

## Responses (`response.ts`)

Every API method returns a `LiWEResponse<T>`. **Never `throw` inside an f2c block** - always return one of these.

```typescript
type LiWEResponse<T = any> = {
	ok : boolean;
	status : ContentfulStatusCode;
	data? : T;
	message? : string;
	error? : { message : string; code? : string; level? : 'info' | 'warning' | 'error' };
	response? : Response; // raw Response passthrough (files/streams)
};
```

- `responseSuccess(data?, status = 200)` - success response.
- `responseError(message, status = 400, code = '', level = 'error', options?)` - error response. Automatically logs via `app`'s `logger` (server errors as `error`, 4xx as `warn`) unless `options.silent` is `true`. `options.error` attaches a stack trace, `options.context` adds structured log fields.
- `responseRaw(response: Response)` - wraps a raw `Response` (e.g. file download) so `routeGet`/`routeBody` return it directly.
- `createResponse(error?, data?, status?, rawResponse?)` - low-level constructor used by the helpers above; rarely called directly.

---

## Routes (`routes.ts`, `route-map.ts`)

Thin adapters between Hono and LiWE3 method functions (`(ctx, params, sys?) => Promise<LiWEResponse>`). **Wired up by generated module code - you never call them by hand.**

Both take a **required** second argument, the permission gate:

```typescript
export const PUBLIC = 'public' as const;   // no authentication
export const LOGGED = 'logged' as const;   // any authenticated user
export type RouteGate = typeof PUBLIC | typeof LOGGED | string[];   // string[] = "at least one of"

export interface RouteOptions { perms : RouteGate; description? : string; }

routeGet ( method : MethodFn, options : RouteOptions ) => Hono handler
routeBody( method : MethodFn, options : RouteOptions ) => Hono handler
routeRaw ( method : MethodFn, options : RouteOptions ) => Hono handler
```

- All three read the per-request ctx from `c.get('ctx')` (500 `NO_REQUEST_CTX` if `ctxMiddleware` did not run).
- `_gateCheck( ctx, options.perms )` runs **before the body is parsed**: `PUBLIC` -> allow; `LOGGED` -> allow iff `ctx.user()` is non-null; `string[]` -> `has_perms( ctx, perms )`. On failure: `401 ERR_UNAUTHORIZED` when unauthenticated, `403 ERR_PERMISSION_DENIED` when authenticated but not permitted.
- `routeGet` then reads `c.req.query()` as params; `routeBody` parses the JSON body (empty/malformed tolerated as `{}`) and converts a thrown error to a `responseError`.
- Registration also records `{ name, perms, description }` in the route map (`routeMapAdd`), consumed by `GET /api/system/admin/routes/list` and the route-audit tests.

### `routeRaw` - raw-body handlers (binary uploads, streams)

Same ctx + gate + route-map wiring as `routeBody`, but it **never reads or parses the request body**. It calls `method( ctx )` (no params argument) and the method pulls what it needs straight off `ctx.c.req` - headers, `arrayBuffer()`, `blob()`, `text()`.

Why it exists: Hono caches the first read of a request body. A `routeBody` handler does `await c.req.json()` before the method runs, so on a binary payload the JPEG bytes get decoded as a UTF-8 string (the parse fails and is swallowed) and a later `ctx.c.req.arrayBuffer()` inside the method re-encodes that string - every non-ASCII byte comes back as U+FFFD (`EF BF BD`), silently corrupting the upload. `routeRaw` leaves the body stream untouched for the method.

Used by `/api/upload/part` (reads `X-Upload-Id` / `X-Key` / `X-Part-Number` headers + the raw `arrayBuffer()` body). The module JSON has no "raw route" flag, so if the upload module's `index.ts` is regenerated this wiring must be reapplied by hand.

`routeGet( method )` with no gate does not compile. The gate is generated from the module JSON - see **`PERMISSIONS.md`** for the full pipeline.

---

## Permissions (`permissions.ts`)

> **Full model in `PERMISSIONS.md`.** This section is just the signatures.

```typescript
permissions_register( { module: 'comment', perms: [ { name: 'comment.create', description: '...' } ] } ); // once in module_init
permissions_list_full(); // -> Record<module, SystemPermission[]>, consumed by /system/admin/permissions/list
```

### `has_perms` / `has_perms_sync`

```typescript
await has_perms( ctx : LiWECtx, perms : string[] ) : Promise<boolean>
has_perms_sync( user : LiWEUser | null, perms : string[] ) : boolean   // same rules, no await ctx.user()
```

Rules, top to bottom: `perms` empty -> `false`; contains `'public'`/`'anyone'` -> `true`; no user -> `false`; user has `system.admin` -> `true` (wildcard); contains `'logged'`/`'is-logged'` -> `true` iff the user has any permission; else `true` iff `user.perms` and `perms` intersect.

### `capabilities` - resolve several checks in one pass

```typescript
await capabilities( ctx, { seeAllDomains: [ 'system.admin' ], canPublish: [ 'blog.publish' ] } );
// -> { seeAllDomains: boolean, canPublish: boolean }   (session resolved once)
```

Use when a method behaves differently per permission ("case C": the permission widens scope, it does not gate).

### `can_act_on` - permission OR resource owner

```typescript
await can_act_on( ctx, perms : string[], ownerId? : string | null ) : Promise<boolean>
// false if no user; true if ownerId === caller id; else has_perms(...)
```

Use for the "you can act on your own row, or you need the permission for anyone else's" pattern ("case B"). The route gate for such an endpoint is usually `LOGGED`.

> The route gate already enforces the simple "needs permission X" case ("case A"). Do **not** repeat `has_perms([ MOD_PERM_X ])` in the method when `{ perms: [ MOD_PERM_X ] }` is already on the route.

---

## Sessions (`session.ts`)

Sessions are stored in KV as `session:{sessionId}`, with a per-user index at `user_session_idx:{userId}:{sessionId}` (used for "logout everywhere" enumeration).

| Function                                                    | Purpose                                                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionCreate(kv, domain, userId, options, tokenVersion?)` | Creates a session, returns `sessionId`. `options.expiresIn` (seconds) required                                                                    |
| `sessionGet(kv, domain, sessionId)`                         | Fetches session data; auto-deletes and returns `null` if expired                                                                                  |
| `sessionDestroy(kv, domain, sessionId, userId?)`            | Deletes the session (and index entry if `userId` given)                                                                                           |
| `sessionRefresh(kv, domain, sessionId, expiresIn)`          | Extends expiration                                                                                                                                |
| `sessionUpdateMetadata(kv, domain, sessionId, metadata)`    | Merges new metadata into the session                                                                                                              |
| `sessionListIds(kv, userId)`                                | Lists all active session IDs for a user                                                                                                           |
| `sessionResolve(c, app, domain)`                            | Reads and verifies the `Authorization: Bearer <jwt>` header; returns `{ sessionId, getSession }` for the current request. Writes nothing on `app` |
| `ctxMiddleware(app, domain)`                                | Hono middleware: calls `sessionResolve` and sets the request `LiWECtx` into `c.get('ctx')`. Wired automatically by `app_init()`                   |

`SessionData` shape: `{ userId, sessionId, createdAt, expiresAt, tokenVersion?, metadata? }`. `ctx.user()` reads `session.metadata` and casts it to `LiWEUser`.

---

## Crypto (`crypto.ts`)

| Function                                                                                                       | Purpose                                                                                                     |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `sha256(text)` / `sha512(text)`                                                                                | Hex digest                                                                                                  |
| `hashPassword(password)`                                                                                       | PBKDF2 (100k iterations, SHA-512) -> `salt$hash` hex string                                                 |
| `verifyPassword(password, hashed)`                                                                             | Constant-time comparison against `hashPassword` output                                                      |
| `jwtCreate(payload, secret, expiresIn)`                                                                        | HS256 JWT, `secret` is SHA-256-hashed internally, `expiresIn` in seconds (max 30 days)                      |
| `jwtVerify(token, secret)`                                                                                     | Verifies signature, algorithm, and expiry; returns payload or `null`                                        |
| `obfuscate(text, key)` / `deobfuscate(hex, key)`                                                               | Synchronous XOR + hex encoding. **Not real encryption** - used by the `secret`/`secretjson` DB column types |
| `encryptData(data, secret)` / `decryptData(str, secret)`                                                       | AES-GCM (PBKDF2-derived key), returns/accepts `"ivBase64:cipherBase64"`                                     |
| `totpSecretGenerate(byteLength = 20)`                                                                          | Base32 TOTP secret                                                                                          |
| `totpGenerate(secret, time?, digits?, period?)` / `totpVerify(secret, code, time?, window?, digits?, period?)` | RFC 6238 TOTP, `totpVerify` tolerates clock skew of `window` steps                                          |
| `totpOtpauthUrl(secret, label, issuer)`                                                                        | Builds `otpauth://` URL for QR-code enrollment                                                              |

Use `hashPassword`/`verifyPassword` for user passwords, `jwtCreate`/`jwtVerify` for auth tokens (already used internally by `session.ts`), and TOTP helpers for 2FA.

---

## Database helpers (`db.ts`)

Drizzle/D1-specific utilities.

- `sqlDump(query)` - renders a Drizzle query builder or `SQL` object to a debug-friendly SQL string with inlined params. **Debug only, never execute the output.**
- `drizzleGetRecursiveRelatedIds(db, table, idColumn, followUpColumn, initialIds)` - BFS traversal of a self-referencing table (e.g. comment threads), returns all descendant IDs including the initial ones.
- `setDBSecret(secret)` - must be called once (done automatically by `LiWEApp.loadConfigFromString()` from `app.cfg.db.secret`) before using the encrypted column types below.
- `secret` - Drizzle `customType` for a single obfuscated text column.
- `secretjson<TData>(name)` - Drizzle `customType` for an obfuscated JSON column; stringifies/parses automatically.
- `timestampDate` - Drizzle `customType` that stores a `Date` (or ms/seconds number) as a Unix-seconds integer column, and always returns a `Date` on read.

```typescript
import { secret, secretjson, timestampDate } from '@backend/liwe3/core';

export const my_table = sqliteTable( 'my_table', {
	api_key: secret( 'api_key' ),
	config: secretjson<MyConfigType>( 'config' ),
	created_at: timestampDate( 'created_at' ).$defaultFn( () => new Date() ),
} );
```

---

## Events (`events.ts`)

Inter-module communication without direct imports/table access.

- `liwe_event_register(event, handler)` - `handler: (ctx, data) => Promise<LiWEResponse>`. Event names are lowercased/trimmed. The ctx is the emitter's request ctx, so handlers see the same user.
- `liwe_event_emit(ctx, event, data?)` - calls all registered handlers in parallel, catches individual handler errors (converted to an error response in the results array), returns `responseSuccess(responses[])`.
- `liwe_event_unregister(event, handler)`
- `liwe_event_list()` - all registered event names.
- `liwe_event_call<T>(ctx, moduleName, methodName, parameters?)` - RPC-style helper for events named `"module.call.method"`. Requires **exactly one** handler to be registered for that event; unwraps and returns its `LiWEResponse<T>` (or a `NO_HANDLERS_RESPONSE` error if none responded).

**Rule (see `METHOD_IMPLEMENTATION.md`):** never query another module's tables directly - always go through `liwe_event_call` or a dedicated `event.emit`.

---

## Config (`config.ts`)

Loads `config.json` and resolves `{{VARIABLE_NAME}}` templates from `env`.

- `configLoad<T>(configData, options?)` / `configLoadFromJSON<T>(jsonString, options?)` - options: `{ env, defaults }`. Post-processes `jwt.expiresIn`/`jwt.refreshTokenDuration` through `parseTime()`.
- **A missing `{{VAR}}` never throws.** It is replaced with the literal string `"VAR"` (as its own placeholder value), reported in `ConfigLoadResult.missingVariables`, and logged once via `logger.warn`. Only a genuinely malformed config JSON is fatal. So one unset `.dev.vars` key / wrangler secret degrades that one value, it does not take the whole Worker to 500. (`strict` is still accepted in the options for API compatibility but is a no-op.)
- `templateValidation(configData, env?, defaults?)` - returns the array of missing variable names without logging.
- `templateExtractVars(configData)` - lists every `{{VAR}}` reference in a config object.
- `createConfigLoader<T>()` - typed convenience wrapper around the two loaders above.

`AppConfig` shape (extend via the `[key: string]: any` index for module-specific config): `jwt`, `site`, `system`, `ses`, `log?`, `db?`.

Normally you don't call these directly - `LiWEApp.loadConfigFromString()` does it for you at startup and also configures the logger and DB secret from the result.

---

## Logger (`logger.ts`)

Structured logger with per-request context, exported as both `logger` and `app.log` (same instance).

```typescript
app.log.info( 'Operation completed', { userId: 123 } );
app.log.error( 'Failed to process', error, { context: 'payment' } );
```

| Function                                                             | Purpose                                                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `logger.debug/info/warn(message, context?)`                          | Standard levels, filtered by configured `minLevel`                                                                                    |
| `logger.error/fatal(message, error?, context?)`                      | Accepts an `Error` for stack trace capture                                                                                            |
| `logger.always(message, context?)`                                   | Bypasses the level filter                                                                                                             |
| `configureLogger(options)`                                           | Sets `minLevel`, `includeStack`, `prettyPrint`. Called by `LiWEApp` from `app.cfg.log`                                                |
| `createRequestId()`                                                  | `req_` + 8 random chars, used by `requestLoggerMiddleware`                                                                            |
| `setRequestContext` / `updateRequestContext` / `clearRequestContext` | Request-scoped context (requestId, userId, domain, timing); managed by the two middlewares below - don't call manually inside methods |

`requestLoggerMiddleware(app?)` and `userContextMiddleware(app)` (in `middleware/`) are wired automatically by `app_init()`.

---

## Error codes (`error-codes.ts`)

Constants for the `code` argument of `responseError`. Use these instead of ad-hoc strings.

```
ERR_UNAUTHORIZED, ERR_PERMISSION_DENIED, ERR_SESSION_EXPIRED
ERR_VALIDATION, ERR_INVALID_INPUT, ERR_MISSING_FIELD
ERR_NOT_FOUND, ERR_ALREADY_EXISTS, ERR_CONFLICT
ERR_DB_ERROR, ERR_DB_CONSTRAINT, ERR_DB_CONNECTION
ERR_EXTERNAL_SERVICE, ERR_API_ERROR, ERR_TIMEOUT
ERR_STORAGE_ERROR, ERR_FILE_NOT_FOUND, ERR_UPLOAD_FAILED
ERR_RATE_LIMITED, ERR_QUOTA_EXCEEDED
ERR_INTERNAL, ERR_NOT_IMPLEMENTED
```

## Error context (`error-context.ts`)

`errorContext(module, method)` builds a fluent context object for error logging:

```typescript
const ctx = errorContext( 'comics', 'comic_series_create' );
ctx.operation( 'database_insert' ).resource( 'series', seriesId ).data( { extra: 1 } );
return responseError( 'Failed', 500, ctx.code( 'DB_ERROR' ), 'error', { context: ctx.get() } );
```

---

## Zod utilities (`zod-utils.ts`, `types.ts`)

- `paramsValidation(schema, params)` - `{ success: true, data } | { success: false, error: LiWEResponse }`. On failure, `error` is a ready-to-return `responseError` with `ERR_VALIDATION` and the Zod issues attached as context. **This is what generated method scaffolding uses to validate params before calling into your f2c block.**
- `keys_filter(obj, type_def)` - mutates `obj` in place, dropping keys not present in `type_def` or marked `priv: true`; coerces array-to-string mismatches.
- `keys_valid(dct)` - returns a copy of `dct` with `undefined`-valued keys removed.
- `isObject(item)` / `merge(target, ...sources)` - plain-object check and recursive deep-merge.
- `zodBoolean` (in `zod-utils.ts`) - a Zod preprocessor schema that also accepts `"true"/"false"/"1"/"0"` strings, coercing to `boolean | null`.
- `ZLiWEUser` / `LiWEUser` (in `types.ts`) - the canonical authenticated-user schema/type: `id, username, email, name, lastname, domain, perms?`.
- `ZLiWESysParams` / `LiWESysParams` - `{ skip_permissions_check?, domain?, params? }`, the `sys` argument every method receives.
- `LogLevel`, `LogEntry`, `LoggerConfig`, `RequestContext` - logger-related types, see [Logger](#logger-loggerts).

---

## Misc utilities

### `utils.ts`

`int(s)`, `float(s)` - lenient numeric conversion (falsy -> `0`/`0.0`).
`slugify(str)` - lowercase, accent-stripped, dash-separated slug.
`decimalToBase96(n)` / `base96ToDecimal(s)` - compact numeric encoding.
`formatCurrency(number, { thousandSeparator = '.', decimalSeparator = ',' })`.
`toNumDecimal(num, dec)` - round to `dec` decimals, returned as a `number`.

### `conv.ts`

Duplicate-purpose numeric helpers also exported from the root: `int`, `float`, `slugify`, `decimalToBase96`, `base96ToDecimal`, `formatCurrency`, `toNumDecimal`. (Both `utils.ts` and `conv.ts` are re-exported from `index.ts`; prefer importing by name from `@backend/liwe3/core` rather than caring which file it lives in.)

### `date.ts`

`date_format(date, format = 'yyyy-mm-dd HH:MM:SS')` - custom token formatter (`yyyy, mm, dd, HH, MM, SS`).
`date_get(d)` - `YYYY-MM-DD`.
`parseTime(value, defTime = 10800)` - parses `number` (seconds) or strings like `"7d"`, `"24h"`, `"30m"`, `"3600s"` into seconds, clamped to (0, 2592000]; falls back to `defTime` with a console warning if invalid.

### `mkid.ts`

`mkid(prefix?, ext?)` - **preferred ID generator**, `{prefix.}` + lowercase ULID + `{.ext}`. Sortable, collision-resistant.
`mkid_simple(prefix?, ext?)` - base-36 timestamp based, shorter but weaker uniqueness guarantee.
`mkid_legacy(prefix, ext?)` / `unique_code(...)` / `unique_code_numbers(...)` / `rand_int(min, max)` - legacy helpers, prefer `mkid()` for new code.

### `mimetypes.ts`

`ext2mime(fileName)` -> MIME type (defaults to `application/octet-stream`).
`mime2ext(mime)` -> file extension.

### `challenge.ts`

`challenge_create(secret, params[], debug?)` - sorts+joins `params` with `secret`, returns a `sha256` challenge hash. Used for tamper-proof request signing (e.g. webhook or link validation).
`challenge_check(challenge, secret, params[], debug?)` - recomputes and compares.

### `sendmail.ts`

`sendMail(creds: AwsCredentials, input: SendMailInput)` - sends via AWS SES v2 API using `aws4fetch` (no SDK). If `creds.access_key === 'debug'`, logs a formatted dump to console instead of sending and returns a fake `debug-{timestamp}` message id - this is the mechanism behind `[SES] Debug mode active` warning in `LiWEApp`.

### `email-templates.ts`

`getVerificationEmail(userName, verificationUrl, appName)` / `getPasswordResetEmail(userName, resetUrl, appName)` -> `{ subject, textBody, htmlBody }`, ready to pass into `sendMail`'s `input`.

---

## Anti-Patterns (When NOT to read this file)

| Don't read this for                               | Read instead               |
| ------------------------------------------------- | -------------------------- |
| How to structure a new module's files             | `MODULE_CREATION.md`       |
| Where to write business logic (f2c blocks)        | `METHOD_IMPLEMENTATION.md` |
| Module JSON schema (endpoints/types/perms/events) | `MODULE_JSON_REFERENCE.md` |
| How access control works end to end               | `PERMISSIONS.md`           |
| ResTest test format                               | `TESTING_RESTEST.md`       |
| Frontend/Svelte work                              | `SVELTE5_GUIDE.md`         |
