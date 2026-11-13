---
name: liwe3-specs
description: Helps developers draft and update LiWE3 module specifications. Triggered by requests containing "/liwe3-specs" or asking to draft specifications for a LiWE3 module.
---

# LiWE3 Module Specifications Drafter

Use this skill to help draft, design, or update module specifications for LiWE3.

## Triggering Format

The user triggers this skill by typing:

- `/liwe3-specs <module_name>` (e.g., `/liwe3-specs kanban`) - Drafts or updates the markdown specifications file.
- `/liwe3-specs <module_name> module` (e.g., `/liwe3-specs kanban module`) - Generates or updates the module's JSON definition file.

---

## Action Steps

### 1. Read Project Rules and Reference Documentation

Always read the following files before generating or updating any specifications or module schemas:

- [AGENTS.md](file:///%WORKSPACE_ROOT%/AGENTS.md)
- [MODULE_JSON_REFERENCE.md](file:///%WORKSPACE_ROOT%/work/agents/MODULE_JSON_REFERENCE.md)
- [MODULE_CREATION.md](file:///%WORKSPACE_ROOT%/work/agents/MODULE_CREATION.md)

### 2. Locate or Create the Target Files

- Identify the `<module_name>` from the user prompt.
- Check which format was requested:

  #### Option A: Markdown Specification (`/liwe3-specs <module_name>`)
  - Target file: `app/modules/<module_name>/docs/specs.md`
  - If the file does not exist or is empty, **STOP** and ask the user to provide the initial description/requirements for the module before writing anything.
  - If it exists, read it.

  #### Option B: JSON Module Schema (`/liwe3-specs <module_name> module`)
  - Target file: `work/modules/<module_name>.json`
  - Read the existing specifications from `app/modules/<module_name>/docs/specs.md` (if they exist) as the source of truth.
  - Read the existing JSON schema from `work/modules/<module_name>.json` (if it exists).

### 3. Draft/Update Specifications or Module JSON

- **For Option A (Markdown specs):** Draft or update the specifications inside `app/modules/<module_name>/docs/specs.md` conforming to LiWE3 conventions (multi-tenant filtering, D1 binds, events, permissions).
- **For Option B (JSON schema):** Construct or update the `<module_name>.json` inside `app/modules/<module_name>/docs/<module_name>.json` schema using the guidelines in `MODULE_JSON_REFERENCE.md` (id, name, endpoints, database schema, events, permissions) and the requirements from the specs file.
  For every type and endpoint add comprehensive documentation and examples.
  **NEVER CREATE FIELDS** `created_at` and `updated_at`, **ALWAYS CREATE** `created` and `updated`.

  Once the `<module_name>.json` file has been created or updated, immediately execute the Python helper script located inside this skill to process it:
  ```bash
  python3 .agents/skills/liwe3-specs/module-creation.py app/modules/<module_name>/docs/<module_name>.json
  ```

### 4. Interactive Feedback Loop

- Present the changes or updates to the user.
- Ask targeted follow-up questions to resolve design/schema ambiguities.
- Update the respective file (`specs.md` or `<module_name>.json`) directly whenever the user provides feedback.
