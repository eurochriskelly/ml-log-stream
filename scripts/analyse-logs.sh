#!/bin/bash

# if there are less than 2 arguments, show usage:
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <watch_directory> <database_file>"
  exit 1
fi

clear

WATCH_DIRECTORY="$1"
DATABASE_FILE="$2"

# Use fswatch to monitor for changes and execute the changed SQL file
fswatch "$WATCH_DIRECTORY" | while read FILE; do
  # Check if the changed file is an SQL file
  if [[ "$FILE" =~ \.sql$ ]]; then
    clear
    echo "Detected change in $FILE, executing query..."
    sqlite3 -header -column "$DATABASE_FILE" < "$FILE"
    sleep 2
    echo "Query executed."
  fi
done

