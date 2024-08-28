#!/bin/bash
#
set -e

# First argument must be a directory
if [ -z "$1" ]; then
  DIR=.
else
  DIR=$1
fi

clear
# find all log files in the logs directory
LOG_FILES=$(find "${DIR}" -type f \( \
  -name "*AccessLog*.json" \
  -o -name "*ErrorLog*.json" \
  -o -name "*RequestLog*.json" \))
# Loop over every file and pass it to a node program
mlog=monster-log.csv
echo "timestamp,date,host,port,type,lineNr,id,source,user,method,url,protocol,statusCode,response,message" > $mlog
for file in $LOG_FILES
do
  # If the name includes "Error", pass the flag --type error
  echo "Processing log [$file] with [$(cat $file | wc -l)] entries"
  node ${LIB_DIR}/src/monsterLog.js --log-file $file --output $mlog
done

echo "Total entries in monster log: [$(cat $mlog|wc -l)]"
