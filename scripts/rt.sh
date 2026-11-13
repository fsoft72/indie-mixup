#!/bin/bash

if [ ! -f "package.json" ]; then
    echo "run this script from the root of the project"
    exit 1
fi

ENV_CF="./app/backend/.dev.vars"
ARGS=()

for arg in "$@"; do
    if [ "$arg" = "--playground" ]; then
        ENV_CF="./playground/backend/.dev.vars"
    else
        ARGS+=("$arg")
    fi
done

source ~/data/opt/pyenv/bin/activate

restest "${ARGS[@]}" --log /ramdisk/restest.log --log-clean --env-cf "$ENV_CF"
