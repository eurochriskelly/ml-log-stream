const { LogParser } = require('./lib/log-parser');

let lastTimestamp = "";

const main = () => {
  const LP = new LogParser(process.argv[2]);
  LP.processLog();
  LP.exportToSql();
};

main();

