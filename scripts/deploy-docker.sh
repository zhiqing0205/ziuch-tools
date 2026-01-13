#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env.local" ]]; then
  echo "Missing .env.local. Copy .env.example to .env.local and fill values first." >&2
  exit 1
fi

docker compose up -d --build --remove-orphans
echo "Deployed. Open http://localhost:3099"
