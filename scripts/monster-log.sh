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

clear
# find all log files in the logs directory
LOG_FILES=$(find "${DIR}" -type f \( \
  -name "*AccessLog*.json" \
  -o -name "*ErrorLog*.json" \
  -o -name "*RequestLog*.json" \))
# Loop over every file and pass it to a node program
mlog=monster-log.csv
mlogtmp=${mlog}.tmp
echo "timestamp,date,host,port,type,lineNr,id,source,user,method,url,protocol,statusCode,response,message" > $mlog
touch $mlogtmp
for file in $LOG_FILES
do
  # If the name includes "Error", pass the flag --type error
  II "Processing log [$file] with [$(cat $file | wc -l)] entries"
  node ${LIB_DIR}/src/monsterLog.js --log-file $file --output $mlogtmp
done

II "Total entries in monster log: [$(cat $mlog|wc -l)]"
II "Sorting monster log..."
cat $mlogtmp | sort >> $mlog
rm $mlogtmp
II "Ready: $mlog"


