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
echo "Clearing temp files ..."
find "${DIR}" -type f -name "*AccessLog*.txt" -o -name "*ErrorLog*.txt" -exec rm {} \;

echo "Clearing json files ..."
find "${DIR}" -type f \( \
  -name "*AccessLog*.json" \
  -o -name "*ErrorLog*.json" \
  -o -name "*RequestLog*.json" \) -exec rm {} \;

echo "Clearing monster log files ..."
find "${DIR}" -type f -name "*monster-log*" -o -name "*ErrorLog*.txt" -exec rm {} \;
