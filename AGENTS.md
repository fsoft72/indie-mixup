# AGENTS.md

This file provides guidance to LLMs when working with code in this repository.

## MUST DO

- **ALWAYS** use codegraph to understand the code structure
- **ALWAYS** apply the logic from the docs (index, modules, etc) for the f2c blocks
- **ALWAYS** use the correct types for the functions
- **ALWAYS** use `pnpm` not `npm`
- **ALWAYS** use `wrangler` for deployment and local development
- **ALWAYS** user `wrangler.jsonc` and **not** `wrangler.toml`
- **ALWAYS** modify the module .json definition when adding / modifiying endpoints, permissions, events and so on
- **ALWAYS** use `flow2code` from a `.json` module instead of creating endpoints / permissions / events ... by hand
- **ALWAYS** refer to `app/specs` if the folder exists and you need info about the project
- **ALWAYS** run `work/scripts/sync_modules.py` after adding or removing a module in `app/backend/src/index.ts` (the pre-commit hook checks it)

## MANDATORY WORKFLOW: module JSON first, then `flow2code`

Any change to a module's **endpoints, types, fields, permissions, events or `*.call.*` calls** MUST follow this flow, in this exact order. No exceptions, no shortcuts, even for "a one-line event".

1. **Edit the module definition** `work/modules/<module>.json` (e.g. `work/modules/user.json`). Read `work/agents/MODULE_JSON_REFERENCE.md` for the exact format (ids look like `evt.<hash>.<hash>`, names are lowercase with dots, calls are events named `<module>.call.<name>`).
2. **Validate the JSON**: `python3 -c "import json; json.load(open('work/modules/<module>.json'))"`.
3. **Run `flow2code`** from the repo root (the output is `liwe3/modules/<module>/{backend,frontend}`):
   ```bash
   flow2code work/modules/<module>.json -o liwe3 -t liwe3-cloudflare-ng --templates-dir work/templates
   ```
4. **Format**: `dprint fmt` (flow2code output is not formatted).
5. **Review `git status` / `git diff`**: keep only the changes caused by your JSON edit. If flow2code touched unrelated generated files (pre-existing drift), restore them with `git checkout <path>` so the commit stays focused.
6. **Only now write the logic**: inside `f2c_start` / `f2c_end` blocks of the generated methods, or in `listeners.ts` for event handlers. Use the generated constants (e.g. `USER_CALL_USER_LIST` from `events.ts`), never string literals.
7. **Commit together**: the JSON, the generated files and the logic/tests go in the same commit, with an entry in `CHANGES.md`.

Rules:

- **NEVER** hand-edit generated code outside `f2c_start` / `f2c_end` blocks: `events.ts`, `perms.ts`, `types.ts`, `schema.ts`, `index.ts`, method signatures and Zod schemas are overwritten by the next run. If one of them needs to change, go back to step 1.
- **NEVER** add an event, permission, endpoint or call by writing the constant / route / schema directly in TypeScript. If it is not in the module `.json`, it does not exist.
- **NEVER** skip step 1 because the generated file "looks easy" to patch: the JSON is the source of truth and a hand-made change gets lost or diverges.
- If you notice generated code that is out of sync with the JSON, fix the JSON and regenerate: do not patch the TypeScript.
- Calls (`<module>.call.<name>`) are internal events with no HTTP route: they are invoked with `liwe_event_call()` and tested with Vitest on the listener, not with RESTest JSON.

## NEVER DO

- **NEVER, EVER** use `git commit --no-verify` (or `-n`) to bypass the pre-commit hooks. The `.githooks/pre-commit` hook runs `dprint fmt` on staged files; skipping it lets unformatted code reach CI, where `dprint check` fails the build. If a hook is failing, fix the underlying problem, never bypass it.
- **NEVER** bypass or disable git hooks in any other way (unsetting `core.hooksPath`, deleting `.githooks/*`, `--no-verify` on `git rebase`/`git push`, etc.)

## Project Structure

This is a Cloudflare Workers monorepo using TypeScript, organized as follows:

- **`liwe3/backend/core`** - Core backend library with utilities, database layer, crypto functions, and response handling
- **`liwe3/modules/*`** - modules with domain-specific logic (user, comment, activitylog, etc.), every module contains `frontend` (Svelte, TypeScript) and `backend` ( Worker cloudflare, TypeScript) folders
- **`liwe3/frontend`** - Frontend core library with Svelte components and utilities

---

## Cloudflare Infrastructure

This project runs entirely on Cloudflare Workers with the following services:

| Service           | Binding         | Purpose                                | Access Pattern                  |
| ----------------- | --------------- | -------------------------------------- | ------------------------------- |
| **D1 Database**   | `DB`            | Primary SQLite database (multi-tenant) | `app.db` (Drizzle ORM)          |
| **D1 Test DB**    | `DB_TEST`       | Disposable test database               | Used only by ResTest framework  |
| **KV Storage**    | `KV`            | Session storage, key-value cache       | `app.env.KV`                    |
| **R2 Storage**    | `UPLOAD_BUCKET` | File uploads and static assets         | `app.env.UPLOAD_BUCKET`         |
| **EMAIL**         | `EMAIL`         | Send emails                            | `app.env.EMAIL`                 |
| **Static Assets** | `ASSETS`        | Frontend static files                  | Served automatically by Workers |

### Environments

| Environment | Worker Name        | Database                    | Purpose           |
| ----------- | ------------------ | --------------------------- | ----------------- |
| `local`     | `playground-local` | `playground-dev` (local)    | Local development |
| `stage`     | `playground-stage` | `playground-stage` (remote) | Staging/QA        |
| `prod`      | `playground-prod`  | `playground-prod` (remote)  | Production        |

### Key Commands

```bash
# Development
pnpm dev                        # Rebuild on change ONLY the modules the app uses (from app/backend/src/index.ts). Does NOT start the servers (8787 / 5173)
cd app/backend && wrangler dev   # Start Worker locally

# Deployment
cd app/backend && pnpm deploy:stage   # Deploy to staging
cd app/backend && pnpm deploy:prod    # Deploy to production

# Database
cd app/backend && pnpm migrations:dev   # Apply migrations locally
wrangler d1 execute playground-dev --local --file=./sql/schema.sql

# Testing
cd app/backend && pnpm test         # Run Vitest tests
# ResTest: see work/agents/TESTING_RESTEST.md

# Types
cd app/backend && pnpm cf-typegen   # Regenerate Worker types
```

### Database Binding

The D1 database is accessed via Drizzle ORM through `app.db`:

```typescript
// In any module method
const user = await app.db.select().from( users ).where( eq( users.id, id ) ).get();
await app.db.insert( users ).values( newUser ).run();
```

All queries must include domain filtering for multi-tenant isolation:

```typescript
.where(eq(table.domain, user.domain ?? '_'))
```

---

## Commands

### Development

- `pnpm dev` - Watch builds of the libraries and of the modules the app uses (`work/scripts/sync_modules.py --filters`). It does NOT start the servers: use `cd app/backend && pnpm dev` (8787) and `cd app/frontend && pnpm dev` (5173)

### Building

- `pnpm build` - Build all packages in the monorepo

### Testing

- `pnpm test` - Run tests for all packages
- `pnpm test:watch` - Watch mode (in individual package directories)

### Linting

- `pnpm lint` - Run linting for all packages

### Cloudflare Worker (in `@apps/playground/worker`)

- `pnpm dev` or `wrangler dev` - Start local development server
- `pnpm deploy` or `wrangler deploy` - Deploy to Cloudflare
- `pnpm cf-typegen` or `wrangler types` - Generate Cloudflare Worker types

---

## Key Technologies

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (HTTP routing)
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Validation**: Zod schemas
- **Testing**: Vitest with Cloudflare Workers test environment
- **Package Manager**: pnpm with workspaces

**Database binding:** `DB` → Access via `app.db` (Drizzle instance)

---

## LiWE3 Framework Documentation

**For complete documentation, read:** `work/agents/INDEX.md`

The INDEX.md contains:

- Decision tree for quick routing to the right doc
- Read-when / skip-when tables for each file
- Detailed triggers for specific scenarios

### Quick Reference

| Task                           | Read This                              |
| ------------------------------ | -------------------------------------- |
| Project structure overview     | `work/agents/OVERVIEW.md`              |
| Creating a new module          | `work/agents/MODULE_CREATION.md`       |
| Writing method implementations | `work/agents/METHOD_IMPLEMENTATION.md` |
| Defining module JSON schema    | `work/agents/MODULE_JSON_REFERENCE.md` |
| Building Svelte frontend       | `work/agents/SVELTE5_GUIDE.md`         |
| Writing API tests (ResTest)    | `work/agents/TESTING_RESTEST.md`       |

### Critical Rules Summary

- ONLY modify code INSIDE `f2c_start`/`f2c_end` blocks
- Always return `responseSuccess()` or `responseError()` - NEVER throw exceptions
- Always apply domain filtering: `eq(table.domain, user.domain ?? '_')`
- Use events for inter-module communication (`liwe_event_emit()`, `liwe_event_call()`)
- NEVER modify Zod schemas, types, or function signatures (auto-generated)
- NEVER import outside f2c blocks
- NEVER access other modules' database tables directly
- ALWAYS use `FormCreator` component to create forms in frontend/Svelte - NEVER build forms manually with raw `<form>`/`<input>` elements
- ALWAYS use the `Upload` module (`@frontend-modules/upload`) for file uploads in frontend/Svelte - NEVER use raw `<input type="file">` or custom upload implementations

**Reference modules to study:**

- `@backend/modules/user` - Full CRUD, authentication, permissions
- `@backend/modules/comment` - Events and inter-module communication
- `@backend/modules/activitylog` - Event listener pattern

---

## Development Patterns

### General Principles

- **Modules are isolated** - Never access other modules' database tables directly
- **Use events** - Inter-module communication via `liwe_event_emit()` and `liwe_event_call()`
- **Domain scoping** - All data is multi-tenant via `domain` field
- **Strict TypeScript** - No `any` types, use proper types and interfaces
- **Monorepo linking** - Internal packages use `workspace:*` pattern

### Style Guide

- Prefer early returns to avoid deep nesting: `if (!user) return responseError(...);`
- Single-line if statements can omit braces: `if (!x) return;`
- Use arrow functions: `const fn = () => {}` instead of `function fn() {}`
- Put exit conditions at the top of functions
- Add JSDoc comments to public functions and methods
