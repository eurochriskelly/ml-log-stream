#!/bin/bash
#
# Compact one or more log zips into a single filtered zip.
# Reuses the same unzip + SKIP filtering logic as ingest.sh,
# but instead of converting to JSON/CSV/SQLite it zips logdir/ back up.
#
set -e

II() { echo "$(date +%Y-%m-%dT%H:%M:%S%z): <compact> $@"; }

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# --- Validate inputs --------------------------------------------------------

if [ -z "$LOGFILE" ]; then
  echo "Error: LOGFILE is required."
  echo "Usage: make compact LOGFILE=a.zip[,b.zip] [SKIP='Fine:,Debug:'] OUTPUT=out.zip"
  exit 1
fi

if [ -z "$OUTPUT" ]; then
  echo "Error: OUTPUT is required."
  echo "Usage: make compact LOGFILE=a.zip[,b.zip] [SKIP='Fine:,Debug:'] OUTPUT=out.zip"
  exit 1
fi

if [[ ! "$OUTPUT" =~ \.zip$ ]]; then
  echo "Error: OUTPUT must end in .zip: $OUTPUT"
  exit 1
fi

if [ -f "$OUTPUT" ]; then
  echo "Error: OUTPUT file already exists: $OUTPUT"
  echo "Choose a different name or delete it first."
  exit 1
fi

# Parse comma-separated list of input files
IFS=',' read -ra FILES_TO_PROCESS <<<"$LOGFILE"

# Validate all input files exist
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

# --- Extract all zips into a single logdir/ ---------------------------------

II "Compacting ${#FILES_TO_PROCESS[@]} file(s) into $OUTPUT"
echo ""

if [ -d logdir ]; then
  rm -rf logdir
fi
mkdir -p logdir

for file in "${FILES_TO_PROCESS[@]}"; do
  file=$(echo "$file" | xargs) # trim whitespace
  II "  Extracting: $(basename "$file")"
  unzip -q -o "$file" -d logdir/
done

# --- Filter (reuses same SKIP logic as ingest.sh) ---------------------------

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
  DROPPED_FILES=0
  while IFS= read -r txtfile; do
    BEFORE=$(wc -l <"$txtfile")
    grep -v -F "${GREP_ARGS[@]}" "$txtfile" >"${txtfile}.filtered" || true
    AFTER=$(wc -l <"${txtfile}.filtered")
    if [ "$AFTER" -eq 0 ]; then
      # Every line was filtered out -- drop the file entirely
      rm -f "$txtfile" "${txtfile}.filtered"
      DROPPED_FILES=$((DROPPED_FILES + 1))
    else
      mv "${txtfile}.filtered" "$txtfile"
    fi
    FILTERED=$((FILTERED + BEFORE - AFTER))
  done < <(find logdir -type f -name '*.txt')

  II "  Removed $FILTERED lines across all log files"
  if [ "$DROPPED_FILES" -gt 0 ]; then
    II "  Dropped $DROPPED_FILES file(s) that were completely empty after filtering"
  fi
fi

# --- Zip logdir/ back up ----------------------------------------------------

# Resolve OUTPUT to absolute path so the cd into logdir doesn't break it
OUTPUT_DIR="$(cd "$(dirname "$OUTPUT")" && pwd)"
OUTPUT_BASE="$(basename "$OUTPUT")"
OUTPUT_ABS="$OUTPUT_DIR/$OUTPUT_BASE"

II "  Creating $OUTPUT"
(cd logdir && zip -r -q "$OUTPUT_ABS" .)

OUTPUT_SIZE=$(du -h "$OUTPUT" | cut -f1 | xargs)
II "  Created $OUTPUT ($OUTPUT_SIZE)"

# Clean up
rm -rf logdir

echo ""
II "Compact complete: $OUTPUT"
echo ""

# --- Optionally delete originals --------------------------------------------

if [ "$AUTO_DELETE" = "1" ]; then
  for file in "${FILES_TO_PROCESS[@]}"; do
    file=$(echo "$file" | xargs)
    II "  Deleting: $file"
    rm -f "$file"
  done
  II "Deleted ${#FILES_TO_PROCESS[@]} original file(s)."
else
  echo "Delete the original zip file(s)?"
  for file in "${FILES_TO_PROCESS[@]}"; do
    echo "  $(echo "$file" | xargs)"
  done
  read -r -p "(y/n): " REPLY
  if [ "$REPLY" = "y" ] || [ "$REPLY" = "Y" ]; then
    for file in "${FILES_TO_PROCESS[@]}"; do
      file=$(echo "$file" | xargs)
      II "  Deleting: $file"
      rm -f "$file"
    done
    II "Deleted ${#FILES_TO_PROCESS[@]} original file(s)."
  else
    II "Originals kept."
  fi
fi
