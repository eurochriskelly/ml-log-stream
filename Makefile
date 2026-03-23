SHELL := /bin/bash

.DEFAULT_GOAL := help

.PHONY: help doctor ingest ingest-latest sql clean

help: ## Show available commands
	@printf "\nML Log Stream\n\n"
	@printf "Usage:\n  make <target>\n\n"
	@printf "Targets:\n"
	@awk 'BEGIN {FS = ": .*## "}; /^[a-zA-Z0-9_.-]+: .*## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\nExamples:\n"
	@printf "  make doctor\n"
	@printf "  make ingest\n"
	@printf "  make ingest-latest\n\n"

doctor: ## Check system dependencies and local workspace state
	@bash scripts/doctor.sh

ingest: sql ## Ingest a log export interactively and start the SQL watcher
	@bash scripts/ingest.sh

ingest-latest: sql ## Ingest the most recent log export automatically
	@bash scripts/ingest.sh --latest

sql: ## Create the sql/ workspace directory if needed
	@mkdir -p sql

clean: ## Remove generated ingestion artifacts
	@rm -rf logdir
	@rm -f marklogic_logs.db monster-log.csv requests-log.csv
