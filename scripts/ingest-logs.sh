#!/bin/bash

set -e

main () {
    init "$@"
    extractDump "$1"
    prepareImport "$1"
    read -p "Press enter to create databse and continue ..."
    createSqliteDb
    showInstructions
}

init() {
    DATABASE_FILE="marklogic_logs.db"
    SQL_FILE="big_import.sql"
    LOG_DIR="/tmp/log-analysis"
    HERE=$(pwd)
    test -d $LOG_DIR || mkdir $LOG_DIR
    test -f $SQL_FILE && rm $SQL_FILE
    touch $SQL_FILE
    test -f $LOG_DIR/$DATABASE_FILE && rm $LOG_DIR/$DATABASE_FILE
    clear
    # Check sqlite is installed on mac
    if [ -z "$(which sqlite3)" ]; then
        echo "Please install sqlite3 with brew install sqlite3"
        exit 1
    fi

    # nodejs is available
    if [ -z "$(which node)" ]; then
        echo "Please install nodejs with brew install node"
        exit 1
    fi
    cd $LOG_DIR
}

# Extract the log.zip file to $LOG_DIR
extractDump() {
    if [ -z "$1" ]; then
        echo "Please provide the path to the dump file."
        exit 1
    fi
    echo "Copying log file to analysis folder ..."
    cp -f $1 "${LOG_DIR}/log.zip"
    echo "Contents of ${LOG_DIR}:"
    echo "Unzipping log.zip"
    test -f $SQL_FILE && rm $SQL_FILE
    touch $SQL_FILE
    unzip -qo log.zip
}

prepareImport() {
    echo "Preparing import from folder [$(pwd)] ..."
    for log in $(find . -name "*.txt");do
        node ${HERE}/../src/log2import.js $log >> $SQL_FILE
    done

    ls -alh $SQL_FILE
    echo "Rows to import: $(wc -l $SQL_FILE)"
}

createSqliteDb() {
    echo "Creating sqlite db"
    # Create table schema
    TABLE_SCHEMA="CREATE TABLE IF NOT EXISTS marklogic_logs (
        id TEXT PRIMARY KEY,
        lineNr INTEGER,
        date TEXT,
        host TEXT,
        port TEXT,
        type TEXT,
        timestamp TEXT,
        source TEXT,
        user TEXT,
        method TEXT,
        url TEXT,
        protocol TEXT,
        statusCode TEXT,
        response TEXT,
        message TEXT
    );"

    # Create database and table if not exists
    sqlite3 "$DATABASE_FILE" "$TABLE_SCHEMA"

    # Import SQL file into SQLite database
    local startTime=$(date +%s)
    echo "Starting import process. Please be patient."
    sqlite3 "$DATABASE_FILE" < "$SQL_FILE"
    echo "Import completed. Took $(($(date +%s)-startTime)) seconds."
}

showInstructions() {
  echo "To view DB run:"
  echo "  sqlite3 /tmp/log-analysis/marklogic_logs.db"
  echo ""
  echo "Query with:"
  echo "  select * from marklogic_logs limit 3"
}

main "$@"
