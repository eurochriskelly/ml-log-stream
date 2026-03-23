const { LogParser } = require('./lib/log-parser');

let lastTimestamp = "";

const main = async () => {
  const LP = new LogParser(process.argv[2]);
  await LP.exportToSql();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
