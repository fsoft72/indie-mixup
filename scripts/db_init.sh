#!/bin/bash

# db_init.sh - Database initialization script for LiWE apps
# Scans backend modules, generates drizzle-kit migration config, and runs migrations
# Default mode: delta (compares actual DB with target schema)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

print_success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

print_info() {
    echo -e "${YELLOW}INFO: $1${NC}"
}

# Check for flags
FULL_MODE=false
PLAYGROUND=false

for arg in "$@"; do
    case $arg in
        --full)
            FULL_MODE=true
            ;;
        --delta)
            FULL_MODE=false
            ;;
        --playground)
            PLAYGROUND=true
            ;;
        --help|-h)
            echo "Usage: ./scripts/db_init.sh [options]"
            echo ""
            echo "Options:"
            echo "  --full        Generate full migration using drizzle-kit (for initial setup)"
            echo "  --delta       Compare actual DB with schema and generate delta (default)"
            echo "  --playground  Target playground/backend instead of app/backend"
            echo "  -h, --help    Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $arg"
            exit 1
            ;;
    esac
done

if [ "$FULL_MODE" = true ]; then
    print_info "Full mode enabled - will use drizzle-kit generate directly"
fi

# Save the repository root (script should be run from repo root)
REPO_ROOT="$(pwd)"
if [ "$PLAYGROUND" = true ]; then
    WORKER_PATH="${REPO_ROOT}/playground/backend"
    print_info "Target: playground/backend"
else
    WORKER_PATH="${REPO_ROOT}/app/backend"
    print_info "Target: app/backend"
fi

print_info "Initializing database..."

# Check if app exists
if [ ! -d "${WORKER_PATH}" ]; then
    print_error "Worker directory not found: ${WORKER_PATH}"
    exit 1
fi

# Check if package.json exists
PACKAGE_JSON="${WORKER_PATH}/package.json"
if [ ! -f "${PACKAGE_JSON}" ]; then
    print_error "package.json not found: ${PACKAGE_JSON}"
    exit 1
fi

# Check if wrangler.jsonc exists
WRANGLER_CONFIG="${WORKER_PATH}/wrangler.jsonc"
if [ ! -f "${WRANGLER_CONFIG}" ]; then
    print_error "wrangler.jsonc not found: ${WRANGLER_CONFIG}"
    exit 1
fi

# Extract database name from wrangler.jsonc (dev mode - root level d1_databases)
DB_NAME=$(grep '"database_name"' "${WRANGLER_CONFIG}" | tail -1 | sed 's/.*"database_name": *"\([^"]*\)".*/\1/')

if [ -z "${DB_NAME}" ]; then
    print_error "Could not extract database name from wrangler.jsonc"
    exit 1
fi

print_info "Database name (dev mode): ${DB_NAME}"

# Extract backend modules from package.json
print_info "Scanning for backend modules..."

MODULES=$(grep -o '"@backend-modules/[^"]*"' "${PACKAGE_JSON}" | sed 's/"@backend-modules\/\([^"]*\)"/\1/')

if [ -z "${MODULES}" ]; then
    print_error "No backend modules found in package.json"
    exit 1
fi

# Build schema array for drizzle config
SCHEMA_PATHS=()

for MODULE in ${MODULES}; do
    REAL_SCHEMA_PATH=""
    if [ -f "app/modules/${MODULE}/backend/src/schema.ts" ]; then
        REAL_SCHEMA_PATH="app/modules/${MODULE}/backend/src/schema.ts"
    elif [ -f "liwe3/modules/${MODULE}/backend/src/schema.ts" ]; then
        REAL_SCHEMA_PATH="liwe3/modules/${MODULE}/backend/src/schema.ts"
    fi

    if [ -n "${REAL_SCHEMA_PATH}" ]; then
        print_info "Found schema: ${REAL_SCHEMA_PATH}"
        SCHEMA_PATHS+=("    '../../${REAL_SCHEMA_PATH}'")
    else
        print_info "No schema found for module: ${MODULE} (skipping)"
    fi
done

# Check if we found any schemas
if [ ${#SCHEMA_PATHS[@]} -eq 0 ]; then
    print_error "No schema files found in any backend modules"
    exit 1
fi

# Generate drizzle.config.ts file
CONFIG_FILE="${WORKER_PATH}/drizzle.config.ts"

# Define directories
MIGRATIONS_DIR="${WORKER_PATH}/drizzle"
META_DIR="${MIGRATIONS_DIR}/meta"

# Join schema paths with commas and newlines
SCHEMA_ARRAY=$(printf ",\n%s" "${SCHEMA_PATHS[@]}")
SCHEMA_ARRAY="${SCHEMA_ARRAY:1}" # Remove leading comma

# Generate the new config content
NEW_CONFIG=$(cat << EOF
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',

  dbCredentials: {
    url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/${DB_NAME}.sqlite',
  },

  out: './drizzle',

  schema: [
${SCHEMA_ARRAY}
  ],
});
EOF
)

# Check if config file exists and compare
if [ -f "${CONFIG_FILE}" ]; then
    EXISTING_CONFIG=$(cat "${CONFIG_FILE}")
    if [ "$EXISTING_CONFIG" = "$NEW_CONFIG" ]; then
        print_info "Drizzle config is up to date: ${CONFIG_FILE}"
    else
        print_info "Drizzle config schema paths have changed - updating: ${CONFIG_FILE}"
        echo "$NEW_CONFIG" > "${CONFIG_FILE}"
        print_success "Updated drizzle config with new schema paths"
    fi
else
    print_info "Creating new drizzle config: ${CONFIG_FILE}"
    echo "$NEW_CONFIG" > "${CONFIG_FILE}"
    print_success "Generated drizzle config: ${CONFIG_FILE}"
fi

# Full mode: use drizzle-kit generate directly
if [ "$FULL_MODE" = true ]; then
    print_info "Running drizzle-kit generate..."

    cd "${WORKER_PATH}" || {
        print_error "Failed to change to worker directory: ${WORKER_PATH}"
        exit 1
    }

    if npx drizzle-kit generate; then
        print_success "Database migration generated successfully"

        if [ -d "${MIGRATIONS_DIR}" ]; then
            LATEST_MIGRATION=$(ls -t "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | head -1)
            if [ -n "${LATEST_MIGRATION}" ]; then
                print_info "Latest migration: $(basename ${LATEST_MIGRATION})"
            fi
        fi
    else
        print_error "Failed to generate database migration"
        exit 1
    fi

    print_success "Database initialization completed"
    print_info "Mode: Full (drizzle-kit generate)"
    exit 0
fi

# Delta mode (default): compare actual DB with target schema
print_info "=== Delta Mode: Comparing actual DB with target schema ==="

# Find the SQLite database file
D1_DIR="${WORKER_PATH}/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
if [ ! -d "${D1_DIR}" ]; then
    print_error "D1 database folder not found: ${D1_DIR}"
    print_info "Make sure you have run 'pnpm dev' at least once to create the local database"
    print_info "Or use --full flag for initial migration generation"
    exit 1
fi

# Find SQLite database files (excluding metadata.sqlite and meta.sqlite)
DB_FILES=$(find "${D1_DIR}" -maxdepth 1 -name "*.sqlite" ! -name "metadata.sqlite" ! -name "meta.sqlite" 2>/dev/null)
DB_COUNT=$(echo "${DB_FILES}" | grep -c "\.sqlite$" 2>/dev/null || echo "0")

if [ -z "${DB_FILES}" ] || [ "${DB_COUNT}" -eq 0 ]; then
    print_error "No SQLite database found in: ${D1_DIR}"
    print_info "Make sure you have run 'pnpm dev' at least once to create the local database"
    print_info "Or use --full flag for initial migration generation"
    exit 1
fi

if [ "${DB_COUNT}" -gt 1 ]; then
    print_error "Multiple SQLite databases found in: ${D1_DIR}"
    echo "${DB_FILES}"
    echo ""
    print_info "Delete the old/unused database files and keep only the active one"
    print_info "You can check which is active by running 'pnpm dev' and checking modification times"
    exit 1
fi

DB_FILE=$(echo "${DB_FILES}" | head -1)
DB_FILENAME=$(basename "${DB_FILE}")
print_info "Found database: ${DB_FILENAME}"

# Check if sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
    print_error "sqlite3 is required for delta mode"
    print_info "Install with: sudo apt-get install sqlite3 (Ubuntu/Debian) or brew install sqlite3 (macOS)"
    exit 1
fi

# Read actual DB schema using sqlite3
print_info "Reading actual database schema..."
DB_TABLES=$(sqlite3 "${DB_FILE}" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name;" 2>/dev/null)

if [ -z "${DB_TABLES}" ]; then
    print_error "Failed to read tables from database or database is empty"
    print_info "Use --full flag for initial migration generation"
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    print_error "jq is required for delta mode"
    print_info "Install with: sudo apt-get install jq (Ubuntu/Debian) or brew install jq (macOS)"
    exit 1
fi

# Generate full schema to temp to get target state
print_info "Generating target schema for comparison..."

TEMP_DIR="${WORKER_PATH}/.drizzle-delta-temp"
rm -rf "${TEMP_DIR}"
mkdir -p "${TEMP_DIR}/drizzle/meta"

# Create temp drizzle config
cat > "${TEMP_DIR}/drizzle.config.ts" << 'EOF'
import { defineConfig } from 'drizzle-kit';
import config from '../drizzle.config';

export default defineConfig({
  ...config,
  out: '.drizzle-delta-temp/drizzle',
});
EOF

# Create empty journal for temp generation
cat > "${TEMP_DIR}/drizzle/meta/_journal.json" << 'JOURNAL_EOF'
{
  "version": "7",
  "dialect": "sqlite",
  "entries": []
}
JOURNAL_EOF

cd "${WORKER_PATH}"
FULL_OUTPUT=$(npx drizzle-kit generate --config=".drizzle-delta-temp/drizzle.config.ts" 2>&1)
if [ $? -ne 0 ]; then
    print_error "Failed to generate target schema"
    echo "${FULL_OUTPUT}"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# Find the generated full migration and snapshot
FULL_MIGRATION=$(find "${TEMP_DIR}/drizzle" -maxdepth 1 -name "*.sql" 2>/dev/null | head -1)
TEMP_SNAPSHOT=$(find "${TEMP_DIR}/drizzle/meta" -name "*_snapshot.json" 2>/dev/null | head -1)

if [ ! -f "${FULL_MIGRATION}" ] || [ ! -f "${TEMP_SNAPSHOT}" ]; then
    print_error "Failed to generate schema files"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# Get target tables from the generated snapshot
TARGET_TABLES=$(jq -r '.tables | keys | sort | .[]' "${TEMP_SNAPSHOT}" 2>/dev/null)

echo ""
print_info "=== Comparison: Actual DB vs Target Schema ==="
echo ""

# Show tables in actual DB
echo -e "${GREEN}Tables in actual database:${NC}"
for table in ${DB_TABLES}; do
    echo "  - ${table}"
done
echo ""

# Show tables in target schema
echo -e "${YELLOW}Tables in target schema:${NC}"
for table in ${TARGET_TABLES}; do
    echo "  - ${table}"
done
echo ""

# Find differences
ONLY_IN_DB=$(comm -23 <(echo "${DB_TABLES}" | sort) <(echo "${TARGET_TABLES}" | sort) 2>/dev/null)
ONLY_IN_TARGET=$(comm -13 <(echo "${DB_TABLES}" | sort) <(echo "${TARGET_TABLES}" | sort) 2>/dev/null)

if [ -n "${ONLY_IN_DB}" ]; then
    echo -e "${GREEN}Tables ONLY in actual DB (will be ignored):${NC}"
    for table in ${ONLY_IN_DB}; do
        echo "  + ${table}"
    done
    echo ""
fi

if [ -n "${ONLY_IN_TARGET}" ]; then
    echo -e "${RED}Tables to CREATE (missing from DB):${NC}"
    for table in ${ONLY_IN_TARGET}; do
        echo "  - ${table}"
    done
    echo ""
fi

# Show detailed column comparison for common tables
COMMON_TABLES=$(comm -12 <(echo "${DB_TABLES}" | sort) <(echo "${TARGET_TABLES}" | sort) 2>/dev/null)
TABLES_WITH_DIFF=""

if [ -n "${COMMON_TABLES}" ]; then
    for table in ${COMMON_TABLES}; do
        # Get columns from actual DB
        DB_COLS=$(sqlite3 "${DB_FILE}" "PRAGMA table_info('${table}');" 2>/dev/null | cut -d'|' -f2 | sort)
        # Get columns from target schema
        TARGET_COLS=$(jq -r ".tables.\"${table}\".columns | keys | sort | .[]" "${TEMP_SNAPSHOT}" 2>/dev/null)

        if [ "${DB_COLS}" != "${TARGET_COLS}" ]; then
            TABLES_WITH_DIFF="${TABLES_WITH_DIFF} ${table}"
        fi
    done

    if [ -n "${TABLES_WITH_DIFF}" ]; then
        echo -e "${YELLOW}Tables with column differences:${NC}"
        for table in ${TABLES_WITH_DIFF}; do
            echo "  ~ ${table}"
            DB_COLS=$(sqlite3 "${DB_FILE}" "PRAGMA table_info('${table}');" 2>/dev/null | cut -d'|' -f2 | sort)
            TARGET_COLS=$(jq -r ".tables.\"${table}\".columns | keys | sort | .[]" "${TEMP_SNAPSHOT}" 2>/dev/null)

            ONLY_IN_DB_COLS=$(comm -23 <(echo "${DB_COLS}") <(echo "${TARGET_COLS}") 2>/dev/null)
            ONLY_IN_TARGET_COLS=$(comm -13 <(echo "${DB_COLS}") <(echo "${TARGET_COLS}") 2>/dev/null)

            for col in ${ONLY_IN_DB_COLS}; do
                echo -e "      ${GREEN}+ ${col}${NC} (in DB, will be dropped)"
            done
            for col in ${ONLY_IN_TARGET_COLS}; do
                echo -e "      ${RED}- ${col}${NC} (missing in DB, will be added)"
            done
        done
        echo ""
    fi
fi

# Check if there are any changes needed
if [ -z "${ONLY_IN_TARGET}" ] && [ -z "${TABLES_WITH_DIFF}" ]; then
    print_success "Database is already in sync with target schema!"
    rm -rf "${TEMP_DIR}"
    exit 0
fi

# Ask for confirmation
echo ""
echo -e "${YELLOW}This will generate a delta migration with:${NC}"
if [ -n "${ONLY_IN_TARGET}" ]; then
    echo -e "${YELLOW}  - CREATE TABLE for missing tables${NC}"
fi
if [ -n "${TABLES_WITH_DIFF}" ]; then
    echo -e "${YELLOW}  - Table migrations (create-copy-drop-rename pattern)${NC}"
fi
echo ""
read -p "Proceed? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Aborted by user"
    rm -rf "${TEMP_DIR}"
    exit 0
fi

# Extract delta statements from already generated full schema
print_info "Extracting delta statements..."

# Generate migration filename
TIMESTAMP=$(date +%s%3N)
MIGRATION_NAME="delta_$(date +%Y%m%d_%H%M%S)"
MIGRATION_IDX=$(ls -1 "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | wc -l)
DELTA_FILE="${MIGRATIONS_DIR}/$(printf '%04d' ${MIGRATION_IDX})_${MIGRATION_NAME}.sql"

# Ensure migrations directory exists
mkdir -p "${MIGRATIONS_DIR}"

# Start building delta migration
echo "-- Delta migration generated by db_init.sh" > "${DELTA_FILE}"
echo "-- Generated at: $(date -Iseconds)" >> "${DELTA_FILE}"
echo "" >> "${DELTA_FILE}"

DELTA_HAS_CONTENT=false

# Extract CREATE TABLE statements for tables missing from DB
if [ -n "${ONLY_IN_TARGET}" ]; then
    echo "-- Tables to create (missing from database)" >> "${DELTA_FILE}"
    for table in ${ONLY_IN_TARGET}; do
        # Extract CREATE TABLE statement from full migration and make it IF NOT EXISTS
        TABLE_SQL=$(sed -n "/CREATE TABLE \`${table}\`/,/;$/p" "${FULL_MIGRATION}" | sed '/^--> statement-breakpoint/d' | sed 's/CREATE TABLE/CREATE TABLE IF NOT EXISTS/')
        if [ -n "${TABLE_SQL}" ]; then
            echo "${TABLE_SQL}" >> "${DELTA_FILE}"
            echo "" >> "${DELTA_FILE}"
            DELTA_HAS_CONTENT=true
            print_info "  + CREATE TABLE ${table}"
        fi
    done
fi

# For tables with column differences, use SQLite's create-copy-drop-rename pattern
if [ -n "${TABLES_WITH_DIFF}" ]; then
    echo "-- Tables with column changes (using SQLite create-copy-drop-rename pattern)" >> "${DELTA_FILE}"
    for table in ${TABLES_WITH_DIFF}; do
        # Get columns in DB
        DB_COLS=$(sqlite3 "${DB_FILE}" "PRAGMA table_info('${table}');" 2>/dev/null | cut -d'|' -f2)

        # Get the full CREATE TABLE statement from target schema
        CREATE_STMT=$(sed -n "/CREATE TABLE \`${table}\`/,/^);/p" "${FULL_MIGRATION}")
        if [ -z "${CREATE_STMT}" ]; then
            print_info "  ~ Skipping ${table} - CREATE TABLE not found in schema"
            continue
        fi

        # Get columns from target schema for this table
        TARGET_COLS=$(echo "${CREATE_STMT}" | grep -oE '^\s*`[^`]+`' | sed 's/^\s*`//;s/`$//' | tr '\n' ' ')

        # Calculate column differences for comments
        COLS_TO_ADD=$(comm -13 <(echo "${DB_COLS}" | tr ' ' '\n' | sort) <(echo "${TARGET_COLS}" | tr ' ' '\n' | sort) 2>/dev/null | tr '\n' ', ' | sed 's/, $//')
        COLS_TO_DROP=$(comm -23 <(echo "${DB_COLS}" | tr ' ' '\n' | sort) <(echo "${TARGET_COLS}" | tr ' ' '\n' | sort) 2>/dev/null | tr '\n' ', ' | sed 's/, $//')

        # Add migration comment header
        echo "" >> "${DELTA_FILE}"
        echo "-- ============================================" >> "${DELTA_FILE}"
        echo "-- Migrating table: ${table}" >> "${DELTA_FILE}"
        if [ -n "${COLS_TO_ADD}" ]; then
            echo "-- Columns ADDED: ${COLS_TO_ADD}" >> "${DELTA_FILE}"
        fi
        if [ -n "${COLS_TO_DROP}" ]; then
            echo "-- Columns DROPPED: ${COLS_TO_DROP}" >> "${DELTA_FILE}"
        fi
        echo "-- ============================================" >> "${DELTA_FILE}"

        # Create new table with __new_ prefix
        NEW_CREATE=$(echo "${CREATE_STMT}" | sed "s/CREATE TABLE \`${table}\`/CREATE TABLE \`__new_${table}\`/")
        echo "${NEW_CREATE}" >> "${DELTA_FILE}"
        echo "--> statement-breakpoint" >> "${DELTA_FILE}"

        # Find common columns (exist in both DB and target schema)
        COMMON_COLS=""
        for col in ${DB_COLS}; do
            if echo "${TARGET_COLS}" | grep -qw "${col}"; then
                if [ -n "${COMMON_COLS}" ]; then
                    COMMON_COLS="${COMMON_COLS}, "
                fi
                COMMON_COLS="${COMMON_COLS}\"${col}\""
            fi
        done

        # Generate INSERT...SELECT for common columns
        if [ -n "${COMMON_COLS}" ]; then
            echo "INSERT INTO \`__new_${table}\`(${COMMON_COLS}) SELECT ${COMMON_COLS} FROM \`${table}\`;" >> "${DELTA_FILE}"
            echo "--> statement-breakpoint" >> "${DELTA_FILE}"
        fi

        # Drop old table
        echo "DROP TABLE \`${table}\`;" >> "${DELTA_FILE}"
        echo "--> statement-breakpoint" >> "${DELTA_FILE}"

        # Rename new table
        echo "ALTER TABLE \`__new_${table}\` RENAME TO \`${table}\`;" >> "${DELTA_FILE}"
        echo "--> statement-breakpoint" >> "${DELTA_FILE}"

        # Extract and recreate indexes for this table
        INDEXES=$(sed -n "/CREATE.*INDEX.*ON \`${table}\`/p" "${FULL_MIGRATION}")
        if [ -n "${INDEXES}" ]; then
            echo "${INDEXES}" >> "${DELTA_FILE}"
            echo "--> statement-breakpoint" >> "${DELTA_FILE}"
        fi

        echo "" >> "${DELTA_FILE}"
        DELTA_HAS_CONTENT=true
        print_info "  ~ Migrating table ${table} (create-copy-drop-rename)"
    done
fi

# Check if we generated any content
if [ "${DELTA_HAS_CONTENT}" = false ]; then
    print_info "No delta changes needed"
    rm -f "${DELTA_FILE}"
    rm -rf "${TEMP_DIR}"
    exit 0
fi

# Copy the snapshot to update meta folder
if [ -f "${TEMP_SNAPSHOT}" ]; then
    # Ensure meta dir exists and remove old snapshots
    mkdir -p "${META_DIR}"
    rm -f "${META_DIR}/"*_snapshot.json

    # Copy snapshot with correct name
    SNAPSHOT_NAME="$(printf '%04d' ${MIGRATION_IDX})_${MIGRATION_NAME}_snapshot.json"
    cp "${TEMP_SNAPSHOT}" "${META_DIR}/${SNAPSHOT_NAME}"

    # Update journal
    cat > "${META_DIR}/_journal.json" << EOF
{
  "version": "7",
  "dialect": "sqlite",
  "entries": [
    {
      "idx": ${MIGRATION_IDX},
      "version": "6",
      "when": ${TIMESTAMP},
      "tag": "$(printf '%04d' ${MIGRATION_IDX})_${MIGRATION_NAME}",
      "breakpoints": true
    }
  ]
}
EOF
    print_info "Snapshot updated: ${SNAPSHOT_NAME}"
fi

# Clean up
rm -rf "${TEMP_DIR}"

print_success "Delta migration created: $(basename ${DELTA_FILE})"
echo ""
echo -e "${GREEN}Migration file:${NC} ${DELTA_FILE}"
echo ""
echo -e "${YELLOW}Review the migration, then apply with:${NC}"
echo "  wrangler d1 migrations apply ${DB_NAME} --local"
echo ""

print_success "Database initialization completed"
print_info "Mode: Delta (compared actual DB with target schema)"
