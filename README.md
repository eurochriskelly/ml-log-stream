# ml-log-stream

Stream logs from MarkLogic.

## Usage

This module is designed to run standalone in the query console or as a
script evalatated using xdmp,eval or v1/eval endpoint outside MarkLogic.

It follows logs accros all log files in multiple hosts and converts
the results to a common format.

### QConsole example

While testing in qconsole, you could store the contents in a tab to
track what happens in the server after every script run.

### Command line example

Loop in a script (e.g. bash/python) with the v1/eval endpoint to
follow the latest log info. Run with USAGE=1 to see the available
flags and options.
