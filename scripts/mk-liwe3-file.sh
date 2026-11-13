#!/bin/bash

# mk-liwe3-file.sh
#
# Builds the tar.bz2 archive of cf-liwe3-ng that scripts/liwe3-update.sh can read
# with its --tar option. The archive holds the files tracked by git at HEAD, with
# paths relative to the repo root (no top-level directory), exactly what
# liwe3-update.sh expects.
#
# Usage: scripts/mk-liwe3-file.sh [-o|--output FILE]
#   -o, --output FILE   archive path (required)

set -euo pipefail

OUTPUT=""
while [ $# -gt 0 ]; do
    case "$1" in
        -o|--output)
            if [ $# -lt 2 ]; then
                echo "Error: $1 needs a file argument."
                exit 1
            fi
            OUTPUT="$2"
            shift
            ;;
        --output=*) OUTPUT="${1#--output=}" ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [-o|--output FILE]"
            exit 1
            ;;
    esac
    shift
done

if [ -z "$OUTPUT" ]; then
    echo "Error: output file not specified, use -o or --output."
    echo "Usage: $0 [-o|--output FILE]"
    exit 1
fi

# The repo root is the parent of the directory holding this script
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# _main
# Creates the archive from the tracked files at HEAD.
_main() {
    [ -d "$(dirname "$OUTPUT")" ] || { echo "Error: directory not found: $(dirname "$OUTPUT")"; exit 1; }

    if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
        echo "Warning: working tree has uncommitted changes, they are NOT in the archive (only HEAD is)."
    fi

    git -C "$ROOT" archive --format=tar HEAD | bzip2 > "$OUTPUT"

    echo "Created $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
    echo "Use it with: scripts/liwe3-update.sh --tar $OUTPUT"
}

_main
