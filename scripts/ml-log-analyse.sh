#!/bin/bash
#
set -e

# When uses runs this command, show them the following options:
# - logs to json
# - stream logs
# - ingest logs
#

echo "ml-log-analyse"
export LIB_DIR="@@REPO_DIR@@"

select option in "logs to json" "monster log" "ingest logs" "clean up"; do
  case $option in
  "logs to json")
    echo "Converting logs to json..."
    bash $LIB_DIR/scripts/jsonify-logs.sh
    break
    ;;
  "monster log")
    echo "Make a monster log..."
    bash $LIB_DIR/scripts/monster-log.sh
    break
    ;;
  "ingest logs")
    echo "Ingesting logs..."
    bash $LIB_DIR/scripts/ingest-logs.sh
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

