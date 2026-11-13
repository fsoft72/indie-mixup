#!/usr/bin/env bash
#
# rename-backend-packages.sh
#
# Renames the workspace packages whose name contains two "/" (invalid per the
# npm package-name spec "@scope/name") to spec-valid single-slash names:
#
#   @backend/liwe3/core        ->  @backend/liwe3
#   @backend/liwe3/core/src/X  ->  @backend/liwe3/src/X        (subpath, same rule)
#   @backend/modules/<name>    ->  @backend-modules/<name>
#
# What it touches:
#   - package.json "name" and dependency keys
#   - tsconfig.json "paths" aliases
#   - vitest "resolve.alias" maps
#   - wrangler.jsonc(.example) "alias" maps
#   - every *.ts / *.svelte import specifier
#   - helper shell scripts under scripts/ (incl. the backslash-escaped forms
#     used inside their sed expressions)
#
# What it does NOT touch:
#   - physical directories (the pnpm-workspace.yaml globs match them regardless
#     of the package name, and every link:/path alias points at the directory,
#     not the name)
#   - pnpm-lock.yaml (run `pnpm install` afterwards to regenerate it)
#   - node_modules / dist / .svelte-kit (excluded via `git ls-files`)
#
# Usage:
#   scripts/rename-backend-packages.sh --dry-run      # list the files that would change
#   scripts/rename-backend-packages.sh                # apply the rename
#   scripts/rename-backend-packages.sh --with-docs    # also sweep *.md and *.py
#   scripts/rename-backend-packages.sh --allow-dirty  # run even with pending tracked changes
#
# --allow-dirty is for the consumer-repo flow (docs/PNPM-12-migration.md): there
# you run scripts/liwe3-update.sh first (to get this very script plus the renamed
# liwe3/**), which leaves a dirty tree, then run this over it before the first
# commit.
#
set -euo pipefail

DRY_RUN=0
WITH_DOCS=0
ALLOW_DIRTY=0
for arg in "$@"; do
	case "${arg}" in
		--dry-run) DRY_RUN=1 ;;
		--with-docs) WITH_DOCS=1 ;;
		--allow-dirty) ALLOW_DIRTY=1 ;;
		-h | --help)
			sed -n '2,46p' "$0"
			exit 0
			;;
		*)
			echo "unknown option: ${arg}" >&2
			exit 2
			;;
	esac
done

# Move to the repository root regardless of where the script is invoked from.
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "${REPO_ROOT}"

# Refuse to run over pending edits to *tracked* files (untracked files are fine,
# e.g. this script itself before it is committed) so the rename stays a clean diff.
# --allow-dirty opts out (consumer flow: rename right after scripts/liwe3-update.sh).
if [ "${DRY_RUN}" -eq 0 ] && [ "${ALLOW_DIRTY}" -eq 0 ] && ! { git diff --quiet && git diff --cached --quiet; }; then
	echo "ERROR: tracked files have pending changes. Commit or stash first, or pass --allow-dirty." >&2
	exit 1
fi

# Extension allow-list. Docs (*.md) and templates (*.py) are opt-in.
EXT_REGEX='\.(ts|mts|js|mjs|cjs|svelte|json|jsonc|sh|example)$'
if [ "${WITH_DOCS}" -eq 1 ]; then
	EXT_REGEX='\.(ts|mts|js|mjs|cjs|svelte|json|jsonc|sh|example|md|py)$'
fi

# Collect the target files: tracked, right extension, actually mention @backend/.
SELF="${BASH_SOURCE[0]#./}"
mapfile -t FILES < <(
	git ls-files \
		| grep -E "${EXT_REGEX}" \
		| { grep -vxF -e 'pnpm-lock.yaml' -e "${SELF}" -e 'scripts/rename-backend-packages.sh' || true; } \
		| while IFS= read -r f; do
			if grep -qE '@backend[/\\]' "$f"; then
				printf '%s\n' "$f"
			fi
		done
)

if [ "${#FILES[@]}" -eq 0 ]; then
	echo "Nothing to do: no tracked files reference @backend/."
	exit 0
fi

echo "Files to update (${#FILES[@]}):"
printf '  %s\n' "${FILES[@]}"

if [ "${DRY_RUN}" -eq 1 ]; then
	echo
	echo "--dry-run: no files were modified."
	exit 0
fi

# Apply the substitutions. Order does not matter: the two families do not overlap.
#   1. plain "@backend/liwe3/core"      -> "@backend/liwe3"
#   2. plain "@backend/modules/"        -> "@backend-modules/"
#   3. escaped "@backend\/liwe3\/core"  -> "@backend\/liwe3"        (sed exprs in scripts/)
#   4. escaped "@backend\/modules\/"    -> "@backend-modules\/"     (sed exprs in scripts/)
for f in "${FILES[@]}"; do
	perl -0777 -pi -e '
		s{\@backend/liwe3/core}{\@backend/liwe3}g;
		s{\@backend/modules/}{\@backend-modules/}g;
		s{\@backend\\/liwe3\\/core}{\@backend\\/liwe3}g;
		s{\@backend\\/modules\\/}{\@backend-modules\\/}g;
	' "$f"
done

echo
echo "Done. Review with:  git diff"
echo "Next:               pnpm install   # regenerates pnpm-lock.yaml"
