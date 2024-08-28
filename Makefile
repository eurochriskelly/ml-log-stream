# Makefile

# Define the destination path and the script source
DEST = /usr/bin/mlloga
SOURCE = scripts/ml-log-analyse.sh

# Get the full path of the current directory
REPO_DIR := $(shell pwd)

# Check for node in PATH
check_node:
	@command -v node >/dev/null 2>&1 || { echo "Error: Node.js is not installed or not in PATH. Please install Node.js before proceeding."; exit 1; }

# Default target: install
install: check_node $(SOURCE)
	sed 's|@@REPO_DIR@@|$(REPO_DIR)|g' $(SOURCE) > mlloga
	sudo cp mlloga $(DEST)
	rm mlloga
	echo "Installation complete: $(DEST)"

# Clean up any generated files
clean:
	rm -f mlloga

.PHONY: install clean check_node
