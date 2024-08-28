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

select option in "logs to json" "stream logs" "ingest logs"; do
  case $option in
  "logs to json")
    echo "Converting logs to json..."
    bash $LIB_DIR/scripts/jsonify-logs.sh
    break
    ;;
  "stream logs")
    echo "Streaming logs..."
    break
    ;;
  "ingest logs")
    echo "Ingesting logs..."
    break
    ;;
  *)
    echo "Invalid option"
    ;;
  esac
done
