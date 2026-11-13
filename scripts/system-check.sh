#!/bin/bash

# Determine directory paths relative to the script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Function to check if app/backend has .dev.vars file
check_backend_dev_vars() {
  local dev_vars_path="$WORKSPACE_ROOT/app/backend/.dev.vars"
  
  echo -n "Checking app/backend/.dev.vars... "
  if [ -f "$dev_vars_path" ]; then
    echo "OK (File exists)"
    return 0
  else
    echo "MISSING"
    echo "Error: app/backend/.dev.vars is not set up."
    echo "Please copy .dev.vars.example to .dev.vars in the app/backend directory."
    return 1
  fi
}

# Function to check if app/frontend has .env file and required keys
check_frontend_env() {
  local env_path="$WORKSPACE_ROOT/app/frontend/.env"
  
  echo -n "Checking app/frontend/.env... "
  if [ ! -f "$env_path" ]; then
    echo "MISSING"
    echo "Error: app/frontend/.env is not set up."
    return 1
  fi
  
  local required_keys=(
    "PUBLIC_PROJECT_KEY"
    "PUBLIC_LIWE_SERVER"
    "PUBLIC_DATE"
    "PUBLIC_VERSION"
  )
  
  local missing_keys=()
  for key in "${required_keys[@]}"; do
    if ! grep -q "^[[:space:]]*${key}=" "$env_path"; then
      missing_keys+=("$key")
    fi
  done
  
  if [ ${#missing_keys[@]} -gt 0 ]; then
    echo "INVALID"
    echo "Error: The following required environment variables are missing in app/frontend/.env:"
    for key in "${missing_keys[@]}"; do
      echo "  - $key"
    done
    return 1
  fi
  
  echo "OK (All required keys present)"
  return 0
}

# Main execution
echo "Running system checks..."
echo "----------------------------------------"

FAILED=0

if ! check_backend_dev_vars; then
  FAILED=1
fi

echo "----------------------------------------"

if ! check_frontend_env; then
  FAILED=1
fi

echo "----------------------------------------"

if [ $FAILED -ne 0 ]; then
  echo "System check FAILED."
  exit 1
else
  echo "System check PASSED."
  exit 0
fi
