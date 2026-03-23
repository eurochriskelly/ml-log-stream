#!/bin/bash
#
# Wrapper script for pretty-view.js
# Usage: make view FILE=extracts/foo.jsonl [TABLES=1]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

FILE="${1:-}"
TABLES="${2:-}"

if [ -z "$FILE" ]; then
  echo "Usage: make view FILE=extracts/foo.jsonl"
  echo "   or: make view FILE=extracts/foo.jsonl TABLES=1  (for table view)"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "Error: File not found: $FILE"
  exit 1
fi

if [ -n "$TABLES" ]; then
  node scripts/pretty-view.js --tables "$FILE"
else
  node scripts/pretty-view.js "$FILE"
fi
