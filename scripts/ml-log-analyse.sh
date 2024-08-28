#!/bin/bash

# When uses runs this command, show them the following options:
# - logs to json
# - stream logs
# - ingest logs

select option in "logs to json" "stream logs" "ingest logs"
  do
      case $option in
          "logs to json")
              echo "Converting logs to json..."
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
