#!/bin/bash

# Parse options
REMOTE=false
ENV=""
PLAYGROUND=false

show_help() {
  echo "Usage: $0 [options]"
  echo
  echo "Options:"
  echo "  -h, --help        Show this help message"
  echo "  --playground      Update the password in the local playground database (playground/backend/.wrangler)"
  echo "  --remote          Update the remote database"
  echo "  -e, --env=ENV     Specify the Cloudflare wrangler environment"
  exit 0
}

for arg in "$@"; do
  case $arg in
    -h|--help)
      show_help
      ;;
    --remote)
      REMOTE=true
      shift
      ;;
    --env=*)
      ENV="${arg#*=}"
      shift
      ;;
    -e)
      ENV="$2"
      shift 2
      ;;
    --playground)
      PLAYGROUND=true
      shift
      ;;
  esac
done

# Read password silently
echo -n "Enter new admin password: "
read -s PASS1
echo
echo -n "Confirm new admin password: "
read -s PASS2
echo

if [ -z "$PASS1" ]; then
  echo "Error: Password cannot be empty."
  exit 1
fi

if [ "$PASS1" != "$PASS2" ]; then
  echo "Error: Passwords do not match."
  exit 1
fi

# Hash password using Node.js Web Crypto API
echo "Hashing password..."
HASH=$(node -e "
const crypto = require('crypto');
const password = process.argv[1];

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-512',
    },
    key,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const rawKey = await crypto.subtle.exportKey('raw', derivedKey);
  const hashHex = Array.from(new Uint8Array(rawKey))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return saltHex + '$' + hashHex;
}

hashPassword(password).then(hash => console.log(hash)).catch(err => {
  console.error('Hashing failed:', err);
  process.exit(1);
});
" "$PASS1")

if [ $? -ne 0 ] || [ -z "$HASH" ]; then
  echo "Error: Hashing failed."
  exit 1
fi

# Locate backend dir
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$PLAYGROUND" = true ]; then
  if [ "$REMOTE" = true ]; then
    echo "Warning: --playground only applies to local database. Remote updates are not supported for playground via this script."
    exit 1
  fi
  TARGET_DIR="$SCRIPT_DIR/../playground/backend"
else
  TARGET_DIR="$SCRIPT_DIR/../app/backend"
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: Target directory not found at $TARGET_DIR"
  exit 1
fi

cd "$TARGET_DIR"

# Run wrangler command to update
SQL_CMD="UPDATE users SET password = '$HASH' WHERE username = 'admin';"

if [ "$REMOTE" = true ]; then
  if [ -n "$ENV" ]; then
    echo "Updating remote database (binding: DB, env: $ENV)..."
    pnpm wrangler d1 execute DB --remote --env "$ENV" --command "$SQL_CMD"
  else
    echo "Updating remote database (binding: DB)..."
    pnpm wrangler d1 execute DB --remote --command "$SQL_CMD"
  fi
else
  if [ -n "$ENV" ]; then
    echo "Updating local database (binding: DB, env: $ENV)..."
    pnpm wrangler d1 execute DB --local --env "$ENV" --command "$SQL_CMD"
  else
    echo "Updating local database (binding: DB)..."
    pnpm wrangler d1 execute DB --local --command "$SQL_CMD"
  fi
fi
