SHELL := /bin/bash

.DEFAULT_GOAL := help

.PHONY: help doctor ingest ingest-latest extract load plot sql clean

help: ## Show available commands
	@printf "\nML Log Stream\n\n"
	@printf "Usage:\n  make <target>\n\n"
	@printf "Targets:\n"
	@awk 'BEGIN {FS = ": .*## "}; /^[a-zA-Z0-9_.-]+: .*## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\nExamples:\n"
	@printf "  make doctor\n"
	@printf "  make ingest\n"
	@printf "  make ingest-latest\n\n"
	@printf "  make extract START=2026-01-01T12:02:02 END=2026-01-01T12:06:08\n\n"
	@printf "  make load START=2026-01-01T12:00:00 END=2026-01-01T13:00:00\n\n"
	@printf "  make plot\n"
	@printf "  make plot DIR=load/load_2026-01-01T12-00-00_to_2026-01-01T13-00-00 TOP=8\n\n"

doctor: ## Check system dependencies and local workspace state
	@bash scripts/doctor.sh

ingest: sql ## Ingest a log export interactively and start the SQL watcher
	@bash scripts/ingest.sh

ingest-latest: sql ## Ingest the most recent log export automatically
	@bash scripts/ingest.sh --latest

extract: ## Export ordered JSON rows from all timestamped tables between START and END
	@START="$(START)" END="$(END)" OUTPUT="$(OUTPUT)" DB="$(DB)" bash scripts/extract.sh

load: ## Export request-count CSVs by time bucket and access-log dimension
	@START="$(START)" END="$(END)" OUTDIR="$(OUTDIR)" DB="$(DB)" bash scripts/load.sh

plot: ## Render a load dashboard to a local HTML page using Node.js
	@FILE="$(FILE)" DIR="$(DIR)" OUTPUT="$(OUTPUT)" TOP="$(TOP)" TITLE="$(TITLE)" node scripts/plot-load.js

sql: ## Create the sql/ workspace directory if needed
	@mkdir -p sql

clean: ## Remove generated ingestion artifacts
	@rm -rf logdir
	@rm -f marklogic_logs.db monster-log.csv requests-log.csv
