#!/bin/bash
#
set -e

# First argument must be a directory
if [ -z "$1" ]; then
  DIR=.
else
  DIR=$1
fi

zip=$(find . -name "logs_*.zip" -maxdepth 1)
 
if [ -n "$zip" ]; then
  # The easy and error free way
  echo "Removing and re-extracting log files from source zip.."
  if [ -d logdir ];then rm -rf logdir; fi
  mkdir -p logdir
  cp $zip logdir/
  cd logdir
  unzip -q $zip
  rm $zip
  cd .. 2>/dev/null
else
  # more risky approach
  echo "Clearing temp files ..."
  find "${DIR}" -type f -name "*.tmp" -exec rm {} \;

  echo "Clearing json files ..."
  find "${DIR}" -type f \( \
    -name "*AccessLog*.json" \
    -o -name "*ErrorLog*.json" \
    -o -name "*RequestLog*.json" \) -exec rm {} \;
fi

echo "Clearing monster log files ..."
find "${DIR}" -type f -name "monster-log*" -exec rm {} \;

if [ -n $(which tree) ];then
  tree . | head -n 20
  echo "..."
fi

