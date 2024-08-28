# Makefile

# Define the destination path and the script source
DEST = /usr/local/bin/mlloga
SOURCE = scripts/ml-log-analyse.sh

# Get the full path of the current directory
REPO_DIR := $(shell pwd)

# Check for node in PATH
check_node:
	@echo "Checking for Node.js..."
	@command -v node >/dev/null 2>&1 || { echo "Error: Node.js is not installed or not in PATH. Please install Node.js before proceeding."; exit 1; }
	@echo "Node.js is installed."

# Default target: install
install: check_node $(SOURCE)
	@echo "Replacing @@REPO_DIR@@ with the current directory path..."
	@sed 's|@@REPO_DIR@@|$(REPO_DIR)|g' $(SOURCE) > mlloga
	@echo "Copying mlloga to $(DEST)..."
	sudo cp mlloga $(DEST)
	@echo "Setting executable permissions on $(DEST)..."
	sudo chmod +x $(DEST)
	@echo "Cleaning up temporary files..."
	@rm mlloga
	@echo "Installation complete: $(DEST)"

# Clean up any generated files
clean:
	@echo "Cleaning up temporary files..."
	rm -f mlloga
	@echo "Clean up complete."

.PHONY: install clean check_node
