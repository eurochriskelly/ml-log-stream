#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const inputFile = process.env.FILE || "";
const topN = Number.parseInt(process.env.TOP || "8", 10);
const customTitle = process.env.TITLE || "";
let outputFile = process.env.OUTPUT || "";

if (!inputFile) {
  console.error("Usage: make plot FILE=<load-csv> [TOP=8] [OUTPUT=<html-file>] [TITLE=<chart-title>]");
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  process.exit(1);
}

if (!Number.isFinite(topN) || topN < 1) {
  console.error(`TOP must be a positive integer. Received: ${process.env.TOP}`);
  process.exit(1);
}

if (!outputFile) {
  const parsed = path.parse(inputFile);
  outputFile = path.join(parsed.dir || ".", `${parsed.name}.html`);
}

const csvText = fs.readFileSync(inputFile, "utf8").trim();
if (!csvText) {
  console.error(`Input file is empty: ${inputFile}`);
  process.exit(1);
}

const rows = parseCsv(csvText);
if (rows.length === 0) {
  console.error(`No data rows found in ${inputFile}`);
  process.exit(1);
}

const bucketSize = rows[0].bucket_size;
const dimension = rows[0].dimension;
const title = customTitle || `Requests by ${dimension} (${bucketSize})`;

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
  .slice(0, topN)
  .map(([name]) => name);

const topSeriesSet = new Set(topSeries);
const collapsedName = "__other__";
const seriesNames = [...topSeries];
if (totalsBySeries.size > topSeries.length) {
  seriesNames.push(collapsedName);
}

const values = new Map();
for (const bucket of bucketOrder) {
  values.set(bucket, new Map());
}

for (const row of rows) {
  const seriesName = topSeriesSet.has(row.dimension_value) ? row.dimension_value : collapsedName;
  if (!values.get(row.bucket_start).has(seriesName)) {
    values.get(row.bucket_start).set(seriesName, 0);
  }
  values.get(row.bucket_start).set(
    seriesName,
    values.get(row.bucket_start).get(seriesName) + row.request_count,
  );
}

const series = seriesNames.map((name) => ({
  name,
  values: bucketOrder.map((bucket) => values.get(bucket).get(name) || 0),
  total: bucketOrder.reduce((sum, bucket) => sum + (values.get(bucket).get(name) || 0), 0),
}));

const chartData = {
  title,
  bucketSize,
  dimension,
  buckets: bucketOrder,
  series,
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, renderHtml(chartData), "utf8");

console.log(`Wrote chart to ${outputFile}`);

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

function renderHtml(data) {
  const payload = JSON.stringify(data);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(data.title)}</title>
  <style>
    :root {
      --bg: #f4f1ea;
      --panel: #fffdf8;
      --ink: #1f2937;
      --muted: #667085;
      --grid: #d9d1c4;
      --accent: #9a3412;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Iowan Old Style", "Palatino Linotype", serif;
      background:
        radial-gradient(circle at top right, rgba(154, 52, 18, 0.12), transparent 28%),
        linear-gradient(180deg, #f7f2e9 0%, #efe7d8 100%);
      color: var(--ink);
    }
    main {
      max-width: 1280px;
      margin: 0 auto;
      padding: 32px 24px 48px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: clamp(2rem, 4vw, 3.25rem);
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .meta {
      color: var(--muted);
      margin-bottom: 24px;
      font-size: 0.95rem;
    }
    .panel {
      background: rgba(255, 253, 248, 0.9);
      border: 1px solid rgba(31, 41, 55, 0.08);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 18px 50px rgba(31, 41, 55, 0.08);
      backdrop-filter: blur(8px);
    }
    svg {
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
    .hint {
      margin-top: 18px;
      color: var(--muted);
      font-size: 0.9rem;
    }
    .tooltip {
      position: fixed;
      pointer-events: none;
      background: rgba(31, 41, 55, 0.94);
      color: white;
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
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(data.title)}</h1>
    <div class="meta">Bucket size: ${escapeHtml(data.bucketSize)} • Dimension: ${escapeHtml(data.dimension)} • Buckets: ${data.buckets.length}</div>
    <section class="panel">
      <svg id="chart" viewBox="0 0 1200 620" role="img" aria-label="${escapeHtml(data.title)}"></svg>
      <div class="legend" id="legend"></div>
      <div class="hint">Top ${data.series.length}${data.series.some((s) => s.name === "__other__") ? " series including __other__" : " series"} by total request count.</div>
    </section>
  </main>
  <div class="tooltip" id="tooltip"></div>
  <script>
    const chartData = ${payload};

    const svg = document.getElementById("chart");
    const legend = document.getElementById("legend");
    const tooltip = document.getElementById("tooltip");
    const width = 1200;
    const height = 620;
    const margin = { top: 24, right: 24, bottom: 88, left: 72 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const colors = ["#9a3412", "#0f766e", "#1d4ed8", "#b45309", "#be185d", "#4338ca", "#4d7c0f", "#7c2d12", "#047857"];
    const maxY = Math.max(1, ...chartData.series.flatMap((series) => series.values));
    const ySteps = 5;

    function xFor(index) {
      if (chartData.buckets.length === 1) return margin.left + innerWidth / 2;
      return margin.left + (index / (chartData.buckets.length - 1)) * innerWidth;
    }

    function yFor(value) {
      return margin.top + innerHeight - (value / maxY) * innerHeight;
    }

    function linePath(values) {
      return values.map((value, index) => \`\${index === 0 ? "M" : "L"} \${xFor(index).toFixed(2)} \${yFor(value).toFixed(2)}\`).join(" ");
    }

    function addSvg(tag, attrs) {
      const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      svg.appendChild(node);
      return node;
    }

    svg.innerHTML = "";
    addSvg("rect", { x: 0, y: 0, width, height, fill: "transparent" });

    for (let i = 0; i <= ySteps; i += 1) {
      const value = (maxY / ySteps) * i;
      const y = yFor(value);
      addSvg("line", { x1: margin.left, y1: y, x2: width - margin.right, y2: y, stroke: "#d9d1c4", "stroke-width": "1" });
      const label = addSvg("text", { x: margin.left - 12, y: y + 4, "text-anchor": "end", fill: "#667085", "font-size": "12" });
      label.textContent = Math.round(value);
    }

    addSvg("line", { x1: margin.left, y1: margin.top, x2: margin.left, y2: height - margin.bottom, stroke: "#1f2937", "stroke-width": "1.2" });
    addSvg("line", { x1: margin.left, y1: height - margin.bottom, x2: width - margin.right, y2: height - margin.bottom, stroke: "#1f2937", "stroke-width": "1.2" });

    chartData.buckets.forEach((bucket, index) => {
      const x = xFor(index);
      if (index < chartData.buckets.length - 1) {
        addSvg("line", { x1: x, y1: margin.top, x2: x, y2: height - margin.bottom, stroke: "rgba(217, 209, 196, 0.45)", "stroke-width": "1" });
      }
      const label = addSvg("text", { x, y: height - margin.bottom + 24, "text-anchor": "end", transform: \`rotate(-35 \${x} \${height - margin.bottom + 24})\`, fill: "#667085", "font-size": "12" });
      label.textContent = bucket;
    });

    chartData.series.forEach((series, seriesIndex) => {
      const color = colors[seriesIndex % colors.length];
      addSvg("path", {
        d: linePath(series.values),
        fill: "none",
        stroke: color,
        "stroke-width": "3",
        "stroke-linejoin": "round",
        "stroke-linecap": "round"
      });

      series.values.forEach((value, index) => {
        const point = addSvg("circle", {
          cx: xFor(index),
          cy: yFor(value),
          r: 4,
          fill: color,
          stroke: "#fffdf8",
          "stroke-width": "2",
          "data-bucket": chartData.buckets[index],
          "data-series": series.name,
          "data-value": value
        });

        point.addEventListener("mouseenter", onEnter);
        point.addEventListener("mouseleave", onLeave);
      });

      const item = document.createElement("div");
      item.className = "legend-item";
      item.innerHTML = \`<span class="swatch" style="background:\${color}"></span><span class="legend-label">\${escapeHtml(series.name)} (\${series.total})</span>\`;
      legend.appendChild(item);
    });

    function onEnter(event) {
      tooltip.innerHTML = \`\${escapeHtml(event.target.dataset.series)}<br>\${event.target.dataset.bucket}<br>requests: \${event.target.dataset.value}\`;
      tooltip.style.opacity = "1";
      tooltip.style.left = event.clientX + "px";
      tooltip.style.top = event.clientY + "px";
    }

    function onLeave() {
      tooltip.style.opacity = "0";
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
