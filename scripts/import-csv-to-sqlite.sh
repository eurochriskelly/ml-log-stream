#!/bin/bash

# Define variables
DB_NAME="marklogic_logs.db"
TABLE_NAME="logs"
CSV_FILE="monster-log.csv"

# Check if CSV file exists
if [ ! -f "$CSV_FILE" ]; then
  echo "CSV file not found at $CSV_FILE"
  exit 1
fi

# Remove the database if it exists to start fresh
if [ -f "$DB_NAME" ]; then
  rm "$DB_NAME"
fi

# Create SQLite database, define table, and import CSV file
sqlite3 "$DB_NAME" <<EOF
.mode csv
CREATE TABLE $TABLE_NAME (
  timestamp TEXT,
  date TEXT,
  host TEXT,
  port INTEGER,
  type TEXT,
  lineNr INTEGER,
  id INTEGER,
  source TEXT,
  user TEXT,
  method TEXT,
  url TEXT,
  protocol TEXT,
  statusCode INTEGER,
  response TEXT,
  message TEXT
);
.import $CSV_FILE $TABLE_NAME
EOF

echo "Data imported successfully from $CSV_FILE into $DB_NAME ($TABLE_NAME)."
