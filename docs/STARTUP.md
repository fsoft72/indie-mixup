# Startup

This document describes the `pnpm` commands needed to get the main
workspace (`app/`, `liwe3/`) up and running. It does **not** cover the
playground - see `docs/PLAYGROUND.md` for that.

> **TypeScript version note:** the workspace is pinned to `typescript@^6.0.2`
> everywhere. `@sveltejs/package` (used to build every Svelte frontend
> module) does an unpinned `import('typescript')`; if `typescript@7.x` is
> present anywhere in the pnpm store alongside `^6.0.2`, that bare import
> can non-deterministically resolve TypeScript 7's slim exports stub
> (missing `.sys`), crashing every `svelte-package` build. Do not bump any
> package to `typescript@^7.x` until `svelte2tsx`/`@sveltejs/package`
> officially support it.

## 1. Install dependencies

From the repository root:

```bash
pnpm install
```

This installs and links every package under `liwe3/**` and `app/**` as
defined in `pnpm-workspace.yaml` (the playground is excluded from this
workspace and has its own install step).

## 2. Configure `app/backend`

Copy the example config files and fill in real values:

```bash
cd app/backend
cp .dev.vars.example .dev.vars
cp config.json.example config.json      # skip if config.json already exists
cp wrangler.jsonc.example wrangler.jsonc # skip if wrangler.jsonc already exists
cd -
```

Edit `app/backend/.dev.vars` and set at least:

- `SITE_SECRET`
- `DEBUG_KEY`
- `ADMIN_KEY`
- `JWT_SECRET`
- `SYSTEM_ADMIN_USERNAME` / `SYSTEM_ADMIN_PASSWORD` / `SYSTEM_DOMAIN`

Update `app/backend/src/index.ts` to register the LiWE3 modules you want
to use in the app.

## 3. Configure `app/frontend`

Create `app/frontend/.env` with the required public variables:

```bash
PUBLIC_PROJECT_KEY=...
PUBLIC_LIWE_SERVER=http://localhost:8787
PUBLIC_DATE=...
PUBLIC_VERSION=...
```

You can verify both `app/backend` and `app/frontend` configuration at
any time with:

```bash
./scripts/system-check.sh
```

## 4. Initialize the database

The app backend uses a local D1 database. Generate and review the
migration:

```bash
./scripts/db_init.sh --full   # first-time setup
# or
./scripts/db_init.sh          # delta mode, compares current DB with schema
```

The script prints the exact `wrangler d1 migrations apply` command to
run once you're happy with the generated migration file, e.g.:

```bash
cd app/backend
wrangler d1 migrations apply <DB_NAME> --local
cd -
```

## 5. Run the dev environment

`pnpm dev` in the root does **not** start any server. It runs the `dev` script of the
libraries and modules (`tsc --watch`, `svelte-package -w`), so they are rebuilt on every
change. `app/backend` and `app/frontend` are excluded on purpose (and so is the playground).

Start the servers you need, each in its own terminal:

```bash
pnpm dev                      # rebuild the libraries and modules on change (no server)
cd app/backend && pnpm dev    # wrangler dev, default: http://localhost:8787
cd app/frontend && pnpm dev   # vite dev, default: http://localhost:5173
```

## 6. Build

Build every workspace package (excluding the playground):

```bash
pnpm build
```

## 7. Test

Run tests across the workspace (excluding the playground):

```bash
pnpm test
```

## Other useful scripts

- `./scripts/kill-dev-server.sh <port>` - kill whatever is listening on a
  given port (e.g. a stuck `wrangler dev` or `vite dev` process).
- `./scripts/clean-all.sh` - remove all `node_modules`, lockfiles and
  build output (`dist`, `.svelte-kit`, `.turbo`, `.wrangler`) and
  reinstall everything from scratch.
- `work/scripts/sync_modules.py` - sync `package.json` dependencies and tsconfig references with the modules imported by `app/backend/src/index.ts` (`--check` only reports, `--prune` removes unused ones).
- `./scripts/update-admin-password.sh` - reset the system admin password.
