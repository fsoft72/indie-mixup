# LiWE3 Infrastructure

**When to Read This File:** When you need to understand the project's folder structure, where framework code lives vs. application code, or how to organize new modules.

## Directory Layout

```
/
├── liwe3/          # Framework - DO NOT MODIFY
│   ├── backend/    # Base libraries for backend development
│   ├── frontend/   # Base libraries for frontend development
│   └── modules/    # Core modules (user, comment, upload, etc.)
│
├── app/            # Your application - CREATE AND MODIFY HERE
│   ├── backend/    # App-specific backend code
│   ├── frontend/   # App-specific frontend code
│   └── worker/     # Cloudflare Worker entry point
│
└── work/
    └── agent/      # Documentation (you are here)
```

## The `/liwe3` Folder (Framework - Read Only)

This is the LiWE3 framework itself. It provides the foundation you build on.

**Rule: Use it. Never modify it.**

### `/liwe3/backend/`

Base libraries for backend development.

| Package        | Purpose                                                            |
| -------------- | ------------------------------------------------------------------ |
| `core/`        | Database abstraction, crypto, response helpers, validation, events |
| `thumbnailer/` | Image processing and thumbnail generation                          |

### `/liwe3/frontend/`

Base libraries for frontend development.

| Package | Purpose                                                |
| ------- | ------------------------------------------------------ |
| `core/` | Svelte components, utilities, API client, form helpers |

### `/liwe3/modules/`

Core modules providing common functionality. Each module has backend logic, optional frontend components, and a `module_init()` function that registers routes.

| Module         | Purpose                                      |
| -------------- | -------------------------------------------- |
| `activitylog/` | Activity logging via events                  |
| `comment/`     | Comments system with events                  |
| `credentials/` | Credential management                        |
| `notifier/`    | Notification system                          |
| `system/`      | System-level operations                      |
| `tags/`        | Tagging system                               |
| `theme/`       | Theme management                             |
| `upload/`      | File upload handling                         |
| `user/`        | Authentication, permissions, user management |
| `wallet/`      | Wallet/payments                              |

## The `/app` Folder (Your Application)

This mirrors the `/liwe3` structure. Create your application-specific code here.

**Rule: This is where you work.**

### `/app/backend/`

Your app-specific backend code: custom routes, business logic, database schemas.

```
app/backend/
├── src/
├── config.json
├── drizzle.config.ts
├── wrangler.jsonc      # per-env vars & bindings - see LIWE3-BACKEND.md
└── package.json
```

`wrangler.jsonc` needs, per named environment (`env.stage`, `env.prod`), an explicit `ALLOWED_ORIGINS`, a `ratelimits` block (`RL_AUTH` / `RL_2FA`), and the D1/KV/R2 bindings - none of these are inherited from the top level. `LIWE3-BACKEND.md` -> "Environment variables & bindings" has the details and the fail-fast rules.

**Which modules the app uses.** `app/backend/src/index.ts` is the source of truth: every module imported from `@backend-modules/<name>` is a module of the app. The files around it are derived from it by `work/scripts/sync_modules.py` (`app/backend/package.json`, the root `tsconfig.backend.json`, `composite` / `references` of the backend `tsconfig.json`). The root `pnpm dev` / `predev` build and watch only those modules (plus their workspace dependencies, and the frontend packages listed in `app/frontend/package.json`), not every package of `/liwe3`. See `MODULE_CREATION.md` -> "Backend Type-Check Watcher".

### `/app/frontend/`

Your app-specific frontend code: pages, components, styles.

```
app/frontend/
├── src/
├── static/
├── svelte.config.js
└── package.json
```

### `/app/modules/` (Optional)

If you need custom modules beyond what `/liwe3/modules/` provides, create them here following the same module structure:

```
app/modules/
└── my-module/
    ├── backend/
    ├── frontend/
    └── module.json
```

## How They Connect

```
┌─────────────────────────────────────┐
│           /app/frontend             │  Imports from /liwe3/frontend
│           (your Svelte app)         │  and /liwe3/modules/*/frontend
└──────────────┬──────────────────────┘
               │ HTTP API
┌──────────────▼──────────────────────┐
│           /app/worker               │  Hono app that loads:
│           (entry point)             │  - /liwe3/modules (core)
└──────────────┬──────────────────────┘  - /app/modules (custom)
               │
┌──────────────▼──────────────────────┐
│           /liwe3/backend/core       │  Database, crypto, events
└─────────────────────────────────────┘
```

## Quick Reference

| I want to...               | Where to look                                         |
| -------------------------- | ----------------------------------------------------- |
| Add a new API route        | `/app/backend/` or create a module in `/app/modules/` |
| Add a new page             | `/app/frontend/src/routes/`                           |
| Use authentication         | Import from `/liwe3/modules/user/`                    |
| Handle file uploads        | Import from `/liwe3/modules/upload/`                  |
| Create a reusable module   | `/app/modules/` following LiWE3 module structure      |
| Fix a bug in the framework | **Don't.** Open an issue or fork.                     |
