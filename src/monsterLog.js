/*
* Read in the provided json log file and output csv values as follows:
* timestamp,date,host,port,type,lineNr,id,source,user,method,url,protocol,statusCode,response,message
*
* The output file will be give in the --output switch
* The input json file will be given in the --log-file switch
*/
const fs = require('fs');

const DELIMITER = '|';

// Command-line arguments handling
let logFilePath, outputFilePath, logType;
argv = process.argv;
argv.forEach((arg, index, lst) => {
  if (arg === '--log-file') {
    logFilePath = lst[index + 1];
  }
  if (arg === '--type') {
    logType = lst[index + 1];
  }
  if (arg === '--output') {
    outputFilePath = lst[index + 1];
  }
});

if (!logFilePath || !outputFilePath) {
  console.error('Both --log-file and --output switches are required.');
  process.exit(1);
}

// Function to convert JSON object to CSV format
function jsonToCsvLine(logEntry, type) {
  if (type === 'request') {
    let uriNoParams = logEntry.url.split('?').shift();
    let urlParts = [ ...uriNoParams.split('/'), '', ''];
    return [
      logEntry.time,
      logEntry.url,
      urlParts[1],
      urlParts[2],
      logEntry.user,
      logEntry.elapsedTime,
      logEntry.requests,
      logEntry.listCacheHits,
      logEntry.inMemoryListHits,
      logEntry.expandedTreeCacheHits,
      logEntry.valueCacheHits,
      logEntry.valueCacheMisses,
      logEntry.regexpCacheHits,
      logEntry.regexpCacheMisses,
      logEntry.fsProgramCacheHits,
      logEntry.dbProgramCacheHits,
      logEntry.runTime,
    ].join(DELIMITER)
  } else {
    return [
      logEntry.timestamp,
      logEntry.date,
      logEntry.host,
      logEntry.port,
      logEntry.type,
      logEntry.lineNr, // Use lineNr from JSON
      logEntry.id,
      logEntry.source,
      logEntry.user,
      logEntry.method,
      logEntry.url,
      logEntry.protocol,
      logEntry.statusCode,
      logEntry.response,
      JSON.stringify(logEntry.message.replace(/\|/g, '/')) // Handle cases where the message is an object
    ].join(DELIMITER);
  }
}

// Create a write stream to the output file (without header)
const writeFileStream = fs.createWriteStream(outputFilePath, { encoding: 'utf8', flags: 'a' }); // Append mode

// Open using a read stream
const readFileStream = fs.createReadStream(logFilePath, 'utf8');

// Reading and processing the log file line by line
let buffer = '';
readFileStream.on('data', (chunk) => {
  buffer += chunk;
  let lines = buffer.split('\n');
  buffer = lines.pop(); // Handle the last partial line

  lines.forEach((line) => {
    try {
      const logEntry = JSON.parse(line); // Parse JSON
      const csvLine = jsonToCsvLine(logEntry, logType); // Convert to CSV format
      writeFileStream.write(csvLine + '\n'); // Write to output file
    } catch (e) {
      console.error(`Error parsing JSON:`, e);
      console.log('---')
      console.log(line)
      console.log('---')
    }
  });
});

// Handle any remaining buffered data
readFileStream.on('end', () => {
  if (buffer.length > 0) {
    try {
      const logEntry = JSON.parse(buffer);
      const csvLine = jsonToCsvLine(logEntry, logType);
      writeFileStream.write(csvLine + '\n');
    } catch (e) {
      console.error(`Error parsing JSON on last line:`, e);
    }
  }
  writeFileStream.end(); // Close the write stream
  console.log(`Finished processing log file [${logFilePath}].`);
});

readFileStream.on('error', (err) => {
  console.error('Error reading log file:', err);
});

writeFileStream.on('error', (err) => {
  console.error('Error writing to output file:', err);
});
