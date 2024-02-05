#!/bin/bash

#now=$(date +"%-%m%dT%H%M%S")
mkdir /tmp/log-analysis
clear

here=$(pwd)

if [ -z "$1" ]; then
    echo "Please provide the path to the dump file."
    exit 1
fi

if [ -f "/tmp/log-analysis/log.zip" ]; then
    echo "Log.zip already exists. Press y to overwrite, n to cancel."
    read answer
    if [ "$answer" != "y" ]; then
        exit 0
    fi
fi

# mv $1 /tmp/log-analysis/log.zip
cd /tmp/log-analysis
echo "Contents of /tmp/log-analysis:"

echo "Unzipping log.zip"
test -f big_import.sql && rm big_import.sql
touch big_import.sql

# unzip -q log.zip
for log in $(find logs -name "*.txt");do
    echo "Processing $log ..."
    node ${here}/../src/log2import.js $log >> big_import.sql
done

ls -alh big_import.sql
echo "Rows to import: $(wc -l big_import.sql)"

