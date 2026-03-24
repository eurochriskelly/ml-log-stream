#!/bin/bash
#
# Wrapper script for pretty-view.js
# Usage: make view FILE=extracts/foo.jsonl [ALL=1] [LIMIT=500]
#    or: make view extracts/foo.jsonl [ALL=1] [LIMIT=500]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

FILE="${1:-}"
ALL="${2:-}"
LIMIT="${3:-}"

if [ -z "$FILE" ]; then
  echo "Usage: make view FILE=extracts/foo.jsonl"
  echo "   or: make view extracts/foo.jsonl"
  echo ""
  echo "Options:"
  echo "   ALL=1       Show all rows (may be slow)"
  echo "   LIMIT=500   Show first N rows (default: 500)"
  echo ""
  echo "Pipe to less (preserves colors):"
  echo "   make view FILE=extracts/foo.jsonl ALL=1 | less -R"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "Error: File not found: $FILE"
  exit 1
fi

ARGS=""
[ -n "$ALL" ] && ARGS="$ARGS --all"
[ -n "$LIMIT" ] && ARGS="$ARGS --limit $LIMIT"

# Execute with proper handling of arguments
node scripts/pretty-view.js $ARGS "$FILE"
