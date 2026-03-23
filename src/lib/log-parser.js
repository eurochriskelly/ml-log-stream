const fs = require("fs");
const readline = require("readline");
const { once } = require("events");

class LogParser {
  constructor(filename) {
    this.mode = filename.includes("AccessLog") ? "access" : "error";
    this.filename = filename;
    const parts = filename.split("/");
    this.host = parts[parts.length - 3];
    this.date = parts[parts.length - 2];
    this.port = parts[parts.length - 1].split("_")[0];
  }

  async forEachRecord(onRecord) {
    const input = fs.createReadStream(this.filename, { encoding: "utf8" });
    const lines = readline.createInterface({
      input,
      crlfDelay: Infinity,
    });

    let lineNr = 0;

    try {
      for await (const line of lines) {
        const record = this.parseLine(line, lineNr);
        lineNr += 1;

        if (record) {
          await onRecord(record);
        }
      }
    } finally {
      lines.close();
    }
  }

  parseLine(line, lineNr) {
    if (!line.trim()) {
      return null;
    }

    return this.logData({
      line: line.replace(/"/g, "'"),
      lineNr,
    });
  }

  logData = ({ line, lineNr }) => {
    if (this.mode === "error") {
      return this.record(lineNr, {
        timestamp: line.substring(0, 25).split(" ").slice(0, 2).join("T"),
        level: "Info",
        message: line.split(" ").slice(3).join(" "),
      });
    }

    const regex =
      /^(\S+) - (\S+) \[(\d{2}\/\w+\/\d{4}:\d{2}:\d{2}:\d{2} \+\d{4})\] '(\w+) (\S+) (HTTP\/\d\.\d)' (\d{3}) (\d+) - '(\S+)'/;
    const match = line.match(regex);

    if (!match) {
      return this.record(lineNr, {});
    }

    const [
      _,
      source,
      user,
      date,
      method,
      url,
      protocol,
      statusCode,
      response,
    ] = match;

    return this.record(lineNr, {
      timestamp: convertDateFormat(date),
      source,
      user,
      method,
      url,
      protocol,
      statusCode,
      response,
    });
  };

  record(lineNr, f) {
    return {
      id: `${lineNr}-${this.host}-${this.port}-${this.date}`,
      lineNr,
      date: this.date,
      host: this.host,
      port: this.port,
      type: this.mode,
      timestamp: f.timestamp || "",
      source: f.source || "",
      user: f.user || "",
      method: f.method || "",
      url: f.url || "",
      protocol: f.protocol || "",
      statusCode: f.statusCode || "",
      response: f.response || "",
      message: f.message || "",
    };
  }

  async exportToSql() {
    await this.forEachRecord(async (item) => {
      const values = Object.entries(item)
        .map(([_, value]) => {
          if (typeof value === "string") {
            return `'${value.replace(/'/g, "''")}'`;
          }

          return value;
        })
        .join(", ");

      console.log(
        [
          "INSERT OR IGNORE INTO marklogic_logs (",
          "    id, lineNr, date, host, port, type, ",
          "    timestamp, source, user, method, url, ",
          "    protocol, statusCode, response, message ",
          `) VALUES (${values});`,
        ].join(""),
      );
    });
  }

  async exportToJson(fname) {
    const output = fs.createWriteStream(fname, { encoding: "utf8" });
    let count = 0;

    try {
      await this.forEachRecord(async (item) => {
        const line = `${JSON.stringify(item)}\n`;
        count += 1;

        if (!output.write(line)) {
          await once(output, "drain");
        }

        if (count % 100000 === 0) {
          console.log(`Processed ${count} log lines`);
        }
      });

      output.end();
      await once(output, "finish");
      console.log(`Written to ${fname}`);
    } catch (error) {
      output.destroy();
      console.error(`Error writing to ${fname}: ${error}`);
      process.exit(1);
    }
  }
}

module.exports = { LogParser };

function convertDateFormat(dateStr) {
  const parts = dateStr.match(
    /(\d{2})\/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) (\+\d{4})/,
  );

  if (!parts) {
    return null;
  }

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
