#!/bin/bash

# clean-all.sh - Remove all node_modules, lockfiles and build artifacts,
# then reinstall dependencies from scratch.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_error() {
  echo -e "${RED}ERROR: $1${NC}"
}

print_success() {
  echo -e "${GREEN}SUCCESS: $1${NC}"
}

print_info() {
  echo -e "${YELLOW}INFO: $1${NC}"
}

# Determine directory paths relative to the script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SKIP_CONFIRM=false
SKIP_INSTALL=false
CLEAR_WRANGLER=false

for arg in "$@"; do
  case "$arg" in
    -y|--yes)
      SKIP_CONFIRM=true
      ;;
    --no-install)
      SKIP_INSTALL=true
      ;;
    --clear-wrangler)
      CLEAR_WRANGLER=true
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -y, --yes         Skip confirmation prompt"
      echo "  --no-install      Do not run 'pnpm install' after cleaning"
      echo "  --clear-wrangler  Delete app/backend/.wrangler and run 'pnpm migrations:dev' (auto-yes)"
      echo "  -h, --help        Show this help"
      exit 0
      ;;
    *)
      print_error "Unknown option: $arg"
      exit 1
      ;;
  esac
done

cd "$WORKSPACE_ROOT"

# Directories to remove (relative names, found anywhere in the tree)
DIR_TARGETS=(node_modules dist .svelte-kit .turbo .wrangler)

# Files to remove (relative names, found anywhere in the tree)
FILE_TARGETS=(pnpm-lock.yaml package-lock.json yarn.lock)

print_info "Scanning $WORKSPACE_ROOT for artifacts to remove..."

FOUND_DIRS=()
for name in "${DIR_TARGETS[@]}"; do
  while IFS= read -r path; do
    FOUND_DIRS+=("$path")
  done < <(find "$WORKSPACE_ROOT" -type d -name "$name" -prune)
done

FOUND_FILES=()
for name in "${FILE_TARGETS[@]}"; do
  while IFS= read -r path; do
    FOUND_FILES+=("$path")
  done < <(find "$WORKSPACE_ROOT" -type f -name "$name")
done

TOTAL=$(( ${#FOUND_DIRS[@]} + ${#FOUND_FILES[@]} ))

if [ "$TOTAL" -eq 0 ]; then
  print_info "Nothing to clean. Workspace is already tidy."
else
  echo "The following will be removed:"
  for path in "${FOUND_DIRS[@]}"; do
    echo "  - $path/"
  done
  for path in "${FOUND_FILES[@]}"; do
    echo "  - $path"
  done

  if [ "$SKIP_CONFIRM" = false ]; then
    read -r -p "Proceed with deletion? [y/N] " answer
    case "$answer" in
      [yY][eE][sS]|[yY]) ;;
      *)
        print_info "Aborted."
        exit 0
        ;;
    esac
  fi

  for path in "${FOUND_DIRS[@]}"; do
    rm -rf "$path"
  done
  for path in "${FOUND_FILES[@]}"; do
    rm -f "$path"
  done

  print_success "Removed $TOTAL artifact(s)."
fi

if [ "$SKIP_INSTALL" = true ]; then
  print_info "Skipping install (--no-install given)."
  exit 0
fi

print_info "Running pnpm install..."
if pnpm install; then
  print_success "System reinstalled and ready."
else
  print_error "pnpm install failed."
  exit 1
fi

if [ "$CLEAR_WRANGLER" = true ]; then
  print_info "Removing app/backend/.wrangler..."
  rm -rf "$WORKSPACE_ROOT/app/backend/.wrangler"
  cd "$WORKSPACE_ROOT/app/backend"
  print_info "Running pnpm migrations:dev..."
  if yes | pnpm migrations:dev; then
    print_success "Wrangler cleared and migrations applied."
  else
    print_error "pnpm migrations:dev failed."
    exit 1
  fi
fi
