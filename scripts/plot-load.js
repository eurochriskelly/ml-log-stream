#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const inputFile = process.env.FILE || "";
const inputDir = process.env.DIR || "";
const topN = Number.parseInt(process.env.TOP || "8", 10);
const customTitle = process.env.TITLE || "";
let outputFile = process.env.OUTPUT || "";

if (!Number.isFinite(topN) || topN < 1) {
  console.error(`TOP must be a positive integer. Received: ${process.env.TOP}`);
  process.exit(1);
}

const target = resolveTarget(inputFile, inputDir);
const csvFiles = target.type === "file" ? [target.path] : findCsvFiles(target.path);

if (csvFiles.length === 0) {
  console.error(`No load CSV files found in ${target.path}`);
  process.exit(1);
}

const charts = csvFiles
  .map((file) => buildChartData(file, topN))
  .sort((a, b) => bucketRank(a.bucketSize) - bucketRank(b.bucketSize) || dimensionRank(a.dimension) - dimensionRank(b.dimension));
const pageTitle =
  customTitle ||
  (target.type === "dir"
    ? `Load Dashboard (${path.basename(target.path)})`
    : charts[0].title);

if (!outputFile) {
  outputFile =
    target.type === "dir"
      ? path.join(target.path, "dashboard.html")
      : path.join(path.dirname(target.path), `${path.parse(target.path).name}.html`);
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, renderHtml(pageTitle, charts, target), "utf8");

console.log(`Wrote dashboard to ${outputFile}`);

function resolveTarget(fileArg, dirArg) {
  if (fileArg) {
    if (!fs.existsSync(fileArg)) {
      console.error(`Input path not found: ${fileArg}`);
      process.exit(1);
    }

    const stat = fs.statSync(fileArg);
    return {
      type: stat.isDirectory() ? "dir" : "file",
      path: fileArg,
    };
  }

  if (dirArg) {
    if (!fs.existsSync(dirArg) || !fs.statSync(dirArg).isDirectory()) {
      console.error(`Directory not found: ${dirArg}`);
      process.exit(1);
    }

    return { type: "dir", path: dirArg };
  }

  const loadRoot = path.join(process.cwd(), "load");
  if (!fs.existsSync(loadRoot)) {
    console.error("No load directory found. Run 'make load' first or pass DIR=<load-dir>.");
    process.exit(1);
  }

  const latestDir = fs
    .readdirSync(loadRoot)
    .map((name) => path.join(loadRoot, name))
    .filter((fullPath) => fs.statSync(fullPath).isDirectory())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

  if (!latestDir) {
    console.error("No load output directories found. Run 'make load' first or pass DIR=<load-dir>.");
    process.exit(1);
  }

  return { type: "dir", path: latestDir };
}

function findCsvFiles(dirPath) {
  return fs
    .readdirSync(dirPath)
    .filter((name) => name.endsWith(".csv"))
    .map((name) => path.join(dirPath, name))
    .sort((a, b) => a.localeCompare(b));
}

function buildChartData(filePath, seriesLimit) {
  const csvText = fs.readFileSync(filePath, "utf8").trim();
  if (!csvText) {
    throw new Error(`Input file is empty: ${filePath}`);
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error(`No data rows found in ${filePath}`);
  }

  const bucketOrder = [...new Set(rows.map((row) => row.bucket_start))].sort();
  const totalsBySeries = new Map();

  for (const row of rows) {
    totalsBySeries.set(
      row.dimension_value,
      (totalsBySeries.get(row.dimension_value) || 0) + row.request_count,
    );
  }

  const topSeries = [...totalsBySeries.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, seriesLimit)
    .map(([name]) => name);

  const topSeriesSet = new Set(topSeries);
  const collapsedName = "__other__";
  const seriesNames = [...topSeries];
  if (totalsBySeries.size > topSeries.length) {
    seriesNames.push(collapsedName);
  }

  const values = new Map(bucketOrder.map((bucket) => [bucket, new Map()]));
  for (const row of rows) {
    const seriesName = topSeriesSet.has(row.dimension_value) ? row.dimension_value : collapsedName;
    values.get(row.bucket_start).set(
      seriesName,
      (values.get(row.bucket_start).get(seriesName) || 0) + row.request_count,
    );
  }

  const series = seriesNames.map((name) => ({
    name,
    values: bucketOrder.map((bucket) => values.get(bucket).get(name) || 0),
    total: bucketOrder.reduce((sum, bucket) => sum + (values.get(bucket).get(name) || 0), 0),
  }));

  const totalRequests = rows.reduce((sum, row) => sum + row.request_count, 0);
  const bucketSize = rows[0].bucket_size;
  const dimension = rows[0].dimension;

  return {
    id: path.parse(filePath).name,
    filePath,
    fileName: path.basename(filePath),
    title: `Requests by ${dimension} (${bucketSize})`,
    bucketSize,
    dimension,
    buckets: bucketOrder,
    axisLabels: computeAxisLabels(bucketOrder),
    series,
    totalRequests,
    maxValue: Math.max(1, ...series.flatMap((item) => item.values)),
  };
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = Object.fromEntries(header.map((key, index) => [key, cols[index] || ""]));
    return {
      bucket_start: row.bucket_start,
      bucket_size: row.bucket_size,
      dimension: row.dimension,
      dimension_value: row.dimension_value,
      request_count: Number.parseInt(row.request_count, 10) || 0,
    };
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function computeAxisLabels(buckets) {
  const parsed = buckets
    .map((bucket, index) => ({ index, bucket, parts: parseBucket(bucket) }))
    .filter((item) => item.parts);

  if (parsed.length === 0) {
    return [];
  }

  const intervalMinutes = chooseLabelIntervalMinutes(parsed);
  const labels = parsed
    .filter((item) => item.parts.second === 0)
    .filter((item) => ((item.parts.hour * 60 + item.parts.minute) % intervalMinutes) === 0)
    .map((item) => ({
      index: item.index,
      label: `${pad(item.parts.hour)}:${pad(item.parts.minute)}`,
    }));

  if (labels.length > 0) {
    return labels;
  }

  const first = parsed[0].parts;
  return [{
    index: parsed[0].index,
    label: `${pad(first.hour)}:${pad(first.minute - (first.minute % 5))}`,
  }];
}

function chooseLabelIntervalMinutes(parsedBuckets) {
  const allowed = [5, 10, 15, 20, 30, 60, 120, 180, 240, 360, 720, 1440];

  if (parsedBuckets.length < 2) {
    return 5;
  }

  const firstMinute = parsedBuckets[0].parts.hour * 60 + parsedBuckets[0].parts.minute;
  const lastMinute = parsedBuckets[parsedBuckets.length - 1].parts.hour * 60 + parsedBuckets[parsedBuckets.length - 1].parts.minute;
  const spanMinutes = Math.max(5, lastMinute - firstMinute);

  for (const interval of allowed) {
    if (Math.floor(spanMinutes / interval) + 1 <= 20) {
      return interval;
    }
  }

  return 1440;
}

function parseBucket(bucket) {
  const match = String(bucket).match(/(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: Number(match[3]),
  };
}

function formatBucketTime(bucket) {
  const parts = parseBucket(bucket);
  if (!parts) {
    return bucket;
  }

  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function bucketRank(bucketSize) {
  return {
    "1h": 0,
    "15m": 1,
    "5m": 2,
    "1m": 3,
    "15s": 4,
    "5s": 5,
  }[bucketSize] ?? 999;
}

function dimensionRank(dimension) {
  return {
    port: 0,
    endpoint: 1,
    user: 2,
    ip: 3,
  }[dimension] ?? 999;
}

function renderHtml(title, charts, target) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #f3ede2;
      --panel: rgba(255, 252, 246, 0.88);
      --panel-strong: rgba(255, 252, 246, 0.97);
      --ink: #17212b;
      --muted: #667085;
      --grid: rgba(116, 93, 65, 0.18);
      --border: rgba(23, 33, 43, 0.08);
      --shadow: 0 20px 60px rgba(23, 33, 43, 0.1);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Iowan Old Style", "Palatino Linotype", serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(14, 116, 144, 0.12), transparent 28%),
        radial-gradient(circle at top right, rgba(154, 52, 18, 0.14), transparent 24%),
        linear-gradient(180deg, #f7f2e7 0%, #ede4d5 100%);
    }
    main {
      max-width: 1500px;
      margin: 0 auto;
      padding: 28px 22px 40px;
    }
    h1 {
      margin: 0;
      font-size: clamp(2.2rem, 5vw, 4rem);
      line-height: 0.95;
      letter-spacing: -0.04em;
    }
    .lede {
      margin: 10px 0 24px;
      color: var(--muted);
      font-size: 1rem;
    }
    .focus {
      background: var(--panel-strong);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 22px;
      box-shadow: var(--shadow);
      margin-bottom: 22px;
    }
    .focus-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      margin: 8px 0 14px;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .focus svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .legend {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px 18px;
      margin-top: 18px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      font-size: 0.95rem;
    }
    .swatch {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      flex: 0 0 auto;
    }
    .legend-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rows {
      display: grid;
      gap: 18px;
    }
    .row {
      background: rgba(255, 252, 246, 0.55);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 14px;
      box-shadow: 0 12px 28px rgba(23, 33, 43, 0.05);
    }
    .row-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .row-title {
      margin: 0;
      font-size: 1.05rem;
      letter-spacing: 0.01em;
    }
    .row-meta {
      color: var(--muted);
      font-size: 0.88rem;
    }
    .row-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 14px;
      box-shadow: 0 14px 30px rgba(23, 33, 43, 0.06);
      cursor: pointer;
      transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 18px 38px rgba(23, 33, 43, 0.09);
    }
    .card.active {
      border-color: rgba(14, 116, 144, 0.45);
      box-shadow: 0 20px 40px rgba(14, 116, 144, 0.14);
    }
    .card h2 {
      margin: 0 0 4px;
      font-size: 1.05rem;
      line-height: 1.05;
    }
    .card-meta {
      color: var(--muted);
      font-size: 0.86rem;
      margin-bottom: 8px;
    }
    .mini {
      width: 100%;
      height: auto;
      display: block;
    }
    .tooltip {
      position: fixed;
      pointer-events: none;
      background: rgba(23, 33, 43, 0.95);
      color: #fff;
      padding: 8px 10px;
      border-radius: 10px;
      font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
      opacity: 0;
      transform: translate(-50%, -110%);
      transition: opacity 120ms ease;
      z-index: 10;
      white-space: nowrap;
    }
    .hint {
      margin-top: 16px;
      color: var(--muted);
      font-size: 0.9rem;
    }
    @media (max-width: 700px) {
      main { padding: 18px 14px 28px; }
      .focus { padding: 16px; }
      .row-grid { grid-template-columns: 1fr; }
    }
    @media (min-width: 701px) and (max-width: 1100px) {
      .row-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <div class="lede">Source: ${escapeHtml(target.path)}. Click any mini chart to zoom it into the main panel.</div>
    <section class="focus">
      <h2 id="focus-title"></h2>
      <div class="focus-meta" id="focus-meta"></div>
      <svg id="focus-chart" viewBox="0 0 1200 620" role="img"></svg>
      <div class="legend" id="legend"></div>
      <div class="hint">Top series by total request count are shown. Remaining series are collapsed into <code>__other__</code>.</div>
    </section>
    <section class="rows" id="rows"></section>
  </main>
  <div class="tooltip" id="tooltip"></div>
  <script>
    const charts = ${JSON.stringify(charts)};
    const tooltip = document.getElementById("tooltip");
    const rowsRoot = document.getElementById("rows");
    const focusTitle = document.getElementById("focus-title");
    const focusMeta = document.getElementById("focus-meta");
    const focusChart = document.getElementById("focus-chart");
    const legend = document.getElementById("legend");
    const colors = ["#9a3412", "#0f766e", "#1d4ed8", "#b45309", "#be185d", "#4338ca", "#4d7c0f", "#7c2d12", "#047857"];
    let activeIndex = 0;

    const groupedCharts = charts.reduce((acc, chart, index) => {
      const key = chart.bucketSize;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({ chart, index });
      return acc;
    }, {});

    Object.entries(groupedCharts).forEach(([bucketSize, items]) => {
      const row = document.createElement("section");
      row.className = "row";
      row.innerHTML = [
        "<div class=\\"row-header\\">",
        "<h2 class=\\"row-title\\">" + escapeHtml(bucketSize) + " buckets</h2>",
        "<div class=\\"row-meta\\">" + items.length + " charts</div>",
        "</div>",
        "<div class=\\"row-grid\\"></div>"
      ].join("");
      const rowGrid = row.querySelector(".row-grid");

      items.forEach(({ chart, index }) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "card";
        card.dataset.index = String(index);
        card.innerHTML = [
          "<h2>" + escapeHtml(chart.title) + "</h2>",
          "<div class=\\"card-meta\\">" + escapeHtml(chart.fileName) + " • total requests: " + chart.totalRequests + "</div>",
          "<svg class=\\"mini\\" viewBox=\\"0 0 320 150\\" role=\\"img\\"></svg>"
        ].join("");
        rowGrid.appendChild(card);
        renderMini(card.querySelector("svg"), chart);
        card.addEventListener("click", () => setActive(index));
      });

      rowsRoot.appendChild(row);
    });

    setActive(0);

    function setActive(index) {
      activeIndex = index;
      document.querySelectorAll(".card").forEach((card) => {
        card.classList.toggle("active", Number(card.dataset.index) === index);
      });
      renderFocus(charts[index]);
    }

    function renderFocus(chart) {
      focusTitle.textContent = chart.title;
      focusMeta.innerHTML = [
        "file: " + escapeHtml(chart.fileName),
        "bucket size: " + escapeHtml(chart.bucketSize),
        "dimension: " + escapeHtml(chart.dimension),
        "buckets: " + chart.buckets.length,
        "total requests: " + chart.totalRequests
      ].map((item) => "<span>" + item + "</span>").join("");

      renderChart(focusChart, chart, true);
      legend.innerHTML = "";

      chart.series.forEach((series, index) => {
        const color = colors[index % colors.length];
        const item = document.createElement("div");
        item.className = "legend-item";
        item.innerHTML = "<span class=\\"swatch\\" style=\\"background:" + color + "\\"></span><span class=\\"legend-label\\">" + escapeHtml(series.name) + " (" + series.total + ")</span>";
        legend.appendChild(item);
      });
    }

    function renderMini(svg, chart) {
      renderChart(svg, chart, false);
    }

    function renderChart(svg, chart, interactive) {
      const width = interactive ? 1200 : 320;
      const height = interactive ? 620 : 150;
      const margin = interactive
        ? { top: 24, right: 22, bottom: 88, left: 72 }
        : { top: 12, right: 10, bottom: 18, left: 12 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      const maxY = Math.max(1, ...chart.series.flatMap((series) => series.values));

      svg.innerHTML = "";
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);

      const axisColor = interactive ? "#17212b" : "rgba(23, 33, 43, 0.35)";
      const gridColor = interactive ? "rgba(116, 93, 65, 0.18)" : "rgba(116, 93, 65, 0.14)";
      const axisLabels = interactive ? chart.axisLabels : [];

      const xFor = (index) => {
        if (chart.buckets.length === 1) {
          return margin.left + innerWidth / 2;
        }
        return margin.left + (index / (chart.buckets.length - 1)) * innerWidth;
      };

      const yFor = (value) => margin.top + innerHeight - (value / maxY) * innerHeight;

      const addSvg = (tag, attrs) => {
        const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
        Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
        svg.appendChild(node);
        return node;
      };

      if (interactive) {
        for (let i = 0; i <= 5; i += 1) {
          const value = (maxY / 5) * i;
          const y = yFor(value);
          addSvg("line", { x1: margin.left, y1: y, x2: width - margin.right, y2: y, stroke: gridColor, "stroke-width": "1" });
          const label = addSvg("text", { x: margin.left - 12, y: y + 4, "text-anchor": "end", fill: "#667085", "font-size": "12" });
          label.textContent = Math.round(value);
        }

        addSvg("line", { x1: margin.left, y1: margin.top, x2: margin.left, y2: height - margin.bottom, stroke: axisColor, "stroke-width": "1.2" });
        addSvg("line", { x1: margin.left, y1: height - margin.bottom, x2: width - margin.right, y2: height - margin.bottom, stroke: axisColor, "stroke-width": "1.2" });

        axisLabels.forEach(({ index, label }) => {
          const x = xFor(index);
          if (index < chart.buckets.length - 1) {
            addSvg("line", { x1: x, y1: margin.top, x2: x, y2: height - margin.bottom, stroke: "rgba(116, 93, 65, 0.12)", "stroke-width": "1" });
          }
          const textNode = addSvg("text", { x, y: height - margin.bottom + 24, "text-anchor": "end", transform: "rotate(-35 " + x + " " + (height - margin.bottom + 24) + ")", fill: "#667085", "font-size": "12" });
          textNode.textContent = label;
        });
      }

      chart.series.forEach((series, seriesIndex) => {
        const color = colors[seriesIndex % colors.length];
        const d = series.values.map((value, index) => (index === 0 ? "M" : "L") + " " + xFor(index).toFixed(2) + " " + yFor(value).toFixed(2)).join(" ");
        addSvg("path", {
          d,
          fill: "none",
          stroke: color,
          "stroke-width": interactive ? "3" : "2",
          "stroke-linejoin": "round",
          "stroke-linecap": "round",
          opacity: interactive ? "1" : "0.92"
        });

        if (!interactive) {
          return;
        }

        series.values.forEach((value, index) => {
          const point = addSvg("circle", {
            cx: xFor(index),
            cy: yFor(value),
            r: 4,
            fill: color,
            stroke: "#fffdf8",
            "stroke-width": "2",
            "data-bucket": chart.buckets[index],
            "data-series": series.name,
            "data-value": value
          });
          point.addEventListener("mouseenter", onEnter);
          point.addEventListener("mouseleave", onLeave);
        });
      });
    }

    function onEnter(event) {
      tooltip.innerHTML = escapeHtml(event.target.dataset.series) + "<br>" + escapeHtml(formatBucketTime(event.target.dataset.bucket)) + "<br>requests: " + escapeHtml(event.target.dataset.value);
      tooltip.style.opacity = "1";
      tooltip.style.left = event.clientX + "px";
      tooltip.style.top = event.clientY + "px";
    }

    function onLeave() {
      tooltip.style.opacity = "0";
    }

    function parseBucket(bucket) {
      const match = String(bucket).match(/(\\d{2}):(\\d{2}):(\\d{2})$/);
      if (!match) {
        return null;
      }

      return {
        hour: Number(match[1]),
        minute: Number(match[2]),
      };
    }

    function formatBucketTime(bucket) {
      const parts = parseBucket(bucket);
      if (!parts) {
        return bucket;
      }

      return String(parts.hour).padStart(2, "0") + ":" + String(parts.minute).padStart(2, "0");
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
