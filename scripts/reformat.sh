#!/usr/bin/env bash
#
# Reformat ALL the files of the repository with dprint (config: ./dprint.json).
#
# Unlike the formatting step of .githooks/pre-commit, this script does not look
# at the git index: every file handled by dprint is formatted, whether it is
# staged, modified or untouched. Nothing is staged afterwards.
#
# Usage: ./scripts/reformat.sh

set -euo pipefail

# Resolve a dprint binary: PATH first, then a locally installed one.
if command -v dprint > /dev/null 2>&1; then
	DPRINT="dprint"
elif pnpm exec dprint --version > /dev/null 2>&1; then
	DPRINT="pnpm exec dprint"
else
	echo "[reformat] dprint not found. Install it: https://dprint.dev/install/ (or 'pnpm add -D dprint')" >&2
	exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# With no file arguments dprint formats every file matched by dprint.json.
# shellcheck disable=SC2086
$DPRINT fmt

echo "[reformat] formatted all files." >&2
exit 0
