# Playground

The playground is a standalone app (backend + frontend) used to test the
LiWE3 modules in isolation, without touching the main `app/` application.
It is **excluded** from the root pnpm workspace (see `pnpm-workspace.yaml`),
so it needs its own dependency install step.

> **TypeScript version note:** keep `typescript@^6.0.2` in
> `playground/backend/package.json` and `playground/frontend/package.json`.
> `@sveltejs/package` (used to build the `liwe3/*` frontend modules the
> playground links to) does an unpinned `import('typescript')`; mixing
> `typescript@7.x` into the pnpm store alongside `^6.0.2` can make that
> import non-deterministically resolve TypeScript 7's slim exports stub
> (missing `.sys`), breaking Vite's dev server with errors like
> `Failed to resolve import "..." from ".../dist/components/*.svelte"`.
> If you hit that, run `./scripts/clean-all.sh` and check every
> `package.json` is back on `^6.0.2` before reinstalling.

## 1. Install dependencies

From the repository root:

```bash
pnpm playground:setup
```

This runs `pnpm install --ignore-workspace` separately in
`playground/backend` and `playground/frontend`, since these packages are
not part of the main workspace.

## 2. Configure secrets

Copy the example secrets file and fill in real values:

```bash
cp playground/backend/.dev.vars.example playground/backend/.dev.vars
```

Edit `playground/backend/.dev.vars` and set at least:

- `SITE_SECRET`
- `DEBUG_KEY`
- `ADMIN_KEY`
- `JWT_SECRET`

`playground/backend/wrangler.jsonc` and `playground/backend/config.json`
are already checked in and preconfigured for local use; you normally don't
need to touch them.

## 3. Run database migrations

The playground backend uses a local D1 database (`playground-dev`). Apply
the migrations before the first run:

```bash
pnpm playground:migrations
```

This runs `wrangler d1 migrations apply playground-dev --local`.

## 4. Start the playground

Run backend and frontend together:

```bash
pnpm playground:dev
```

Or start them separately, each in its own terminal:

```bash
pnpm playground:backend    # wrangler dev, http://localhost:8787
pnpm playground:frontend   # vite dev, http://localhost:5173
```

## 5. Build for testing

To produce a production build of the playground frontend/backend without
touching the main app:

```bash
pnpm build:playground
```

This runs `build` recursively across all workspace packages except
`app/**` (still excluding `playground/**` from the workspace resolution,
but including it as a build target through `pnpm -C`).

## Notes

- The playground links the real `liwe3/*` module packages via
  `link:`/relative paths, so changes made to modules under `liwe3/` are
  immediately reflected when you restart `playground:dev`.
- If ports `8787` or `5173` are already in use, stop the existing process
  first (e.g. `./scripts/kill-dev-server.sh 8787`).
- To wipe the playground's own `node_modules`/lockfile/build output along
  with the rest of the repo, use `./scripts/clean-all.sh` from the repo
  root, then re-run `pnpm playground:setup`.
