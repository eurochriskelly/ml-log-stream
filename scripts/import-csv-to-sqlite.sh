#!/bin/bash

# Define variables
DB_NAME="marklogic_logs.db"
TABLE_NAME_1="logs"
TABLE_NAME_2="requests"
CSV_FILE_1="monster-log.csv"
CSV_FILE_2="requests-log.csv"

# Check if CSV file exists
if [ ! -f "$CSV_FILE_1" ]; then
  echo "CSV file not found at $CSV_FILE_1"
  exit 1
fi

# Remove the database if it exists to start fresh
if [ -f "$DB_NAME" ]; then
  rm "$DB_NAME"
fi

# Create SQLite database, define table, and import CSV file
sqlite3 "$DB_NAME" <<EOF
.mode csv
CREATE TABLE $TABLE_NAME_1 (
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

CREATE VIEW v_logs AS
SELECT *, 
       'sed -n ' || lineNr || 'p logdir/' || host || '/' || date || '/' || port || '_' || 
       UPPER(SUBSTR(type, 1, 1)) || LOWER(SUBSTR(type, 2)) || 'Log.txt' AS find 
FROM $TABLE_NAME_1;

.separator "|"
.import $CSV_FILE_1 $TABLE_NAME_1
EOF

echo "Data imported successfully from $CSV_FILE_1 into $DB_NAME ($TABLE_NAME_1)."

# Create SQLite database, define table, and import CSV file
#
sqlite3 "$DB_NAME" <<EOF
.mode csv
CREATE TABLE $TABLE_NAME_2 (
  timestamp TEXT,
  url TEXT,
  pathPart1 TEXT,
  pathPart2 TEXT,
  user TEXT,
  elapsedTime REAL,
  requests INTEGER,
  listCacheHits INtEGER,
  inMemoryListHits INTEGER,
  expandedTreeCacheHits INTEGER,
  valueCacheHits INTEGER,
  valueCacheMisses INTEGER,
  regexpCacheHits INTEGER,
  regexpCacheMisses INTEGER,
  fsProgramCacheHits INTEGER,
  dbProgramCacheHits INTEGER,
  runTime REAL
);

CREATE VIEW grouped_requests AS
SELECT 
    pathPart1,
    pathPart2,
    COUNT(*) AS query_count,
    AVG(elapsedTime) AS avg_elapsed_time,
    COUNT(*) * AVG(elapsedTime) as cost
FROM 
  $TABLE_NAME_2
GROUP BY 
    pathPart1, pathPart2;

CREATE VIEW v1_search_users AS
SELECT 
    user,
    COUNT(*) AS search_count,
    AVG(elapsedTime) AS avg_elapsed_time
FROM 
  $TABLE_NAME_2
WHERE 
    pathPart1 = 'v1' AND pathPart2 = 'search'
GROUP BY 
    user;


.separator "|"
.import $CSV_FILE_2 $TABLE_NAME_2
EOF

echo "Data imported successfully from $CSV_FILE_2 into $DB_NAME ($TABLE_NAME_2)."







