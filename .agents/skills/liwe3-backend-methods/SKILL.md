---
name: liwe3-backend-methods
description: Implements backend methods for a LiWE3 module. Triggered by requests containing "/liwe3-backend-methods <module_name>" or asking to write all methods code/implement backend methods for a LiWE3 module.
---

# LiWE3 Backend Methods Implementer

Use this skill to implement the business logic for backend methods of a LiWE3 module.

## Triggering Format

The user triggers this skill by typing:

- `/liwe3-backend-methods <module_name>` (e.g., `/liwe3-backend-methods kanban`)

---

## Action Steps

### 1. Read Guidelines and Schema

Always read the following files before implementing or updating any method logic:

- [AGENTS.md](file:///%WORKSPACE_ROOT%/AGENTS.md)
- [METHOD_IMPLEMENTATION.md](file:///%WORKSPACE_ROOT%/work/agents/METHOD_IMPLEMENTATION.md)

### 2. Locate the Module JSON Schema

Find the module JSON schema. Look in these paths in order of preference:

1. `app/modules/<module_name>/docs/<module_name>.json`
2. `app/modules/docs/<module_name>.json`
3. `work/modules/<module_name>.json`

Read the schema to understand the database tables, endpoints, descriptions, parameter types, events, and permission details.

### 3. Locate Method Files

Method files are located in:

- `app/modules/<module_name>/backend/src/methods/`
- Or `app/modules/<module_name>/methods/` if the former doesn't exist.

### 4. Implement Methods Code

For each method file in the methods directory:

1. Read the method file contents using `view_file`.
2. Locate the JSDoc to read `@permissions`, `@events`, parameters, and description.
3. Identify the target `f2c` blocks:
   - `/*=== f2c_start <method_name>_headers ===*/` to `/*=== f2c_end <method_name>_headers ===*/`
   - `/*=== f2c_start <method_name> ===*/` to `/*=== f2c_end <method_name> ===*/`
4. Implement the required database queries (e.g., `app.db.select()`, `insert()`, `update()`, `delete()`) using Drizzle ORM.
5. **ALWAYS** enforce domain filtering: `eq(table.domain, user.domain ?? '_')`.
6. Enforce permissions using `has_perms(app, [PERMISSION_CONSTANT])` using specific permission constants imported from `../perms`.
7. Enforce authentication: check `const user = await app.user; if (!user) return responseError('Unauthorized', 401);` if required.
8. If the JSDoc defines `@events`, emit the event using `liwe_event_emit` **BEFORE** returning `responseSuccess()`.
9. Wrap the business logic in `try/catch` and return `responseError(error.message)` on failure.
10. Update the method file using `replace_file_content` targeting **ONLY** the lines between the `f2c_start` and `f2c_end` blocks.

### 5. Verification

- Run `pnpm build` to verify the TypeScript compiles successfully.
- Once compilation succeeds:
  1. launch the backend server present in `app/backend/` using `pnpm dev` inside `app/backend`
  2. Read [TESTING_RESTEST.md](file:///%WORKSPACE_ROOT%/work/agents/TESTING_RESTEST.md) to understand how to design and organize tests.
  3. Create test files under `app/modules/<module_name>/tests/restest/` starting with the entry point file `all.json` (which must import the admin-login and test-enter helper suites) and followed by specific feature tests (e.g. `crud.tests.json`).
  4. Launch ResTest against the module by executing:
     ```bash
     pnpm test:restest @backend/modules/<module_name>
     ```
- Present the list of implemented methods and test results to the user.
