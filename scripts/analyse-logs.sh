#!/bin/bash

# if there are less than 2 arguments, show usage:
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <watch_directory> <database_file>"
  exit 1
fi

clear

WATCH_DIRECTORY="$1"
DATABASE_FILE="$2"
LAST_OUTPUT_FILE=""
LAST_SQL_FILE=""

# Enable job control
set -m

# Function to execute SQL and display results
execute_sql() {
  local sql_file="$1"
  LAST_OUTPUT_FILE=$(mktemp "/tmp/sql_output.XXXXXX")
  LAST_SQL_FILE="$sql_file"
  clear
  echo "Detected change in $sql_file, executing query..."
  echo "Press 'e' to edit output in \$EDITOR"
  echo ""
  sqlite3 -header -column "$DATABASE_FILE" <"$sql_file" | tee "$LAST_OUTPUT_FILE"
  echo ""
  echo "Query executed. Press 'e' to edit output, or wait for next change..."
}

# Cleanup function
cleanup() {
  [[ -n "$LAST_OUTPUT_FILE" ]] && rm -f "$LAST_OUTPUT_FILE"
  exit
}
trap cleanup EXIT INT TERM

# Open terminal for reading
exec 3<>/dev/tty

# Buffer for pending fswatch events
PENDING_FILE=""

# Use fswatch with proper latency and format, capture output to a file
FSWATCH_OUTPUT=$(mktemp)
fswatch -r -l 0.1 "$WATCH_DIRECTORY" >"$FSWATCH_OUTPUT" &
FSWATCH_PID=$!

# Main loop - non-blocking read from both sources
while true; do
  # Check if fswatch has written anything
  if [[ -s "$FSWATCH_OUTPUT" ]]; then
    # Read all pending lines
    while IFS= read -r FILE; do
      if [[ "$FILE" =~ \.sql$ ]]; then
        PENDING_FILE="$FILE"
      fi
    done <"$FSWATCH_OUTPUT"
    # Truncate the file
    : >"$FSWATCH_OUTPUT"

    # Execute the last pending SQL file
    if [[ -n "$PENDING_FILE" ]]; then
      execute_sql "$PENDING_FILE"
      PENDING_FILE=""
    fi
  fi

  # Check if there's keyboard input (non-blocking)
  if IFS= read -t 0.05 -n 1 -r key <&3 2>/dev/null; then
    if [[ "$key" == "e" ]] && [[ -n "$LAST_OUTPUT_FILE" ]] && [[ -f "$LAST_OUTPUT_FILE" ]]; then
      ${EDITOR:-nano} "$LAST_OUTPUT_FILE" <&3 >&1 2>&1
      clear
      echo "Returned from editor. Watching for changes..."
      echo "Press 'e' to edit the last output"
      echo ""
      if [[ -n "$LAST_SQL_FILE" ]] && [[ -f "$LAST_SQL_FILE" ]]; then
        echo "Last query: $LAST_SQL_FILE"
        cat "$LAST_OUTPUT_FILE"
        echo ""
        echo "Press 'e' to edit output, or wait for next change..."
      fi
    fi
  fi

  # Small delay to prevent CPU spinning
  sleep 0.05
done
