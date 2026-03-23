#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

DB_FILE="${DB:-marklogic_logs.db}"
START_TS="${START:-}"
END_TS="${END:-}"
OUTPUT_FILE="${OUTPUT:-}"

if [ -z "$START_TS" ] || [ -z "$END_TS" ]; then
  echo "Usage: make extract START=<iso-timestamp> END=<iso-timestamp> [OUTPUT=<file>] [DB=<sqlite-db>]"
  exit 1
fi

if [ ! -f "$DB_FILE" ]; then
  echo "Database not found: $DB_FILE"
  echo "Run 'make ingest' first or pass DB=<sqlite-db>."
  exit 1
fi

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

START_SQL="$(sql_escape "$START_TS")"
END_SQL="$(sql_escape "$END_TS")"
START_EXPR="datetime(replace(substr('${START_SQL}', 1, 19), 'T', ' '))"
END_EXPR="datetime(replace(substr('${END_SQL}', 1, 19), 'T', ' '))"

if [ -z "$OUTPUT_FILE" ]; then
  mkdir -p extracts
  SAFE_START="${START_TS//:/-}"
  SAFE_END="${END_TS//:/-}"
  OUTPUT_FILE="extracts/extract_${SAFE_START}_to_${SAFE_END}.jsonl"
else
  mkdir -p "$(dirname "$OUTPUT_FILE")"
fi

UNION_QUERY=""
MATCHED_TABLES=0

while IFS= read -r table_name; do
  [ -n "$table_name" ] || continue

  has_timestamp_column="$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM pragma_table_info('$table_name') WHERE name = 'timestamp';")"
  if [ "$has_timestamp_column" -eq 0 ]; then
    continue
  fi

  row_json_args=""
  while IFS= read -r column_name; do
    [ -n "$column_name" ] || continue

    if [ -n "$row_json_args" ]; then
      row_json_args="${row_json_args}, "
    fi

    row_json_args="${row_json_args}'${column_name}', \"${column_name}\""
  done < <(sqlite3 "$DB_FILE" "SELECT name FROM pragma_table_info('$table_name') ORDER BY cid;")

  normalized_timestamp="datetime(replace(substr(timestamp, 1, 19), 'T', ' '))"
  table_query="SELECT ${normalized_timestamp} AS sort_timestamp, json_object('table', '${table_name}', 'timestamp', timestamp, 'row', json_object(${row_json_args})) AS json_row FROM \"${table_name}\" WHERE ${normalized_timestamp} IS NOT NULL AND ${normalized_timestamp} >= ${START_EXPR} AND ${normalized_timestamp} <= ${END_EXPR}"

  if [ -n "$UNION_QUERY" ]; then
    UNION_QUERY="${UNION_QUERY} UNION ALL ${table_query}"
  else
    UNION_QUERY="${table_query}"
  fi

  MATCHED_TABLES=$((MATCHED_TABLES + 1))
done < <(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")

if [ "$MATCHED_TABLES" -eq 0 ]; then
  echo "No tables with a timestamp column were found in $DB_FILE."
  exit 1
fi

FINAL_QUERY="SELECT json_row FROM (${UNION_QUERY}) ORDER BY sort_timestamp;"

sqlite3 -noheader "$DB_FILE" "$FINAL_QUERY" > "$OUTPUT_FILE"

ROW_COUNT="$(wc -l < "$OUTPUT_FILE" | tr -d ' ')"
echo "Wrote ${ROW_COUNT} rows to ${OUTPUT_FILE}"

if [ "$ROW_COUNT" -eq 0 ]; then
  echo ""
  echo "No rows matched after timestamp normalization."
  echo "Timestamp ranges for scanned tables:"

  while IFS= read -r table_name; do
    [ -n "$table_name" ] || continue

    has_timestamp_column="$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM pragma_table_info('$table_name') WHERE name = 'timestamp';")"
    if [ "$has_timestamp_column" -eq 0 ]; then
      continue
    fi

    sqlite3 -header -column "$DB_FILE" "SELECT '${table_name}' AS table_name, MIN(timestamp) AS min_timestamp, MAX(timestamp) AS max_timestamp, COUNT(*) AS rows FROM \"${table_name}\";"
  done < <(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
fi
