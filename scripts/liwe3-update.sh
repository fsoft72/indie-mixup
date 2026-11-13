#!/bin/bash

# liwe3-update.sh
#
# Installs the latest version of cf-liwe3-ng into a consumer repo that uses
# liwe3. It clones cf-liwe3-ng (master) into a temporary directory and copies
# the tracked files into the current repo, honouring these rules:
#   - [skip]            paths that are never overwritten
#   - [copy-if-missing] paths copied only when absent here
#
# The rules come from two files:
#   - scripts/data/liwe3-update.defaults.conf   framework rules, read from the
#                                               fresh clone: always up to date
#   - scripts/data/liwe3-update.local.conf      rules of THIS app (optional, never
#                                               overwritten); see the .example file
# The old single file scripts/data/liwe3-update.conf is still honoured, with a
# warning: move its entries to the .local.conf file.
#
# Options:
#   --force     skip the "working tree must be clean" check
#   --dry-run   print what would be copied/skipped without touching the disk
#   --tar FILE  read cf-liwe3-ng from a tar.bz2 archive instead of cloning it.
#               The archive may be a plain folder tarball or a `git archive`
#               output, with or without a single top-level directory. If it
#               contains a .git directory only tracked files are used,
#               otherwise every file in the archive is used.

set -euo pipefail

REPO_HTTPS_URL="https://github.com/fsoft72/cf-liwe3-ng.git"
REPO_SSH_URL="git@github.com:fsoft72/cf-liwe3-ng.git"
REPO_BRANCH="master"
DEFAULTS_CONFIG="scripts/data/liwe3-update.defaults.conf"
LOCAL_CONFIG="scripts/data/liwe3-update.local.conf"
LEGACY_CONFIG="scripts/data/liwe3-update.conf"

FORCE=0
DRY_RUN=0
TAR_FILE=""
while [ $# -gt 0 ]; do
    case "$1" in
        --force) FORCE=1 ;;
        --dry-run) DRY_RUN=1 ;;
        --tar=*) TAR_FILE="${1#--tar=}" ;;
        --tar)
            if [ $# -lt 2 ]; then
                echo "Error: --tar needs a file argument."
                exit 1
            fi
            TAR_FILE="$2"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--force] [--dry-run] [--tar FILE.tar.bz2]"
            exit 1
            ;;
    esac
    shift
done

# The whole logic lives in main(): bash reads a script lazily, and this script
# copies itself over while running. A function is parsed in full before it runs,
# and `exit` below is already read, so a new version of this file cannot break
# the commands that follow the copy loop.
main() {

# --- Guards ------------------------------------------------------------------

# Check we are in the consumer project root
if [ ! -d "liwe3" ] || [ ! -d "app" ]; then
    echo "Error: must run this script from the project root (liwe3/ and app/ directories not found)."
    exit 1
fi

# Check git repo is clean
if [ $FORCE -eq 0 ] && [ $DRY_RUN -eq 0 ] && [ -n "$(git status --porcelain)" ]; then
    echo "Error: working tree has uncommitted changes. Commit or stash them first (or use --force)."
    exit 1
fi

# --- Config parsing --------------------------------------------------------

# _parse_section FILE SECTION
# Prints the trimmed, comment-free entries listed under [SECTION] in FILE
# (nothing when FILE does not exist).
_parse_section() {
    [ -f "$1" ] || return 0
    awk -v section="[$2]" '
        /^\[.*\]$/ { in_section = ($0 == section); next }
        in_section {
            sub(/#.*/, "")
            gsub(/^[ \t]+|[ \t]+$/, "")
            if (length($0)) print
        }
    ' "$1"
}

# _matches PATH ENTRY...
# Returns 0 if PATH matches one of the ENTRY patterns. An entry ending with "/"
# is a directory prefix match, anything else is an exact file match.
_matches() {
    local path="$1"
    shift
    local entry
    for entry in "$@"; do
        case "$entry" in
            */) [ "${path#"$entry"}" != "$path" ] && return 0 ;;
            *)  [ "$path" = "$entry" ] && return 0 ;;
        esac
    done
    return 1
}

# --- Clone into a temporary directory -------------------------------------

TMP="$(mktemp -d)"

# _cleanup
# Removes the temporary clone directory, invoked on any exit.
_cleanup() {
    [ -n "${TMP:-}" ] && rm -rf "$TMP"
}
trap _cleanup EXIT

SRC="$TMP/repo"

# _list_source_files
# Prints the files of the source tree ($SRC), relative to its root: the tracked
# files when it is a git clone, every file otherwise (archive without .git).
_list_source_files() {
    if [ -d "$SRC/.git" ]; then
        git -C "$SRC" ls-files
    else
        (cd "$SRC" && find . -type f -not -path './.git/*' | sed 's|^\./||')
    fi
}

if [ -n "$TAR_FILE" ]; then
    if [ ! -f "$TAR_FILE" ]; then
        echo "Error: archive not found: $TAR_FILE"
        exit 1
    fi
    echo "Extracting $TAR_FILE into a temporary directory..."
    mkdir -p "$SRC"
    tar -xjf "$TAR_FILE" -C "$SRC" || {
        echo "Error: unable to extract $TAR_FILE (expected a tar.bz2 archive)."
        exit 1
    }
    # Archives made from a folder usually wrap everything in one top-level dir:
    # descend into it when the rules file is not at the archive root.
    if [ ! -f "$SRC/$DEFAULTS_CONFIG" ]; then
        top=("$SRC"/*)
        if [ ${#top[@]} -eq 1 ] && [ -d "${top[0]}" ]; then
            SRC="${top[0]}"
        fi
    fi
else
    echo "Cloning $REPO_BRANCH of cf-liwe3-ng into a temporary directory..."
    if ! git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_HTTPS_URL" "$SRC" >/dev/null 2>&1; then
        echo "HTTPS clone failed, trying SSH..."
        git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_SSH_URL" "$SRC" >/dev/null 2>&1 || {
            echo "Error: unable to clone cf-liwe3-ng via HTTPS or SSH."
            exit 1
        }
    fi
fi

# --- Rules -----------------------------------------------------------------

if [ ! -f "$SRC/$DEFAULTS_CONFIG" ]; then
    echo "Error: $DEFAULTS_CONFIG not found in the cf-liwe3-ng source."
    exit 1
fi

if [ -f "$LEGACY_CONFIG" ]; then
    echo "Warning: $LEGACY_CONFIG is the old single config file. Its rules are still applied,"
    echo "         move them to $LOCAL_CONFIG and delete it."
fi

SKIP_LIST=()
KEEP_LIST=()
for conf in "$SRC/$DEFAULTS_CONFIG" "$LOCAL_CONFIG" "$LEGACY_CONFIG"; do
    while IFS= read -r line; do [ -n "$line" ] && SKIP_LIST+=("$line"); done < <(_parse_section "$conf" skip)
    while IFS= read -r line; do [ -n "$line" ] && KEEP_LIST+=("$line"); done < <(_parse_section "$conf" copy-if-missing)
done

# --- Copy tracked files --------------------------------------------------

copied=0
skipped_skip=0
skipped_exist=0

while IFS= read -r file; do
    if [ ${#SKIP_LIST[@]} -gt 0 ] && _matches "$file" "${SKIP_LIST[@]}"; then
        skipped_skip=$((skipped_skip + 1))
        continue
    fi

    if [ ${#KEEP_LIST[@]} -gt 0 ] && _matches "$file" "${KEEP_LIST[@]}" && [ -e "$file" ]; then
        skipped_exist=$((skipped_exist + 1))
        continue
    fi

    if [ $DRY_RUN -eq 1 ]; then
        echo "would copy: $file"
    else
        mkdir -p "$(dirname "$file")"
        cp "$SRC/$file" "$file"
    fi
    copied=$((copied + 1))
done < <(_list_source_files)

# --- Summary -----------------------------------------------------------

echo
if [ $DRY_RUN -eq 1 ]; then
    echo "Dry run - no files were changed."
fi
echo "Copied:               $copied"
echo "Skipped ([skip]):      $skipped_skip"
echo "Skipped (already here): $skipped_exist"
echo "Done."

}

main "$@"
exit $?
