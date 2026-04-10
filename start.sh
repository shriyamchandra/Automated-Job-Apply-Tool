#!/usr/bin/env bash
set -e

# ─── Career-Ops Startup Script ───────────────────────────────────────────────
# Installs dependencies (if needed) and launches the frontend dev server.
# Usage:  ./start.sh            — start the web dashboard
#         ./start.sh --install   — force reinstall dependencies
# ─────────────────────────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND="$ROOT/frontend"
BACKEND="$ROOT/backend"

# ─── Colors ──────────────────────────────────────────────────────────────────
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${BLUE}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }

# ─── Check Node.js ───────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  # Try loading nvm
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi

if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install it from https://nodejs.org or via nvm."
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  fail "Node.js >= 18 required (found $(node -v))."
fi
ok "Node.js $(node -v)"

# ─── Backend dependencies ────────────────────────────────────────────────────
if [ ! -d "$BACKEND/node_modules" ] || [ "$1" = "--install" ]; then
  info "Installing backend dependencies..."
  (cd "$BACKEND" && npm install --silent)
  ok "Backend dependencies installed"
else
  ok "Backend dependencies up to date"
fi

# ─── Frontend dependencies ───────────────────────────────────────────────────
if [ ! -d "$FRONTEND/node_modules" ] || [ "$1" = "--install" ]; then
  info "Installing frontend dependencies..."
  (cd "$FRONTEND" && npm install --silent)
  ok "Frontend dependencies installed"
else
  ok "Frontend dependencies up to date"
fi

# ─── Launch ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Career-Ops Dashboard${NC}"
echo -e "────────────────────"
echo -e "  ${GREEN}➜${NC}  Local:   ${BOLD}http://localhost:3000${NC}"
echo -e "  ${BLUE}➜${NC}  Backend: ${BACKEND}"
echo -e "  ${BLUE}➜${NC}  Stop:    Ctrl+C"
echo ""

cd "$FRONTEND" && exec npm run dev
