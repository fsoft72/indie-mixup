# Custom Agent Skills

This project defines custom skills for AI coding agents under `.agents/skills/`. These skills automate common LiWE3 module development workflows: drafting specifications, generating module schemas, and implementing backend method logic.

## Available Skills

| Skill                                             | Trigger                                | Purpose                                               |
| ------------------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| [`liwe3-specs`](#liwe3-specs)                     | `/liwe3-specs <module_name>`           | Draft/update module specifications (Markdown or JSON) |
| [`liwe3-backend-methods`](#liwe3-backend-methods) | `/liwe3-backend-methods <module_name>` | Implement backend method business logic               |

---

## `liwe3-specs`

Location: `.agents/skills/liwe3-specs/SKILL.md`

Helps draft, design, or update module specifications for a LiWE3 module. Supports two output formats depending on the trigger form used.

### Usage

- `/liwe3-specs <module_name>` - Draft or update the module's **Markdown specification**.
- `/liwe3-specs <module_name> module` - Generate or update the module's **JSON schema definition**.

Example:

```
/liwe3-specs kanban
/liwe3-specs kanban module
```

### What it does

1. **Reads project rules first**, always, before writing anything:
   - `AGENTS.md`
   - `work/agents/MODULE_JSON_REFERENCE.md`
   - `work/agents/MODULE_CREATION.md`

2. **Option A - Markdown specs** (`/liwe3-specs <module_name>`)
   - Target file: `app/modules/<module_name>/docs/specs.md`
   - If the file does not exist or is empty, the skill **stops** and asks the user for the initial module description/requirements before writing anything.
   - If it exists, it is read and updated in place, following LiWE3 conventions (multi-tenant filtering, D1 binds, events, permissions).

3. **Option B - JSON module schema** (`/liwe3-specs <module_name> module`)
   - Target file: `work/modules/<module_name>.json`
   - Reads `app/modules/<module_name>/docs/specs.md` as the source of truth (if present) and any existing `work/modules/<module_name>.json` to update.
   - Builds/updates the schema (id, name, endpoints, database schema, events, permissions) per `MODULE_JSON_REFERENCE.md`, with full documentation and examples for every type and endpoint.
   - **Field naming rule:** never create `created_at`/`updated_at` fields; always use `created` and `updated`.
   - After writing/updating the JSON file, the skill automatically runs the helper script:
     ```bash
     python3 .agents/skills/liwe3-specs/module-creation.py app/modules/<module_name>/docs/<module_name>.json
     ```
     This script (`module-creation.py`) copies/normalizes the schema into `app/modules/<module_name>/docs/<module_name>.json`, renaming `created_at` -> `created`, `updated_at` -> `updated`, and stripping any `id_owner` field. If the given path already lives under `app/modules`, it is a no-op.

4. **Interactive feedback loop**: the skill presents the drafted/updated content, asks targeted follow-up questions to resolve ambiguities, and updates the corresponding file (`specs.md` or `<module_name>.json`) directly as the user gives feedback.

---

## `liwe3-backend-methods`

Location: `.agents/skills/liwe3-backend-methods/SKILL.md`

Implements the business logic for backend methods of a LiWE3 module, filling in the generated method stubs with real database queries, permission checks, and event emission.

### Usage

```
/liwe3-backend-methods <module_name>
```

Example:

```
/liwe3-backend-methods kanban
```

You can also trigger it by simply asking to "write all methods code" or "implement backend methods" for a module.

### What it does

1. **Reads guidelines first**, always:
   - `AGENTS.md`
   - `work/agents/METHOD_IMPLEMENTATION.md`

2. **Locates the module's JSON schema**, checked in this order of preference:
   1. `app/modules/<module_name>/docs/<module_name>.json`
   2. `app/modules/docs/<module_name>.json`
   3. `work/modules/<module_name>.json`

   The schema is read to understand database tables, endpoints, descriptions, parameter types, events, and permission requirements.

3. **Locates method files**, checked in this order:
   - `app/modules/<module_name>/backend/src/methods/`
   - `app/modules/<module_name>/methods/`

4. **Implements each method file**:
   - Reads the JSDoc block for `@permissions`, `@events`, parameters, and description.
   - Identifies the `f2c` (code-generation) markers to edit:
     - `/*=== f2c_start <method_name>_headers ===*/` ... `/*=== f2c_end <method_name>_headers ===*/`
     - `/*=== f2c_start <method_name> ===*/` ... `/*=== f2c_end <method_name> ===*/`
   - Implements database access (`app.db.select()`, `insert()`, `update()`, `delete()`) using Drizzle ORM.
   - **Always** enforces domain (multi-tenant) filtering: `eq(table.domain, user.domain ?? '_')`.
   - Enforces permissions via `has_perms(app, [PERMISSION_CONSTANT])`, importing constants from `../perms`.
   - Enforces authentication where required: `const user = await app.user; if (!user) return responseError('Unauthorized', 401);`.
   - Emits events declared in `@events` via `liwe_event_emit` **before** returning `responseSuccess()`.
   - Wraps logic in `try/catch`, returning `responseError(error.message)` on failure.
   - Updates the method file, editing **only** the content between the matching `f2c_start`/`f2c_end` markers.

5. **Verification**:
   - Runs `pnpm build` to confirm TypeScript compiles.
   - Once compilation succeeds:
     1. Starts the backend dev server from `app/backend/` with `pnpm dev`.
     2. Reads `work/agents/TESTING_RESTEST.md` to understand test design/organization.
     3. Creates test files under `app/modules/<module_name>/tests/restest/`, starting with `all.json` (which must import the admin-login and test-enter helper suites), followed by feature-specific test files (e.g. `crud.tests.json`).
     4. Runs the module's ResTest suite:
        ```bash
        pnpm test:restest @backend/modules/<module_name>
        ```
   - Presents the list of implemented methods and the test results to the user.

---

## Typical Workflow

For a new module, the two skills are normally used together, in order:

1. `/liwe3-specs <module_name>` - write the initial Markdown spec (requires the user to supply the first description/requirements).
2. `/liwe3-specs <module_name> module` - generate the JSON schema from the spec (auto-copies into `app/modules/<module_name>/docs/`).
3. `/liwe3-backend-methods <module_name>` - implement and test the backend methods against that schema.

## Adding a New Skill

Each skill lives in its own directory under `.agents/skills/<skill-name>/` with a `SKILL.md` file containing:

- YAML frontmatter with `name` and `description` (the `description` should state the trigger phrase(s) so agents recognize when to use it).
- An "Action Steps" section listing the ordered steps the agent must follow, including which reference docs to read first and which files to read/write.

Skills may also bundle helper scripts (e.g. `module-creation.py` in `liwe3-specs`) invoked as shell commands during the action steps.
