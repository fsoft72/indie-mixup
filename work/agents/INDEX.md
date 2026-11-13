# Documentation Index for LLMs

**Purpose:** Read this file FIRST. It tells you exactly which documentation file to read based on your current task. Do NOT read files speculatively - only read when the task matches.

---

## Decision Tree

```
What are you doing?
│
├─ Creating a NEW module (structure, files, flow2code)
│  └─ Read: MODULE_CREATION.md
│
├─ Adding / removing a module in the APP (index.ts, package.json, tsconfig, pnpm dev)
│  └─ Read: MODULE_CREATION.md -> "Backend Type-Check Watcher" and "Wiring the Module Into the Worker"
│
├─ Writing IMPLEMENTATION CODE inside method files (f2c blocks)
│  └─ Read: METHOD_IMPLEMENTATION.md
│
├─ Importing / using `@backend/liwe3/core` (LiWEApp, responses, auth, crypto, db helpers...)
│  └─ Read: LIWE3-BACKEND.md
│
├─ Defining module JSON (endpoints, types, permissions, events)
│  └─ Read: MODULE_JSON_REFERENCE.md
│
├─ Anything about ACCESS CONTROL: route gates, has_perms, why a 401/403,
│  "owner OR permission", regenerating and seeing `{ perms: ... }`
│  └─ Read: PERMISSIONS.md
│
├─ Creating Svelte components or frontend UI
│  └─ Read: SVELTE5_GUIDE.md
│
├─ Writing API tests (ResTest framework)
│  └─ Read: TESTING_RESTEST.md
│
├─ Understanding project folder structure
│  └─ Read: OVERVIEW.md
│
└─ Not sure / general question
   └─ Read: OVERVIEW.md first, then decide
```

---

## Quick Reference Table

| File                       | Read When                                                                                                                                              | Skip When                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `OVERVIEW.md`              | First time in project, confused about folder structure, where to put code                                                                              | You already know `/liwe3` is read-only and `/app` is your workspace    |
| `MODULE_CREATION.md`       | Creating a new module from scratch, need to understand file structure, learning f2c/hexocode pattern                                                   | Editing existing methods, writing tests, working on frontend           |
| `METHOD_IMPLEMENTATION.md` | Writing code inside `f2c_start`/`f2c_end` blocks, implementing CRUD, adding auth/permissions/events, debugging method errors                           | Creating module structure, defining JSON, writing tests, frontend work |
| `LIWE3-BACKEND.md`         | Importing anything from `@backend/liwe3/core`, need exact signature of a core function (responses, auth, crypto, sessions, DB helpers, events, logger) | You already know the core API surface                                  |
| `MODULE_JSON_REFERENCE.md` | Defining endpoints, types, fields, permissions, or events in module JSON files                                                                         | Implementing method logic, writing tests, frontend work                |
| `PERMISSIONS.md`           | How access control works end to end: route gates, `has_perms` / `capabilities` / `can_act_on`, the JSON-to-gate pipeline, why an endpoint 401s/403s    | You only need one function's signature (`LIWE3-BACKEND.md`)            |
| `SVELTE5_GUIDE.md`         | Creating Svelte components, using runes, managing state, building forms, integrating with LiWE3 UI components                                          | Backend work, module creation, testing                                 |
| `TESTING_RESTEST.md`       | Writing API tests, understanding ResTest JSON format, testing CRUD/events/cascades                                                                     | Implementing features, frontend work                                   |

---

## Detailed Triggers

### Read `OVERVIEW.md` when:

- You are new to this project
- You need to know where framework code lives vs application code
- You are unsure whether to modify `/liwe3` or `/app`
- You need a quick reference for "I want to do X, where do I look?"

### Read `MODULE_CREATION.md` when:

- You are creating a new LiWE3 module from scratch
- You need to understand the module directory structure (`backend/`, `frontend/`, `module.json`)
- You are learning about the `f2c_start`/`f2c_end` hexocode pattern
- You need to know which files flow2code generates vs which you write
- You are setting up `module_init()`, listeners, or inter-module events
- You add or remove a module in `app/backend/src/index.ts` (run `work/scripts/sync_modules.py`)
- `pnpm dev` does not build / watch a module, or the pre-commit hook says the module config is out of sync

### Read `METHOD_IMPLEMENTATION.md` when:

- You are writing business logic inside `f2c_start`/`f2c_end` blocks
- You need to implement a CRUD endpoint (create, read, update, delete)
- You are adding user authentication or permission checks
- You need to emit events or call other modules
- You are debugging errors in existing method implementations
- You need patterns for database queries, error handling, or response formatting

### Read `LIWE3-BACKEND.md` when:

- You are importing anything from `@backend/liwe3/core` (`LiWEApp`, `responseSuccess`/`responseError`, `has_perms`, `mkid`, `sessionCreate`, `jwtCreate`, `liwe_event_emit`, Drizzle `secret`/`secretjson`/`timestampDate` column types, etc.)
- You need the exact function signature, return type, or behavior of a core export
- You are debugging a type error coming from `@backend/liwe3/core`
- You need the list of standard `ERR_*` error codes
- You are configuring a `wrangler.jsonc` environment (`DEV_MODE`, `ALLOWED_ORIGINS`, the `RL_AUTH`/`RL_2FA` rate-limit bindings, required D1/KV/R2 bindings)

### Read `MODULE_JSON_REFERENCE.md` when:

- You are creating a new module JSON definition from scratch
- You need to add or modify endpoints in an existing module
- You are defining database schemas (types and fields)
- You need to set up permissions or events for a module
- You need to validate ID formats (`mod.*`, `endp.*`, `typ.*`, etc.)

### Read `PERMISSIONS.md` when:

- You need to decide which permission an endpoint requires and how to declare it
- You are writing or reviewing an authorization check in an f2c block
- An endpoint returns 401 or 403 and you need to know why
- You regenerated a module and want to understand the `{ perms: ... }` in `index.ts`
- The rule is "owner OR permission", or a permission changes how much data comes back
- You need to audit which routes are public

### Read `SVELTE5_GUIDE.md` when:

- You are creating any new Svelte component
- You need to use Svelte 5 runes (`$state`, `$props`, `$derived`, `$effect`)
- You are building forms (use `FormCreator` component)
- You need to manage shared state (stores in `.svelte.ts` files)
- You are integrating TypeScript with Svelte
- You need to use LiWE3 UI components from `@liwe3/webcomponents-svelte`

### Read `TESTING_RESTEST.md` when:

- You are writing API tests for a backend module
- You need to understand the ResTest JSON testing format
- You are testing CRUD operations, relationships, or cascading deletes
- You need to verify event emission and inter-module communication
- You are debugging failing ResTest tests

---

## Anti-Patterns (When NOT to read)

| Don't Read                 | When You Actually Need                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `METHOD_IMPLEMENTATION.md` | Creating module structure (read `MODULE_CREATION.md`)                                     |
| `MODULE_CREATION.md`       | Writing method logic (read `METHOD_IMPLEMENTATION.md`)                                    |
| `MODULE_JSON_REFERENCE.md` | Implementing methods (read `METHOD_IMPLEMENTATION.md`)                                    |
| `SVELTE5_GUIDE.md`         | Backend work (read `METHOD_IMPLEMENTATION.md`)                                            |
| `TESTING_RESTEST.md`       | Implementing features (read `METHOD_IMPLEMENTATION.md`)                                   |
| `LIWE3-BACKEND.md`         | Module structure or f2c patterns (read `MODULE_CREATION.md` / `METHOD_IMPLEMENTATION.md`) |
| Any file                   | You already know the answer and don't need documentation                                  |

---

## File Summary (One-Line Each)

| File                       | Content                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `OVERVIEW.md`              | Project structure: `/liwe3` (framework, read-only) vs `/app` (your code)                                                     |
| `MODULE_CREATION.md`       | Module file structure, f2c/hexocode pattern, step-by-step creation                                                           |
| `METHOD_IMPLEMENTATION.md` | How to write code inside f2c blocks: auth, permissions, DB queries, events                                                   |
| `LIWE3-BACKEND.md`         | `@backend/liwe3/core` API reference: LiWEApp, responses, auth, crypto, sessions, DB helpers, events, logger                  |
| `MODULE_JSON_REFERENCE.md` | JSON schema for modules: endpoints, types, fields, permissions, events                                                       |
| `PERMISSIONS.md`           | Access control end to end: route gates, `has_perms` rules, `capabilities` / `can_act_on`, JSON-to-gate pipeline, audit tests |
| `SVELTE5_GUIDE.md`         | Svelte 5 runes, TypeScript, components, state management, LiWE3 UI                                                           |
| `TESTING_RESTEST.md`       | ResTest JSON testing: CRUD tests, event tests, variable interpolation                                                        |
