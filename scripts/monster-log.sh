#!/bin/bash
#
set -e

# First argument must be a directory
if [ -z "$1" ]; then
  DIR=.
else
  DIR=$1
fi

II() { echo "$(date +%Y-%m-%dT%H:%M:%S%z): <mlog> $@"; }

# find all log files in the logs directory
LOG_FILES=$(find "${DIR}" -type f \( \
  -name "*AccessLog*.json" \
  -o -name "*ErrorLog*.json" \
  -o -name "*RequestLog*.txt" \))

# Get zip info from environment variables
SOURCE_ZIP="${SOURCE_ZIP:-unknown}"
EXPORT_DATE="${EXPORT_DATE:-unknown}"

# Loop over every file and pass it to a node program
mlog=monster-log.csv
rlog=requests-log.csv

# Create CSV files if they don't exist (don't delete existing data)
test -f $mlog || touch $mlog
test -f $rlog || touch $rlog

for file in $LOG_FILES; do
  # If the name includes "Error", pass the flag --type error
  II "Processing log [$file] with [$(cat $file | wc -l)] entries"
  if [[ $file == *"Request"* ]]; then
    node ${LIB_DIR}/src/monsterLog.js --log-file $file --output $rlog --type request --source-zip "$SOURCE_ZIP" --export-date "$EXPORT_DATE"
  else
    node ${LIB_DIR}/src/monsterLog.js --log-file $file --output $mlog --source-zip "$SOURCE_ZIP" --export-date "$EXPORT_DATE"
  fi
done

II "Total entries in monster log: [$(cat $mlog | wc -l)]"
II "Total entries in requests log: [$(cat $rlog | wc -l)]"
