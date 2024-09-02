#!/bin/bash
#
#
# Find all urls in the access log and group them
#
#
#!/bin/bash

# Define the database and output file
DATABASE="marklogic_logs.db"
OUTPUT_FILE="urls.txt"

# Run the SQL query and export the result to a file
sqlite3 -csv "$DATABASE" \
  "SELECT DISTINCT url FROM logs WHERE type = 'access' AND url != '' and user = 'SruPublicUser' and url like '/v1/search?%';" \
  > "$OUTPUT_FILE"


node ${LIB_DIR}/src/urlGrouper.js --url-file "$OUTPUT_FILE"
