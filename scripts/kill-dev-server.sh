#!/bin/bash

# Check if ports are provided
if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <port1> [port2 ...]"
  exit 1
fi

for PORT in "$@"; do
  # Validate that port is a number
  if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
    echo "Error: Port '$PORT' must be a number."
    continue
  fi

  echo "Searching for processes on port $PORT..."

  # Find PIDs using lsof
  PIDS=$(lsof -t -i:"$PORT")

  if [ -z "$PIDS" ]; then
    echo "No processes found running on port $PORT."
    continue
  fi

  echo "Found process IDs: $PIDS on port $PORT"

  # Collect parent shells of the found PIDs (they may respawn the process)
  PARENTS=""
  for PID in $PIDS; do
    # Walk up the tree up to 6 levels (workerd -> node cli.js -> node wrangler.js -> sh -c ...)
    CUR="$PID"
    for _ in 1 2 3 4 5 6; do
      PPID_=$(ps -o ppid= -p "$CUR" 2>/dev/null | tr -d ' ')
      # Stop at init, self, or invalid
      if [ -z "$PPID_" ] || [ "$PPID_" -le 1 ] || [ "$PPID_" -eq "$$" ]; then
        break
      fi
      PCMD=$(ps -o cmd= -p "$PPID_" 2>/dev/null)
      # Only kill parent shells/respawners, never the session shell or desktop
      case "$PCMD" in
        *wrangler*|*workerd*|*vite*|*svelte-package*|*"sh -c"*sleep*|*"sh -c"*node*|*"sh -c"*pnpm*|*watch*|*respawn*|*restart*)
          PARENTS="$PARENTS $PPID_"
          ;;
        *)
          break
          ;;
      esac
      CUR="$PPID_"
    done
  done

  # Deduplicate parents
  PARENTS=$(echo "$PARENTS" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/^ *//;s/ *$//')

  if [ -n "$PARENTS" ]; then
    echo "Found parent shells that may respawn the process:$PARENTS"
    echo "Killing parents first..."
    for PPID_ in $PARENTS; do
      if kill "$PPID_" 2>/dev/null; then
        echo "Sent SIGTERM to parent $PPID_"
      fi
    done
    sleep 0.5
    for PPID_ in $PARENTS; do
      if ps -p "$PPID_" > /dev/null 2>&1; then
        kill -9 "$PPID_" 2>/dev/null
        echo "Force-killed parent $PPID_"
      fi
    done
  fi

  echo "Killing processes..."

  # Kill the processes
  for PID in $PIDS; do
    if kill "$PID" 2>/dev/null; then
      echo "Sent SIGTERM to process $PID"
    else
      echo "Failed to send SIGTERM to process $PID or process already stopped"
    fi
  done

  # Wait a brief moment and force kill if any are still alive
  sleep 1
  STILL_ALIVE=""
  for PID in $PIDS; do
    if ps -p "$PID" > /dev/null 2>&1; then
      STILL_ALIVE="$STILL_ALIVE $PID"
    fi
  done

  if [ -n "$STILL_ALIVE" ]; then
    echo "Some processes did not exit on port $PORT, force-killing PIDs:$STILL_ALIVE..."
    kill -9 $STILL_ALIVE 2>/dev/null
  fi
done

echo "Done."
