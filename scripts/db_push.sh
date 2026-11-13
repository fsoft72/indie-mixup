#!/bin/bash

# db_push.sh - Wrapper around `drizzle-kit push` for LiWE apps
#
# Compares schema.ts with a live database and applies the diff, keeping
# drizzle-kit's interactive prompts for destructive changes.
#
# Works on a single backend module or on all modules of the target worker
# (app/backend by default, playground/backend with --playground), against
# the local miniflare D1 database or a remote Cloudflare D1 (stage/prod).
#
# The tracked drizzle.config.ts is never touched: an ephemeral config is
# generated under .drizzle-push-temp/ and removed on exit.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print an error message in red.
_print_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

# Print a success message in green.
_print_success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

# Print an informational message in yellow.
_print_info() {
    echo -e "${YELLOW}INFO: $1${NC}"
}

# Print usage help.
_print_help() {
    echo "Usage: ./scripts/db_push.sh [options] [<module>|all]"
    echo ""
    echo "Options:"
    echo "  --env <local|stage|prod>  Target environment (default: local)"
    echo "  --playground              Target playground/backend instead of app/backend"
    echo "  --dry-run                 Show the statements without applying anything"
    echo "  --verbose                 Pass --verbose to drizzle-kit push"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Positional argument:"
    echo "  <module>  Push only this module's schema (e.g. gdpr, user). A tablesFilter"
    echo "            is derived from the module tables so other modules are left alone."
    echo "  all       Push every backend module of the target worker (default)."
    echo ""
    echo "Remote environments (stage/prod) read CLOUDFLARE_ACCOUNT_ID and"
    echo "CLOUDFLARE_D1_TOKEN from <worker>/.dev.vars.<env>, falling back to the shell"
    echo "environment. The databaseId comes from <worker>/wrangler.jsonc."
}

# --- Argument parsing -------------------------------------------------------

TARGET_ENV="local"
PLAYGROUND=false
DRY_RUN=false
VERBOSE=false
MODULE_ARG="all"

while [ $# -gt 0 ]; do
    case "$1" in
        --env)
            TARGET_ENV="$2"
            shift 2
            ;;
        --env=*)
            TARGET_ENV="${1#*=}"
            shift
            ;;
        --playground)
            PLAYGROUND=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            _print_help
            exit 0
            ;;
        -*)
            _print_error "Unknown option: $1"
            _print_help
            exit 1
            ;;
        *)
            MODULE_ARG="$1"
            shift
            ;;
    esac
done

case "$TARGET_ENV" in
    local|stage|prod) ;;
    *)
        _print_error "Invalid --env: ${TARGET_ENV} (expected local, stage or prod)"
        exit 1
        ;;
esac

# --- Paths and target worker --------------------------------------------------

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

if [ "$PLAYGROUND" = true ]; then
    WORKER_PATH="${REPO_ROOT}/playground/backend"
else
    WORKER_PATH="${REPO_ROOT}/app/backend"
fi

_print_info "Target worker: ${WORKER_PATH#${REPO_ROOT}/}"
_print_info "Environment:   ${TARGET_ENV}"

if [ ! -d "${WORKER_PATH}" ]; then
    _print_error "Worker directory not found: ${WORKER_PATH}"
    exit 1
fi

PACKAGE_JSON="${WORKER_PATH}/package.json"
WRANGLER_CONFIG="${WORKER_PATH}/wrangler.jsonc"

if [ ! -f "${PACKAGE_JSON}" ]; then
    _print_error "package.json not found: ${PACKAGE_JSON}"
    exit 1
fi

if [ ! -f "${WRANGLER_CONFIG}" ]; then
    _print_error "wrangler.jsonc not found: ${WRANGLER_CONFIG}"
    exit 1
fi

# --- Resolve module -> schema.ts paths --------------------------------------

# Given a module name, echo the repo-relative path of its backend schema.ts,
# or nothing if the module has no schema. Looks under app/modules first, then
# liwe3/modules.
_resolve_schema_path() {
    local module="$1"
    if [ -f "${REPO_ROOT}/app/modules/${module}/backend/src/schema.ts" ]; then
        echo "app/modules/${module}/backend/src/schema.ts"
    elif [ -f "${REPO_ROOT}/liwe3/modules/${module}/backend/src/schema.ts" ]; then
        echo "liwe3/modules/${module}/backend/src/schema.ts"
    fi
}

_print_info "Scanning backend modules in $(basename "${WORKER_PATH}")/package.json..."

ALL_MODULES=$(grep -o '"@backend-modules/[^"]*"' "${PACKAGE_JSON}" \
    | sed 's/"@backend-modules\/\([^"]*\)"/\1/' \
    | sort -u)

if [ -z "${ALL_MODULES}" ]; then
    _print_error "No backend modules found in ${PACKAGE_JSON}"
    exit 1
fi

# Modules to push and the drizzle tablesFilter (empty means "all tables").
SELECTED_MODULES=""
TABLES_FILTER=""

if [ "${MODULE_ARG}" = "all" ]; then
    SELECTED_MODULES="${ALL_MODULES}"
else
    if ! echo "${ALL_MODULES}" | grep -qx "${MODULE_ARG}"; then
        _print_error "Module '${MODULE_ARG}' is not a backend module of this worker"
        echo "Available modules:"
        echo "${ALL_MODULES}" | sed 's/^/  - /'
        exit 1
    fi
    SELECTED_MODULES="${MODULE_ARG}"

    SCHEMA_FILE="${REPO_ROOT}/$(_resolve_schema_path "${MODULE_ARG}")"
    if [ ! -f "${SCHEMA_FILE}" ]; then
        _print_error "Module '${MODULE_ARG}' has no backend/src/schema.ts"
        exit 1
    fi
    # Derive an explicit tablesFilter from the module tables so drizzle-kit
    # does not offer to drop the other modules' tables.
    MODULE_TABLES=$(grep -oE "sqliteTable\(\s*'[^']+'" "${SCHEMA_FILE}" \
        | sed "s/.*'\([^']*\)'.*/\1/" \
        | sort -u)
    if [ -z "${MODULE_TABLES}" ]; then
        _print_error "No sqliteTable(...) definitions found in ${SCHEMA_FILE#${REPO_ROOT}/}"
        exit 1
    fi
    # Comma-joined, each name single-quoted: 'gdpr_answers','gdpr_consensi',...
    TABLES_FILTER=$(echo "${MODULE_TABLES}" | sed "s/.*/'&'/" | paste -sd ',' -)
    _print_info "Module '${MODULE_ARG}' tables: ${MODULE_TABLES//$'\n'/, }"
fi

# Build the schema[] entries (relative to WORKER_PATH, so prefixed with ../../).
SCHEMA_PATHS=()
for module in ${SELECTED_MODULES}; do
    rel=$(_resolve_schema_path "${module}")
    if [ -n "${rel}" ]; then
        _print_info "Found schema: ${rel}"
        SCHEMA_PATHS+=("    '../../${rel}'")
    else
        _print_info "No schema for module '${module}' (skipping)"
    fi
done

if [ ${#SCHEMA_PATHS[@]} -eq 0 ]; then
    _print_error "No schema files found for the selected module(s)"
    exit 1
fi

SCHEMA_ARRAY=$(printf ",\n%s" "${SCHEMA_PATHS[@]}")
SCHEMA_ARRAY="${SCHEMA_ARRAY:1}" # drop the leading comma

# --- Build dbCredentials block for the ephemeral config ---------------------

# Read a KEY=VALUE entry from a .dev.vars file, stripping surrounding quotes.
# Args: <file> <key>
_read_dev_var() {
    local file="$1" key="$2"
    [ -f "${file}" ] || return 0
    grep -E "^${key}=" "${file}" | tail -1 | sed "s/^${key}=//; s/^[\"']//; s/[\"']$//"
}

# Extract a value that follows a JSON key on the same or a later line, starting
# from the first line that matches a marker. Args: <marker> <json-key>
_wrangler_value_after() {
    local marker="$1" key="$2"
    local start
    start=$(grep -n "${marker}" "${WRANGLER_CONFIG}" | head -1 | cut -d: -f1)
    [ -n "${start}" ] || return 0
    tail -n +"${start}" "${WRANGLER_CONFIG}" \
        | grep -m1 "\"${key}\"" \
        | sed "s/.*\"${key}\": *\"\([^\"]*\)\".*/\1/"
}

DB_CREDENTIALS=""
DRIVER_LINE=""
DB_LABEL=""

if [ "${TARGET_ENV}" = "local" ]; then
    D1_DIR="${WORKER_PATH}/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
    if [ ! -d "${D1_DIR}" ]; then
        _print_error "Local D1 folder not found: ${D1_DIR}"
        _print_info "Run 'pnpm dev' once to create the local database"
        exit 1
    fi
    DB_FILES=$(find "${D1_DIR}" -maxdepth 1 -name "*.sqlite" \
        ! -name "metadata.sqlite" ! -name "meta.sqlite" 2>/dev/null)
    DB_COUNT=$(echo "${DB_FILES}" | grep -c "\.sqlite$" || true)
    if [ -z "${DB_FILES}" ] || [ "${DB_COUNT}" -eq 0 ]; then
        _print_error "No local SQLite database found in ${D1_DIR}"
        _print_info "Run 'pnpm dev' once to create it"
        exit 1
    fi
    if [ "${DB_COUNT}" -gt 1 ]; then
        _print_error "Multiple SQLite databases found in ${D1_DIR}:"
        echo "${DB_FILES}"
        _print_info "Keep only the active one and retry"
        exit 1
    fi
    DB_FILE=$(echo "${DB_FILES}" | head -1)
    DB_LABEL="local: $(basename "${DB_FILE}")"
    DB_CREDENTIALS="  dbCredentials: {
    url: '${DB_FILE}',
  },"
else
    DEV_VARS_FILE="${WORKER_PATH}/.dev.vars.${TARGET_ENV}"

    ACCOUNT_ID=$(_read_dev_var "${DEV_VARS_FILE}" "CLOUDFLARE_ACCOUNT_ID")
    [ -n "${ACCOUNT_ID}" ] || ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID}"

    D1_TOKEN=$(_read_dev_var "${DEV_VARS_FILE}" "CLOUDFLARE_D1_TOKEN")
    [ -n "${D1_TOKEN}" ] || D1_TOKEN="${CLOUDFLARE_D1_TOKEN}"

    DATABASE_ID=$(_wrangler_value_after "\"${TARGET_ENV}\":" "database_id")
    DATABASE_NAME=$(_wrangler_value_after "\"${TARGET_ENV}\":" "database_name")

    if [ -z "${ACCOUNT_ID}" ] || [ -z "${D1_TOKEN}" ]; then
        _print_error "Missing Cloudflare credentials for '${TARGET_ENV}'"
        _print_info "Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_D1_TOKEN in ${DEV_VARS_FILE#${REPO_ROOT}/}"
        _print_info "(or export them in the shell). The token needs D1 Edit permission."
        exit 1
    fi
    if [ -z "${DATABASE_ID}" ] || echo "${DATABASE_ID}" | grep -q "REPLACE_WITH"; then
        _print_error "No usable database_id for '${TARGET_ENV}' in ${WRANGLER_CONFIG#${REPO_ROOT}/}"
        exit 1
    fi

    DB_LABEL="${TARGET_ENV} (remote): ${DATABASE_NAME:-${DATABASE_ID}}"
    DRIVER_LINE="  driver: 'd1-http',"
    DB_CREDENTIALS="  dbCredentials: {
    accountId: '${ACCOUNT_ID}',
    databaseId: '${DATABASE_ID}',
    token: '${D1_TOKEN}',
  },"
fi

# --- Write the ephemeral drizzle config ------------------------------------

TEMP_DIR="${WORKER_PATH}/.drizzle-push-temp"
CONFIG_FILE="${TEMP_DIR}/drizzle.config.ts"

# Always clean the temp dir on exit, whatever happens.
trap 'rm -rf "${TEMP_DIR}"' EXIT

rm -rf "${TEMP_DIR}"
mkdir -p "${TEMP_DIR}"

TABLES_FILTER_LINE=""
if [ -n "${TABLES_FILTER}" ]; then
    TABLES_FILTER_LINE="  tablesFilter: [${TABLES_FILTER}],"
fi

{
    echo "import { defineConfig } from 'drizzle-kit';"
    echo ""
    echo "export default defineConfig({"
    echo "  dialect: 'sqlite',"
    [ -n "${DRIVER_LINE}" ] && echo "${DRIVER_LINE}"
    echo ""
    echo "${DB_CREDENTIALS}"
    echo ""
    echo "  out: './drizzle',"
    echo ""
    echo "  schema: ["
    echo "${SCHEMA_ARRAY}"
    echo "  ],"
    [ -n "${TABLES_FILTER_LINE}" ] && echo "${TABLES_FILTER_LINE}"
    echo "});"
} > "${CONFIG_FILE}"

# --- Confirmation for remote pushes ---------------------------------------

if [ "${TARGET_ENV}" != "local" ] && [ "${DRY_RUN}" = false ]; then
    echo ""
    _print_info "About to push to ${DB_LABEL}"
    read -p "Proceed? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        _print_info "Aborted by user"
        exit 0
    fi
fi

# --- Run drizzle-kit push -------------------------------------------------

cd "${WORKER_PATH}"

PUSH_ARGS=(push --config=".drizzle-push-temp/drizzle.config.ts")
[ "${VERBOSE}" = true ] && PUSH_ARGS+=(--verbose)

echo ""
_print_info "Pushing '${MODULE_ARG}' schema -> ${DB_LABEL}"
echo ""

if [ "${DRY_RUN}" = true ]; then
    _print_info "Dry run: statements are printed, nothing is applied"
    echo ""
    # --strict forces a confirmation prompt for every change and --verbose
    # prints the SQL before it. stdin is closed (/dev/null), so drizzle-kit
    # cannot get a confirmation and applies nothing: the run stops at the
    # prompt. That is the intended "decline" for the dry run.
    set +e
    DRY_OUT=$(npx drizzle-kit "${PUSH_ARGS[@]}" --verbose --strict </dev/null 2>&1)
    DRY_RC=$?
    set -e

    echo "${DRY_OUT}" | grep -vE '^npm notice|Interactive prompts require a TTY|^\s+at |isTTY' || true

    echo ""
    if echo "${DRY_OUT}" | grep -q "Interactive prompts require a TTY"; then
        _print_success "Dry run complete - pending changes shown above, nothing applied"
        exit 0
    fi
    if [ "${DRY_RC}" -ne 0 ]; then
        _print_error "drizzle-kit push failed (see output above)"
        exit "${DRY_RC}"
    fi
    _print_success "Dry run complete - database already in sync, nothing to apply"
    exit 0
fi

# Interactive push: drizzle-kit keeps its own prompts for data-loss changes.
npx drizzle-kit "${PUSH_ARGS[@]}"

echo ""
_print_success "Push complete (${MODULE_ARG} -> ${DB_LABEL})"
