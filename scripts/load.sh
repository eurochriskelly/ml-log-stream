#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

DB_FILE="${DB:-marklogic_logs.db}"
START_TS="${START:-}"
END_TS="${END:-}"
OUTDIR="${OUTDIR:-}"

if [ -z "$START_TS" ] || [ -z "$END_TS" ]; then
  echo "Usage: make load START=<iso-timestamp> END=<iso-timestamp> [OUTDIR=<dir>] [DB=<sqlite-db>]"
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

if [ -z "$OUTDIR" ]; then
  SAFE_START="${START_TS//:/-}"
  SAFE_END="${END_TS//:/-}"
  OUTDIR="load/load_${SAFE_START}_to_${SAFE_END}"
fi

mkdir -p "$OUTDIR"

TABLE_EXISTS="$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'logs';")"
if [ "$TABLE_EXISTS" -eq 0 ]; then
  echo "Table 'logs' not found in $DB_FILE"
  exit 1
fi

ACCESS_ROWS="$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM logs WHERE type = 'access';")"
if [ "$ACCESS_ROWS" -eq 0 ]; then
  echo "No access-log rows found in logs table."
  exit 1
fi

BASE_CTE=$(cat <<EOF
WITH raw AS (
  SELECT
    datetime(replace(substr(timestamp, 1, 19), 'T', ' ')) AS normalized_timestamp,
    COALESCE(CAST(port AS TEXT), '__empty__') AS port_value,
    COALESCE(NULLIF(user, ''), '__empty__') AS user_value,
    COALESCE(NULLIF(source, ''), '__empty__') AS ip_value,
    CASE
      WHEN COALESCE(url, '') = '' THEN ''
      WHEN instr(url, '?') > 0 THEN substr(url, 1, instr(url, '?') - 1)
      ELSE url
    END AS path_value
  FROM logs
  WHERE type = 'access'
),
filtered AS (
  SELECT
    normalized_timestamp,
    port_value,
    user_value,
    ip_value,
    CASE
      WHEN path_value = '' THEN '__empty__'
      WHEN path_value NOT LIKE '/%' THEN path_value
      WHEN instr(substr(path_value, 2), '/') = 0 THEN path_value
      WHEN instr(substr(path_value, instr(substr(path_value, 2), '/') + 2), '/') = 0 THEN path_value
      ELSE substr(
        path_value,
        1,
        instr(substr(path_value, 2), '/')
        + instr(substr(path_value, instr(substr(path_value, 2), '/') + 2), '/')
      )
    END AS endpoint_value
  FROM raw
  WHERE normalized_timestamp IS NOT NULL
    AND normalized_timestamp >= ${START_EXPR}
    AND normalized_timestamp <= ${END_EXPR}
)
EOF
)

bucket_start_expr() {
  local seconds="$1"
  printf "datetime(CAST(CAST(strftime('%%s', normalized_timestamp) AS INTEGER) / %s AS INTEGER) * %s, 'unixepoch')" "$seconds" "$seconds"
}

write_csv() {
  local label="$1"
  local seconds="$2"
  local dimension="$3"
  local column="$4"
  local file="$OUTDIR/load_${label}_by_${dimension}.csv"
  local bucket_expr

  bucket_expr="$(bucket_start_expr "$seconds")"

  sqlite3 -csv "$DB_FILE" "
${BASE_CTE}
SELECT
  ${bucket_expr} AS bucket_start,
  '${label}' AS bucket_size,
  '${dimension}' AS dimension,
  ${column} AS dimension_value,
  COUNT(*) AS request_count
FROM filtered
GROUP BY bucket_start, ${column}
ORDER BY bucket_start, request_count DESC, dimension_value;
" > "$file"

  local row_count
  row_count="$(wc -l < "$file" | tr -d ' ')"
  local tmp_file="${file}.tmp"
  printf "bucket_start,bucket_size,dimension,dimension_value,request_count\n" > "$tmp_file"
  if [ "$row_count" -gt 0 ]; then
    cat "$file" >> "$tmp_file"
  fi
  mv "$tmp_file" "$file"

  echo "Wrote ${file}"
}

write_csv "1h" 3600 "port" "port_value"
write_csv "1h" 3600 "endpoint" "endpoint_value"
write_csv "1h" 3600 "user" "user_value"
write_csv "1h" 3600 "ip" "ip_value"

write_csv "15m" 900 "port" "port_value"
write_csv "15m" 900 "endpoint" "endpoint_value"
write_csv "15m" 900 "user" "user_value"
write_csv "15m" 900 "ip" "ip_value"

write_csv "5m" 300 "port" "port_value"
write_csv "5m" 300 "endpoint" "endpoint_value"
write_csv "5m" 300 "user" "user_value"
write_csv "5m" 300 "ip" "ip_value"

write_csv "1m" 60 "port" "port_value"
write_csv "1m" 60 "endpoint" "endpoint_value"
write_csv "1m" 60 "user" "user_value"
write_csv "1m" 60 "ip" "ip_value"

write_csv "15s" 15 "port" "port_value"
write_csv "15s" 15 "endpoint" "endpoint_value"
write_csv "15s" 15 "user" "user_value"
write_csv "15s" 15 "ip" "ip_value"

write_csv "5s" 5 "port" "port_value"
write_csv "5s" 5 "endpoint" "endpoint_value"
write_csv "5s" 5 "user" "user_value"
write_csv "5s" 5 "ip" "ip_value"
