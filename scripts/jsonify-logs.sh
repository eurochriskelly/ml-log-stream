#!/bin/bash
#
set -e

# First argument must be a directory
if [ -z "$1" ]; then
  DIR=.
else
  DIR=$1
fi

II() { echo "$(date +%Y-%m-%dT%H:%M:%S%z): <jlog> $@"; }

clear
# find all log files in the logs directory

processLogFiles() {
  local type=$1
  LOG_FILES=$(find "${DIR}" -type f -name "*${type}Log*txt")
  # Loop over every file and pass it to a node program
  for file in $LOG_FILES
  do
    # If the name includes "Error", pass the flag --type error
    if [[ $file == *"Error"* ]]; then
      II "Processing ErrorLog $file"
      node --max-old-space-size=8192 ${LIB_DIR}/src/logFlattenErrorStacks.js --log-file $file --log-file-flat ${file}.tmp
      node --max-old-space-size=8192 ${LIB_DIR}/src/log2json.js --type error ${file}.tmp
      rm ${file}.tmp
    # If the name includes "Access", pass the flag --type access
    elif [[ $file == *"Access"* ]]; then
      II "Processing AccessLog $file"
      node --max-old-space-size=8192 ${LIB_DIR}/src/log2json.js --type access ${file}
    else
      II "ERROR: File $file does not match any type .. tbd"
    fi
  done
}

processLogFiles "Error"
processLogFiles "Access"
# processLogFiles "Request"
