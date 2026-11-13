#!/usr/bin/env bash
#
# pnpm12-consumer-check.sh
#
# Read-only status probe for the pnpm 12 migration of a repo that embeds LiWE3
# (see docs/PNPM-12-migration.md). Run it before starting, between steps, and at
# the end: it never changes a file, it just reports what is still pending.
#
# Checks:
#   1. node >= 22, pnpm major version
#   2. root package.json "packageManager" field
#   3. leftover two-slash package refs (@backend/liwe3/core, @backend/modules/*)
#      anywhere in tracked code/config - this is the app/** payload
#   4. pnpm-workspace.yaml still on onlyBuiltDependencies vs allowBuilds
#   5. dead "pnpm" field in the root package.json
#   6. workspace package names that violate the npm one-slash rule
#
# Usage: scripts/pnpm12-consumer-check.sh
#
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "${REPO_ROOT}"

RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'; RST=$'\033[0m'
ok()   { printf '  %s✓%s %s\n' "${GRN}" "${RST}" "$1"; }
warn() { printf '  %s!%s %s\n' "${YEL}" "${RST}" "$1"; }
bad()  { printf '  %s✗%s %s\n' "${RED}" "${RST}" "$1"; }

echo "== 1. toolchain =="
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "${NODE_MAJOR}" -ge 22 ]; then ok "node $(node -v) (>= 22)"; else bad "node $(node -v 2>/dev/null || echo '?') - pnpm 11+ needs >= 22"; fi
PNPM_V="$(pnpm --version 2>/dev/null || echo '?')"
case "${PNPM_V}" in
	12.*) ok "pnpm ${PNPM_V}" ;;
	1[01].*) warn "pnpm ${PNPM_V} - not yet on 12" ;;
	*) warn "pnpm ${PNPM_V}" ;;
esac

echo "== 2. packageManager field =="
PM="$(node -p "require('./package.json').packageManager || ''" 2>/dev/null || echo '')"
case "${PM}" in
	pnpm@12.*) ok "${PM}" ;;
	'') warn "no packageManager field in root package.json" ;;
	*) warn "${PM} (still not pnpm@12)" ;;
esac

echo "== 3. two-slash package refs (the app/** payload) =="
# longest first so the report is readable; the rename script fixes both.
HITS="$(git grep -nE '@backend/(liwe3/core|modules/)' -- \
	'*.ts' '*.mts' '*.js' '*.mjs' '*.cjs' '*.svelte' '*.json' '*.jsonc' '*.sh' '*.example' \
	':!scripts/rename-backend-packages.sh' 2>/dev/null || true)"
if [ -z "${HITS}" ]; then
	ok "no @backend/liwe3/core or @backend/modules/ left in tracked files"
else
	N="$(printf '%s\n' "${HITS}" | wc -l | tr -d ' ')"
	bad "${N} lines still reference the old scheme - run scripts/rename-backend-packages.sh"
	printf '%s\n' "${HITS}" | sed 's/^/      /' | grep -E '^ +(app|src)/' | head -20 || true
	printf '%s\n' "${HITS}" | awk -F: '{print $1}' | sort -u | sed 's#^#      file: #' | head -30
fi

echo "== 4. pnpm-workspace.yaml build-scripts setting =="
if [ ! -f pnpm-workspace.yaml ]; then
	warn "no pnpm-workspace.yaml at repo root"
elif grep -qE '^\s*onlyBuiltDependencies\s*:' pnpm-workspace.yaml; then
	bad "pnpm-workspace.yaml still uses onlyBuiltDependencies - pnpm 12 ignores it; move to allowBuilds"
elif grep -qE '^\s*allowBuilds\s*:' pnpm-workspace.yaml; then
	ok "pnpm-workspace.yaml uses allowBuilds"
else
	warn "pnpm-workspace.yaml has neither onlyBuiltDependencies nor allowBuilds"
fi

echo "== 5. dead 'pnpm' field in root package.json =="
if node -e "process.exit(require('./package.json').pnpm ? 1 : 0)" 2>/dev/null; then
	ok "no dead 'pnpm' field"
else
	warn "root package.json still has a 'pnpm' field - pnpm 10.26+ ignores it, remove it"
fi

echo "== 6. workspace package names (npm one-slash rule) =="
BADNAMES="$(git ls-files '*/package.json' 'package.json' | while IFS= read -r f; do
	NAME="$(node -p "require('./${f}').name || ''" 2>/dev/null || echo '')"
	case "${NAME}" in
		@*/*/*) echo "${NAME}  (${f})" ;;
	esac
done)"
if [ -z "${BADNAMES}" ]; then ok "all package names have at most one slash"; else
	bad "package names with two slashes (invalid npm names):"
	printf '%s\n' "${BADNAMES}" | sed 's/^/      /'
fi

echo
echo "Done. '✗' = must fix, '!' = review, '✓' = clear."
