/*
 * This file receive a log file and converts it to a json file.
 * It can handle 2 types of log files with distinct characteristics.
 * 1. Access logs
 * 2. Error logs
 * 
 * Usage: node log2json.js <log-file>
 */

const { LogParser } = require("./lib/log-parser");

let logType = "access";
process.argv.forEach((val, index, lst ) => {
  if (val == '--type') logType=lst[index + 1] 
});
const logFile = process.argv.pop();

const ext = logType === 'access' ? '.txt' : '.txt.tmp'
const outputFile = logFile.replace(ext, '.json');

async function main() {
  const logParser = new LogParser(logFile);
  console.log(`Exporting from ${logFile} to ${outputFile}`);
  await logParser.exportToJson(outputFile);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
