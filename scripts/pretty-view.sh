#!/bin/bash
#
# Wrapper script for pretty-view.js
# Usage: make view FILE=extracts/foo.jsonl [ALL=1] [LIMIT=500]
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
  echo "   or: make view FILE=extracts/foo.jsonl ALL=1     (show all rows - WARNING: slow)"
  echo "   or: make view FILE=extracts/foo.jsonl LIMIT=500  (show first 500)"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "Error: File not found: $FILE"
  exit 1
fi

ARGS=""
[ -n "$ALL" ] && ARGS="$ARGS --all"
[ -n "$LIMIT" ] && ARGS="$ARGS --limit $LIMIT"

node scripts/pretty-view.js $ARGS "$FILE"
