# LiWE3 Permission Control

## When to Read This File

Read this file when you are:

- **Deciding which permission an endpoint needs** and how to declare it
- **Writing or reviewing an authorization check** inside an f2c block
- **Wondering why an endpoint returns 401 or 403**
- **Regenerating a module** and seeing `{ perms: ... }` in `index.ts`
- **Adding an endpoint whose access rule is "owner OR permission"** or "the permission widens what is returned"
- **Auditing which routes are public**

This document is the single source of truth for how access control works end to end. `LIWE3-BACKEND.md` documents the individual functions; `MODULE_JSON_REFERENCE.md` documents the JSON `permissions` block; this file ties the whole chain together.

---

## The Model in One Paragraph

Every `/api` route carries a **gate**: the minimum condition required to enter the method at all. The gate is declared once, in the module JSON, flows through code generation into the route registration, and is enforced at runtime by `routeGet` / `routeBody` **before the request body is parsed**. A missing gate is a build error (the generator refuses the module; the compiler refuses the route). The gate is **necessary but not sufficient**: rules that depend on the specific row - "is this comment mine?" - or that change _how much_ is returned rather than _whether_ to respond, stay inside the method.

```
work/modules/<mod>.json          <- source of truth (edited in the liweflow GUI)
   permissions: { public | logged | admins | perm.<id> }
        |
        v  flow2code  (Endpoint.gate)
liwe3/modules/<mod>/backend/src/index.ts        <- GENERATED, do not hand-edit
   app.hono.get( '/api/x', routeGet( x, { perms: [ MOD_PERM_Y ] } ) );
        |
        v  runtime
liwe3/backend/core/src/routes.ts  _gateCheck()  <- 401 / 403 before the method runs
        |
        v  (gate passed)
methods/x.ts  f2c block  <- fine-grained checks: can_act_on / capabilities / has_perms
```

Three independent barriers, none with a permissive default:

| Barrier             | Rejects                                                                                                     | File                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Generator preflight | a module with any endpoint that declares no gate                                                            | `work/templates/liwe3-cloudflare-ng/template.py` |
| Compiler            | `routeGet( m )` / `routeBody( m )` called without the `{ perms }` argument                                  | `liwe3/backend/core/src/routes.ts`               |
| Runtime audit tests | a gate in `index.ts` that does not match the module JSON, an unknown permission, an unexpected public route | `liwe3/backend/core/tests/route*-*.test.ts`      |

---

## 1. The Route Gate

### `RouteGate` type

```typescript
import { LOGGED, PUBLIC, type RouteGate } from '@backend/liwe3/core';

// PUBLIC  === 'public'   - reachable with no authentication (a deliberate decision)
// LOGGED  === 'logged'   - any authenticated user
// string[]               - the caller needs AT LEAST ONE of these permission names
export type RouteGate = typeof PUBLIC | typeof LOGGED | string[];
```

### How it is declared

You never write `routeGet` / `routeBody` by hand - the generator does, from the JSON. The generated call looks like:

```typescript
import { LOGGED, PUBLIC, routeBody, routeGet } from '@backend/liwe3/core';
import { USER_PERM_LIST } from './perms';

app.hono.post( '/api/user/login', routeBody( user_login, { perms: PUBLIC } ) );
app.hono.get( '/api/user/me', routeGet( user_me, { perms: LOGGED } ) );
app.hono.get( '/api/user/list', routeGet( user_list, { perms: [ USER_PERM_LIST ] } ) );
```

`{ perms }` is a **required** argument. `routeGet( fn )` with no options does not compile.

Permission lists are emitted as **constant references** (`USER_PERM_LIST`), never string literals. If a permission is renamed in the JSON its constant is renamed in `perms.ts`, and a stale reference in `index.ts` becomes a compile error rather than a gate that silently denies everyone.

### What `_gateCheck` does at runtime (`routes.ts`)

```
gate === PUBLIC  -> allow
gate === LOGGED  -> allow iff  (await ctx.user()) !== null
gate is string[] -> allow iff  has_perms( ctx, gate )   // "at least one of", see section 3
```

On failure the wrapper answers **before parsing the body**:

| Situation                                    | Response                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| no authenticated user                        | `401` `responseError( 'Authentication required', 401, ERR_UNAUTHORIZED )` |
| authenticated, but the gate is not satisfied | `403` `responseError( 'Permission denied', 403, ERR_PERMISSION_DENIED )`  |

The 401/403 split is deliberate: a client can tell "log in again" apart from "this is not for you", and does not waste a token refresh on a 403.

---

## 2. The JSON `permissions` Block -> Gate

Each endpoint in `work/modules/<mod>.json` has a `permissions` flag map:

```jsonc
"permissions": {
  "public": false,
  "logged": false,
  "admins": false,
  "perm.mgovywle.io93": true,     // a specific module permission, by id
  "perm.mgovy4ej.k9ei": false
}
```

The generator (`flow2code`, `Endpoint.gate`) collapses that map to the gate as follows, **in this order**:

| Flag state                    | Resulting gate         | Notes                                                                                                              |
| ----------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `public: true`                | `PUBLIC`               | explicit "no auth" - shows up in the public-routes audit                                                           |
| `logged: true`                | `LOGGED`               | **wins over specific `perm.*` flags on the same endpoint** - if you also set a `perm.*`, it is ignored by the gate |
| one or more `perm.<id>: true` | `[ <perm name>, ... ]` | the caller needs one of them (`has_perms` semantics)                                                               |
| `admins: true`                | `[ 'system.admin' ]`   | maps to the `system.admin` wildcard                                                                                |
| nothing set                   | `None`                 | **the generator rejects the module** with an actionable message; no file is written                                |

Practical consequences:

- **`public` and "nothing set" are different.** The old parser produced the same empty list for both; now "nothing set" is a hard error, so a forgotten gate can never become a public endpoint by omission.
- **`logged` + a specific `perm.*` on the same endpoint is a model smell.** The gate becomes `LOGGED` and the specific permission is only enforced by an in-method check (if any). Prefer choosing one. Several `notifier` endpoints are currently in this state and are a pending cleanup.
- To change an endpoint's gate you edit the JSON (liweflow GUI) and **regenerate**. The diff shows up as one line in `index.ts`. Do not hand-edit `index.ts` - the next regeneration reverts it, and the drift test (`route-gate-drift.test.ts`) fails in the meantime.

---

## 3. `has_perms` / `has_perms_sync` Semantics

```typescript
await has_perms( ctx, perms: string[] ) : Promise<boolean>
has_perms_sync( user: LiWEUser | null, perms: string[] ) : boolean
```

`has_perms` is `has_perms_sync( await ctx.user(), perms )`. Rules, evaluated top to bottom:

1. `perms` empty / not an array -> `false`.
2. `perms` contains `'public'` or `'anyone'` -> `true` (no user needed).
3. no authenticated user -> `false`.
4. user has `system.admin` in `user.perms` -> `true` (wildcard, always).
5. `perms` contains `'logged'` or `'is-logged'` -> `true` iff the user has **any** permission at all.
6. otherwise -> `true` iff `user.perms` and `perms` **intersect** (the user holds at least one).

`has_perms_sync` is for when you already have the user object and want to run several checks without re-awaiting the session (see `capabilities`). `ctx.user()` is memoized per request, so calling `has_perms` a few times is also fine - it never triggers a second KV read.

---

## 4. In-Method Checks: When They Are Still Needed

The route gate handles the common case ("**A**: needs permission X, full stop"). Two cases still require code inside the method, because the gate cannot see the data:

### Case B - permission **OR** resource owner

The gate is `LOGGED` (anyone authenticated may _try_); the real decision needs the row.

```typescript
import { ERR_PERMISSION_DENIED, can_act_on } from '@backend/liwe3/core';

const comm = await ctx.app.db.select().from( comment_comments ).where( eq( comment_comments.id, id ) ).get();
if ( !comm ) return responseSuccess( true );

// true if the caller owns the comment OR holds comment.del
if ( !await can_act_on( ctx, [ COMMENT_PERM_DEL ], comm.id_user ) ) {
	return responseError( 'Permission denied', 403, ERR_PERMISSION_DENIED );
}
```

```typescript
can_act_on( ctx, perms: string[], ownerId?: string | null ) : Promise<boolean>
//   false            if no authenticated user
//   true             if ownerId is set and equals the caller's id
//   has_perms(...)    otherwise
```

### Case C - the permission **widens the scope**, it does not gate

The gate is the base permission (e.g. `user.list`); an extra permission changes _how much_ comes back.

```typescript
import { capabilities } from '@backend/liwe3/core';

let query = ctx.app.db.select().from( users );

// a system admin sees every domain; everyone else only their own
const cap = await capabilities( ctx, { seeAllDomains: [ 'system.admin' ] } );
if ( !cap.seeAllDomains ) query.where( eq( users.domain, u.domain ?? '--' ) );
```

```typescript
capabilities( ctx, spec: Record<string, string[]> ) : Promise<Record<keyof spec, boolean>>
// resolves the session once, then runs has_perms_sync for each entry
```

### What NOT to write any more

An in-method check that duplicates the gate is redundant and has been removed from the generated modules:

```typescript
// ANTI-PATTERN when the route gate is already { perms: [ MOD_PERM_X ] }
if ( !await has_perms( ctx, [ MOD_PERM_X ] ) ) return responseError( 'Permission denied', 403 );
```

Keep such a check only if it is genuinely stricter than the gate (a different permission, an extra `user.domain` constraint, a deliberate defence-in-depth with a comment saying so).

---

## 5. `sys.skip_permissions_check`

`LiWESysParams.skip_permissions_check` (default `false`) lets **internal callers** - a queue consumer, a seeder, another module via `liwe_event_call` - invoke a method function directly and bypass its _in-method_ checks:

```typescript
if ( !sys?.skip_permissions_check ) {
	const user = await ctx.user();
	if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );
	if ( !await can_act_on( ctx, [ MOD_PERM_X ], row.id_owner ) ) return responseError( 'Permission denied', 403 );
}
```

It has **no effect on the route gate**: the gate lives on the HTTP route wrapper, and an internal caller never goes through it. So an HTTP request is always gated; an internal call is authorized by whoever set `skip_permissions_check`.

---

## 6. Introspection and Safety Nets

### `GET /api/system/admin/routes/list`

Gated `system.admin`. Returns every `/api` route with its declared gate:

```jsonc
[ { "method": "GET", "path": "/api/user/list", "perms": [ "user.list" ], "description": "..." }, ... ]
```

Useful when building a roles UI ("which endpoints does this permission unlock?").

### Dev boot log

`LiWEApp.logPublicRoutesOnBoot()` (no-op unless `app.isDev`) logs the list of `PUBLIC` routes at startup, so an accidental one is noticed immediately. Call it in your worker's `initializeApp`, right after the last `moduleRegister` (the playground already does).

### Tests (`liwe3/backend/core/tests/`)

| Test                             | Guards against                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `routes.test.ts`                 | the gate mechanism itself: PUBLIC lets anon in, LOGGED 401s anon, a perm gate 403s a holder-less user, the gate runs before body parse                 |
| `routes-audit.test.ts`           | a module `index.ts` that still has `routeGet`/`routeBody` calls without a `{ perms }` argument (per-module count, must only ever decrease)             |
| `route-gate-drift.test.ts`       | a gate in `index.ts` that does not match what the module JSON declares - catches both a hand-edited `index.ts` and a JSON changed without regenerating |
| `permission-consistency.test.ts` | a gate referencing a permission constant that does not exist; a permission constant declared but never registered (dead permission)                    |

---

## 7. Adding a Gated Endpoint - Checklist

1. **Define the permission** in the module JSON `permissions` section (module level), if it does not exist yet: `{ "id": "perm.xxx", "name": "mod.action", "description": "..." }`.
2. **Set the endpoint's `permissions` flag map**: exactly one of `public` / `logged` / `admins`, or one or more `perm.<id>: true` (and everything else `false`). Never leave all flags `false`.
3. **Regenerate** the module. `index.ts` gains `{ perms: ... }`, `perms.ts` gains the constant.
4. **Do not** add an in-method `has_perms([ MOD_PERM_X ])` for the same permission - the gate does it.
5. Add an in-method check only for case B (`can_act_on`) or case C (`capabilities`).
6. Run `pnpm -C liwe3/backend/core test` - the drift and consistency tests confirm the wiring.

---

## 8. What Changed (Migration Note)

Before P0-1, an endpoint's permission was stated in three unlinked places (a `perms.ts` constant, a non-executable `@permissions` docstring, and an imperative `has_perms` call in the f2c block) and the route registration knew none of them - a forgotten check produced a silently public endpoint.

Now:

- The gate is **part of the route declaration** and **mandatory** (build error otherwise).
- The gate is **generated from the JSON**, which was already carrying the data.
- Redundant in-method `has_perms` checks (case A) were removed from the generated modules; `has_perms` in an f2c block now means case B/C or a deliberate extra constraint.
- `can_act_on` and `capabilities` replace hand-rolled "permission or owner" / "permission widens scope" boilerplate.

---

## Related Documentation

| Document                   | Purpose                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `LIWE3-BACKEND.md`         | signatures of `routeGet`, `routeBody`, `has_perms`, `capabilities`, `can_act_on`, `permissions_register` |
| `MODULE_JSON_REFERENCE.md` | the endpoint `permissions` flag map in the module JSON                                                   |
| `METHOD_IMPLEMENTATION.md` | where in a method the auth checks go, and the f2c block rules                                            |
| `MODULE_CREATION.md`       | the f2c / regeneration workflow                                                                          |
