const { readFileSync, writeFileSync } = require("fs");

class LogParser {
  constructor(filename) {
    this.mode = filename.includes("AccessLog") ? "access" : "error";
    this.filename = filename;
    const parts = filename.split("/");
    this.host = parts[parts.length - 3];
    this.date = parts[parts.length - 2];
    this.port = parts[parts.length - 1].split("_")[0];
    this.logLines = readFileSync(filename)
      .toString()
      .split("\n")
      .map((line, index) => ({ line, lineNr: index }));
    //.slice(0, 10)
  }
  processLog() {
    const { mode } = this;
    this.logData = this.logLines
      .filter((x) => x.line.trim())
      .map((x) => {
        // replace double quotes with single quotes
        x.line = x.line.replace(/\"/g, "'");
        return x;
      })
      .map(this.logData)
      .sort((a, b) => (a.date > b.date ? 1 : -1));
    return this.logData;
  }
  logData = ({ line, lineNr }) => {
    if (this.mode === "error") {
      // e.g. 2024-02-05 14:50:53.985 Info: DD: undefined FORMAT: json
      return this.record(lineNr, {
        timestamp: line.substring(0, 25).split(" ").slice(0, 2).join("T"),
        level: "Info",
        message: line.split(" ").slice(3).join(" "),
      });
    } else {
      // e.g. 10.50.20.72 - User [05/Feb/2024:00:00:00 +0100] 'GET /v1/documents?category=content&uri=%2Fsgd%2Fcontent%2Ffrbr%2Fsgd%2F19891990%2F0000035451%2F1%2Fjpg%2FSGD_19891990_0012219.jpg HTTP/1.1' 200 108 - 'okhttp/4.9.3
      const regex =
        /^(\S+) - (\S+) \[(\d{2}\/\w+\/\d{4}:\d{2}:\d{2}:\d{2} \+\d{4})\] '(\w+) (\S+) (HTTP\/\d\.\d)' (\d{3}) (\d+) - '(\S+)'/;
      const match = line.match(regex);
      if (match) {
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
      }
      return this.record(lineNr, {});
    }
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
  exportToSql() {
    let sqlScript = "";
    this.logData.forEach((item) => {
      const values = Object.entries(item)
        .map(([key, value]) => {
          if (typeof value === "string") {
            // Escape single quotes in SQL string
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
  exportToJson(fname) {
    console.log(`Writing to ${fname}`);
    writeFileSync(fname, this.logData.map((x) => JSON.stringify(x)).join("\n"));
  }
}

module.exports = { LogParser };