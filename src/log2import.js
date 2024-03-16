import { LogParser } from "./lib/log-parser";

let lastTimestamp = "";

const main = () => {
  const LP = new LogParser(process.argv[2]);
  LP.processLog();
  LP.exportToSql();
};

main();
function convertDateFormat(dateStr) {
  // Parse the date string
  const parts = dateStr.match(
    /(\d{2})\/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) (\+\d{4})/,
  );
  if (!parts) return null;
  const months = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const month = months[parts[2]];
  return `${parts[3]}-${month}-${parts[1]}T${parts[4]}:${parts[5]}:${parts[6]}`;
}
