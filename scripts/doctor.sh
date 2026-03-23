#!/bin/bash
#
# Doctor command - checks dependencies and system status
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

REQUIRED_MISSING=0
OPTIONAL_MISSING=0

check_command() {
  local cmd="$1"
  local required="$2"
  local install_hint="$3"
  local version=""

  if command -v "$cmd" &>/dev/null; then
    case "$cmd" in
      unzip)
        version=$(unzip -v 2>&1 | head -n1)
        ;;
      *)
        version=$("$cmd" --version 2>&1 | head -n1 || true)
        ;;
    esac
    echo -e "${GREEN}✓${NC} $cmd: $version"
    return 0
  else
    if [ "$required" == "required" ]; then
      echo -e "${RED}✗${NC} $cmd: NOT FOUND (REQUIRED)"
      echo -e "  ${YELLOW}→ Install:${NC} $install_hint"
      REQUIRED_MISSING=$((REQUIRED_MISSING + 1))
    else
      echo -e "${YELLOW}○${NC} $cmd: not found (optional)"
      echo -e "  ${YELLOW}→ Install:${NC} $install_hint"
      OPTIONAL_MISSING=$((OPTIONAL_MISSING + 1))
    fi
    return 1
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "              ML Log Stream - Doctor Report"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "Checking required dependencies..."
echo ""
check_command "bash" "required" "Should be built into your system"
check_command "node" "required" "brew install node (or from nodejs.org)"
check_command "sqlite3" "required" "brew install sqlite3"
check_command "unzip" "required" "Should be built into macOS"

echo ""
echo "Checking optional dependencies..."
echo ""
check_command "fswatch" "optional" "brew install fswatch (for SQL file watching)"
check_command "tree" "optional" "brew install tree (for prettier directory display)"

echo ""
echo "Checking Node.js modules..."
echo ""
if [ -f package.json ]; then
  if command -v npm &>/dev/null; then
    echo -e "${GREEN}✓${NC} npm: available"
    # Check if node_modules exists
    if [ -d node_modules ]; then
      echo -e "${GREEN}✓${NC} node_modules: installed"
    else
      echo -e "${YELLOW}○${NC} node_modules: not installed (run: npm install)"
    fi
  else
    echo -e "${RED}✗${NC} npm: not found"
  fi
else
  echo -e "${YELLOW}○${NC} package.json: not found"
fi

echo ""
echo "Checking directories..."
echo ""
if [ -d sql ]; then
  echo -e "${GREEN}✓${NC} sql/: exists"
else
  echo -e "${YELLOW}○${NC} sql/: not created yet (run: make sql)"
fi

if [ -f marklogic_logs.db ]; then
  echo -e "${GREEN}✓${NC} marklogic_logs.db: exists ($(stat -f%z marklogic_logs.db 2>/dev/null || stat -c%s marklogic_logs.db 2>/dev/null) bytes)"
else
  echo -e "${YELLOW}○${NC} marklogic_logs.db: not created yet (run: make ingest)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"

if [ $REQUIRED_MISSING -gt 0 ]; then
  echo -e "${RED}ERROR: $REQUIRED_MISSING required tool(s) missing!${NC}"
  echo ""
  echo "Please install the missing tools and run 'make doctor' again."
  echo ""
  exit 1
elif [ $OPTIONAL_MISSING -gt 0 ]; then
  echo -e "${YELLOW}WARNING: $OPTIONAL_MISSING optional tool(s) missing.${NC}"
  echo ""
  echo "Core functionality works, but some features will be unavailable."
  echo ""
  exit 0
else
  echo -e "${GREEN}All systems operational!${NC}"
  echo ""
  exit 0
fi
