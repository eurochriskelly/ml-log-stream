# ml-log-stream

Stream logs from MarkLogic.

## Usage

The repo now uses `make` directly. No `direnv`, activation script, or shell PATH setup is required.

Run `make` to see the available commands:

```bash
make
```

Typical commands:

```bash
make doctor
make ingest
make ingest-latest
make extract START=2026-01-01T12:02:02 END=2026-01-01T12:06:08
make load START=2026-01-01T12:00:00 END=2026-01-01T13:00:00
make plot FILE=load/.../load_1m_by_endpoint.csv TOP=8
```

## Commands

- `make doctor` checks required and optional dependencies plus local workspace state.
- `make ingest` lets you pick a `logs_*.zip` file from `~/Downloads`, imports it into SQLite, and starts the SQL watcher.
- `make ingest-latest` skips the interactive picker and ingests the newest matching zip file.
- `make extract START=... END=...` exports all rows from every table with a `timestamp` column into timestamp-ordered NDJSON.
- `make load START=... END=...` exports access-log request counts as CSVs across multiple time buckets and grouping dimensions.
- `make plot FILE=...` renders one load CSV to a standalone HTML chart using Node.js.
- `make sql` creates the local `sql/` directory.
- `make clean` removes generated ingestion artifacts.

## Workflow

1. Run `make doctor`.
2. Export logs from MarkLogic and download the zip to `~/Downloads`.
3. Run `make ingest` or `make ingest-latest`.
4. Create `.sql` files in `./sql/`.
5. Save SQL files to auto-execute them against `marklogic_logs.db`.
6. Press `Ctrl+C` to stop the watcher.

## Dependencies

Required:

- `bash`
- `node`
- `sqlite3`
- `unzip`

Optional:

- `fswatch` for SQL file watching
- `tree` for directory display helpers

## Export Logs From MarkLogic

1. Copy [`qconsole/extract-logs.xqy`](qconsole/extract-logs.xqy) into Query Console.
2. Configure and run the export.
3. Download the resulting zip file to `~/Downloads`.

## Query Data

After ingestion, the SQLite database is written to `marklogic_logs.db`.

Create `.sql` files in `./sql/` to run queries. The watcher re-runs the changed file whenever it is saved.

To extract a time window across all timestamped tables:

```bash
make extract START=2026-01-01T12:02:02 END=2026-01-01T12:06:08
```

By default this writes a JSON-lines file under `./extracts/`. You can override that with `OUTPUT=...`, for example:

```bash
make extract START=2026-01-01T12:02:02 END=2026-01-01T12:06:08 OUTPUT=tmp/window.jsonl
```

## Load Analysis

To export request-volume CSVs for charting:

```bash
make load START=2026-01-01T12:00:00 END=2026-01-01T13:00:00
```

This reads access-log rows from the `logs` table and writes CSVs under `./load/` by default. It creates one file for each time bucket and grouping dimension:

- Bucket sizes: `1h`, `15m`, `5m`, `1m`, `15s`, `5s`
- Groupings: `port`, `endpoint`, `user`, `ip`

Example output files:

- `load_1h_by_port.csv`
- `load_5m_by_endpoint.csv`
- `load_1m_by_user.csv`
- `load_15s_by_ip.csv`

The CSV schema is:

```csv
bucket_start,bucket_size,dimension,dimension_value,request_count
2026-01-01 12:00:00,5m,port,8000,123
```

Notes:

- `endpoint` is normalized to the first two path segments, for example `/v1/search`.
- Empty `user`, `ip`, or `port` values are exported as `__empty__`.
- Override the output directory with `OUTDIR=...`.

## Plotting

To turn one exported load CSV into an HTML chart:

```bash
make plot FILE=load/load_2026-01-01T12-00-00_to_2026-01-01T13-00-00/load_1m_by_endpoint.csv TOP=8
```

This uses Node.js only and does not require Python or extra charting packages. By default it writes the HTML file next to the CSV with the same base name, for example:

- `load_1m_by_endpoint.csv`
- `load_1m_by_endpoint.html`

Options:

- `TOP=8` keeps the busiest 8 series by total request count.
- Remaining series are collapsed into `__other__`.
- Override the output path with `OUTPUT=...`.
- Override the chart title with `TITLE=...`.

Example:

```bash
make plot \
  FILE=load/load_2026-01-01T12-00-00_to_2026-01-01T13-00-00/load_1m_by_port.csv \
  TOP=4 \
  TITLE="Requests Per Minute by Port"
```
