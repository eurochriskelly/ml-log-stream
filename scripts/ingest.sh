#!/bin/bash
#
set -e

II() { echo "$(date +%Y-%m-%dT%H:%M:%S%z): <ingest> $@"; }

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# Function to extract date from filename
# Format: logs_20241115_143022.zip -> 2024-11-15 14:30:22
extract_date() {
  local filename="$1"
  local basename=$(basename "$filename")
  # Extract timestamp from logs_YYYYMMDD_HHMMSS.zip
  if [[ $basename =~ logs_([0-9]{4})([0-9]{2})([0-9]{2})_([0-9]{2})([0-9]{2})([0-9]{2,3})\.zip ]]; then
    echo "${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]} ${BASH_REMATCH[4]}:${BASH_REMATCH[5]}:${BASH_REMATCH[6]}"
  else
    echo "Unknown date"
  fi
}

# Function to process a single zip file
process_file() {
  local file="$1"
  local file_date=$(extract_date "$file")

  II "Processing: $(basename "$file") ($file_date)"

  # Step 1: Clean up and extract
  II "  Extracting logs..."
  if [ -d logdir ]; then
    rm -rf logdir
  fi
  mkdir -p logdir
  unzip -q "$file" -d logdir/

  # Step 1b: Filter out unwanted log lines from extracted txt files
  if [ -n "$SKIP" ]; then
    II "  Filtering out lines matching: $SKIP"
    IFS=',' read -ra SKIP_PATTERNS <<<"$SKIP"

    # Build a grep -v pattern that matches any of the skip strings
    GREP_ARGS=()
    for pattern in "${SKIP_PATTERNS[@]}"; do
      pattern=$(echo "$pattern" | xargs) # trim whitespace
      GREP_ARGS+=(-e "$pattern")
    done

    FILTERED=0
    while IFS= read -r txtfile; do
      BEFORE=$(wc -l <"$txtfile")
      grep -v -F "${GREP_ARGS[@]}" "$txtfile" >"${txtfile}.filtered" || true
      mv "${txtfile}.filtered" "$txtfile"
      AFTER=$(wc -l <"$txtfile")
      FILTERED=$((FILTERED + BEFORE - AFTER))
    done < <(find logdir -type f -name '*.txt')

    II "  Removed $FILTERED lines across all log files"
  fi

  # Step 2: Convert to JSON
  II "  Converting logs to JSON..."
  export LIB_DIR="$PROJECT_DIR"
  bash "$SCRIPT_DIR/jsonify-logs.sh" logdir

  # Step 3: Combine logs into CSV
  II "  Combining logs into CSV format..."
  # Extract source zip filename and date for tracking
  SOURCE_ZIP=$(basename "$file")
  EXPORT_DATE="$file_date"
  export SOURCE_ZIP EXPORT_DATE
  bash "$SCRIPT_DIR/monster-log.sh" logdir

  # Clean up logdir for next file
  rm -rf logdir
}

# Check if LOGFILE is provided via environment variable
if [ -n "$LOGFILE" ]; then
  # Handle comma-separated list of files
  IFS=',' read -ra FILES_TO_PROCESS <<<"$LOGFILE"

  # Validate all files exist
  for file in "${FILES_TO_PROCESS[@]}"; do
    file=$(echo "$file" | xargs) # trim whitespace
    if [ ! -f "$file" ]; then
      echo "Error: LOGFILE not found: $file"
      exit 1
    fi
    if [[ ! "$file" =~ \.zip$ ]]; then
      echo "Error: LOGFILE must end in .zip: $file"
      exit 1
    fi
  done

  II "Processing ${#FILES_TO_PROCESS[@]} file(s)..."
  echo ""

  # Process each file
  for file in "${FILES_TO_PROCESS[@]}"; do
    file=$(echo "$file" | xargs) # trim whitespace
    process_file "$file"
    echo ""
  done
else
  # Find all log zip files in Downloads (portable for bash 3.2/macOS)
  DOWNLOADS_DIR="$HOME/Downloads"
  LOG_FILES=()
  while IFS= read -r file; do
    LOG_FILES+=("$file")
  done < <(find "$DOWNLOADS_DIR" -maxdepth 1 -name 'logs_*.zip' -type f 2>/dev/null | sort -r)

  if [ ${#LOG_FILES[@]} -eq 0 ]; then
    echo "Error: No log files found in $DOWNLOADS_DIR matching 'logs_*.zip'"
    exit 1
  fi

  # Check for --latest flag
  USE_LATEST=false
  for arg in "$@"; do
    if [ "$arg" == "--latest" ]; then
      USE_LATEST=true
      break
    fi
  done

  if [ "$USE_LATEST" = true ]; then
    # Auto-select the most recent file (first in sorted list)
    SELECTED_FILE="${LOG_FILES[0]}"
    SELECTED_DATE=$(extract_date "$SELECTED_FILE")
    II "Auto-selected latest log file: $SELECTED_FILE ($SELECTED_DATE)"
    process_file "$SELECTED_FILE"
  else
    # Interactive mode - build menu options
    echo ""
    echo "Found the following log files in ~/Downloads:"
    echo ""

    # Build array of menu options with dates
    MENU_OPTIONS=()
    for file in "${LOG_FILES[@]}"; do
      date_str=$(extract_date "$file")
      MENU_OPTIONS+=("$(basename "$file") ($date_str)")
    done

    # Use select for interactive menu
    PS3="Select a log file to ingest (or 'q' to quit): "

    select option in "${MENU_OPTIONS[@]}"; do
      if [ "$REPLY" == "q" ] || [ "$REPLY" == "Q" ]; then
        echo "Cancelled."
        exit 0
      fi

      if [[ "$REPLY" =~ ^[0-9]+$ ]] && [ "$REPLY" -ge 1 ] && [ "$REPLY" -le ${#LOG_FILES[@]} ]; then
        SELECTED_FILE="${LOG_FILES[$((REPLY - 1))]}"
        SELECTED_DATE=$(extract_date "$SELECTED_FILE")
        break
      else
        echo "Invalid selection. Please enter a number between 1 and ${#LOG_FILES[@]}, or 'q' to quit."
      fi
    done

    process_file "$SELECTED_FILE"
  fi
fi

# Step 4: Import into SQLite (once after all files are processed)
II "Importing into SQLite database..."
bash "$SCRIPT_DIR/import-csv-to-sqlite.sh"

echo ""
II "Ingestion complete!"

DB_FILE="$PROJECT_DIR/marklogic_logs.db"
if [ -f "$DB_FILE" ]; then
  echo ""
  II "You can now run queries using: make watch-sql"
  II "Create .sql files in the ./sql directory and they will auto-execute"
else
  echo ""
  II "Warning: Database file not found at $DB_FILE"
  II "Ingestion may have failed. Check the output above for errors."
fi
