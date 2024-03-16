#!/bin/bash

# First argument must be a directory
if [ -z "$1" ]; then
  echo "Please provide a directory"
  exit 1
fi

clear
# find all log files in the logs directory
LOG_FILES=$(find $1 -type f -name "*.txt")

# Loop over every file and pass it to a node program
for file in $LOG_FILES
do
  # If the name includes "Error", pass the flag --type error
  if [[ $file == *"Error"* ]]; then
    echo "--"
    echo "Processing $file"
    node ./src/logFlattenErrorStacks.js --log-file $file --log-file-flat ${file}.tmp
    node ./src/log2json.js --type error ${file}.tmp
    echo Removing ${file}.tmp
    rm ${file}.tmp
  # If the name includes "Access", pass the flag --type access
  elif [[ $file == *"Access"* ]]; then
    node ./src/log2json.js --type access $file
  else
    echo "ERROR: File $file does not match any type"
    exit 1
  fi
  echo "files are ..."
  ls $(dirname $file)
done
