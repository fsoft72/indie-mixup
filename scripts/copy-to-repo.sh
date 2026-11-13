#!/bin/bash

DEST_REPO=../cf-liwe3-ng

if [ ! -e $DEST_REPO ]
then
    echo "$DEST_REPO directory does not exist."
    exit 1
fi

CWD="$(pwd)"


# Selectively copy all data from current repo to the original / official repo

# First ensure $DEST_REPO is at the latest git pull
cd $DEST_REPO
git pull

# Check if there are no pending files that need to be commited.
# Also ensure we don't overwrite any local changes
if [ -n "$(git status --porcelain)" ]; then
    echo "$DEST_REPO has pending changes. Please commit or stash them before running this script."
    exit 1
fi

cd $CWD

cp -r liwe3 $DEST_REPO/.
cp -r scripts $DEST_REPO/.
cp -r work/agents/* $DEST_REPO/work/agents/.
cp -r work/templates/* $DEST_REPO/work/templates/.
cp -r work/modules/activitylog.json $DEST_REPO/work/modules/.
cp -r work/modules/credentials.json $DEST_REPO/work/modules/.
cp -r work/modules/notifier.json $DEST_REPO/work/modules/.
cp -r work/modules/system.json $DEST_REPO/work/modules/.
cp -r work/modules/tags.json $DEST_REPO/work/modules/.
cp -r work/modules/user.json $DEST_REPO/work/modules/.
cp -r work/modules/upload.json $DEST_REPO/work/modules/.
cp -r work/modules/wallet.json $DEST_REPO/work/modules/.
cp -r .agents $DEST_REPO/.
cp -r .githooks/README.md $DEST_REPO/.githooks/.
cp -r .githooks/pre-commit $DEST_REPO/.githooks/.
cp -r .githooks/prepare-commit-msg $DEST_REPO/.githooks/.

cp AGENTS.md $DEST_REPO/.
cp dprint.json $DEST_REPO/.
#cp package.json $DEST_REPO/.
#cp pnpm-workspace.yaml $DEST_REPO/.
#cp tsconfig.json $DEST_REPO/.

# base app
#cp app/backend/.dev.vars.example $DEST_REPO/app/backend/.
#cp app/backend/config.json.example $DEST_REPO/app/backend/.
#cp app/backend/package.json.example $DEST_REPO/app/backend/.
#cp app/backend/wrangler.jsonc.example $DEST_REPO/app/backend/.
