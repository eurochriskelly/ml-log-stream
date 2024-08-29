#!/bin/bash
#
set -e

# When uses runs this command, show them the following options:
# - logs to json
# - stream logs
# - ingest logs
#

II() { echo "$(date +%Y-%m-%dT%H:%M:%S%z): <ml> $@"; }

echo "ml-log-analyse"
export LIB_DIR="@@REPO_DIR@@"

interactive=false
# if user provides -i or --interactive switch then provide some options
while [ "$#" -gt 0 ]; do
  case $1 in
  -i | --interactive)
    interactive=true
    shift
    ;;
  *)
    echo "Invalid option"
    exit 1
    ;;
  esac
done

if $interactive; then
  select option in "clean up" "logs to json" "flatten logs" "ingest logs"; do
    case $option in
    "logs to json")
      echo "Converting logs to json..."
      bash $LIB_DIR/scripts/jsonify-logs.sh
      break
      ;;
    "flatten logs")
      echo "Flatten log files"
      bash $LIB_DIR/scripts/monster-log.sh
      break
      ;;
    "ingest logs")
      echo "Ingesting logs..."
      bash $LIB_DIR/scripts/import-csv-to-sqlite.sh
      break
      ;;
    "clean up")
      echo "Clean up"
      bash $LIB_DIR/scripts/clean-up.sh
      break
      ;;
    *)
      echo "Invalid option"
      ;;
    esac
  done
else
  start=$(date +%s)
  II "Cleaning up previous data"
  bash $LIB_DIR/scripts/clean-up.sh
  II "Preparing logs as json"
  bash $LIB_DIR/scripts/jsonify-logs.sh
  II "Combining logs"
  bash $LIB_DIR/scripts/monster-log.sh
  II "Ingesting logs into local db"
  bash $LIB_DIR/scripts/import-csv-to-sqlite.sh
  II "Done in $(($(date +%s) - start)) seconds"
fi


