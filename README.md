# ml-log-stream

Stream logs from MarkLogic.

## Usage

This module is designed to run standalone in the query console or as a
script evalatated using xdmp,eval or v1/eval endpoint outside MarkLogic.

It follows logs accros all log files in multiple hosts and converts
the results to a common format.

### Online log analysis using query console

- Copy the file src/logStreamer.sjs into a query console tab.
- Select and modify one of the examples at the top of the script

### Offline log analysis.

Analysing the log files in a running environment can be slow
and cumbersome, especially if you are repeating the same queries
over and over again.

- Export the log dump using query console
  - Copy the src/extract-logs.xqy query console script into a tab
  - Change any parameters to filter or limit the logs exported
  - Switch to Documents db and run in dry-run mode
  - Remove dry-run mode if all looks good and run the export
  - Download the logfile dump archive

- Import the log dump into a local db for analysis
  - `npm run ingest`
  - This will show available log files from ~/Downloads and start the interactive ingestion
  - To auto-select the latest log file: `npm run ingest -- --latest`
  - The ingestion pipeline will automatically start the SQL watcher when complete

- To analyse the logs:
  - Create `.sql` files in the `./sql` directory
  - The watcher automatically executes queries when you save changes
  - Press Ctrl+C to stop the watcher
  
