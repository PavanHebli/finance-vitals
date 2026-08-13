#!/usr/bin/env bash
set -e

echo ""
echo "=== Vitals local setup ==="
echo ""

# ── API ──────────────────────────────────────────────────────────────────────

echo "→ Setting up api/"

cd api

if [ ! -d ".venv" ]; then
  echo "  Creating Python virtual environment..."
  python3 -m venv .venv
fi

echo "  Installing Python dependencies..."
source .venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "  Created api/.env from .env.example."
  echo "  Open api/.env and fill in your keys, then re-run this script or start the servers manually."
  echo ""
  NEEDS_KEYS=true
fi

deactivate
cd ..

# ── Web ──────────────────────────────────────────────────────────────────────

echo "→ Setting up web/"

cd web

if [ ! -d "node_modules" ]; then
  echo "  Installing Node dependencies..."
  npm install --silent
fi

if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  echo "  Created web/.env.local (points to http://localhost:8000)"
fi

cd ..

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
if [ "${NEEDS_KEYS}" = "true" ]; then
  echo "Setup complete. Fill in api/.env before starting the servers."
else
  echo "Setup complete. Start the servers:"
  echo ""
  echo "  Terminal 1:  cd api && source .venv/bin/activate && uvicorn main:app --reload --port 8000"
  echo "  Terminal 2:  cd web && npm run dev"
  echo ""
  echo "  Then open http://localhost:3000"
fi
echo ""
