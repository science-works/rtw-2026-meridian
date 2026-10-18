#!/usr/bin/env bash
# npm run demo:start — frees the demo ports if something is holding them, then starts the dev server.
# Mac-safe (lsof + kill, both built in). Ctrl-C stops everything.
set -euo pipefail
cd "$(dirname "$0")/.."
for port in 8787 5173; do
  pids=$(lsof -ti "tcp:$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Port $port busy (pid $pids): stopping it."
    kill $pids 2>/dev/null || true
    sleep 1
    pids=$(lsof -ti "tcp:$port" -sTCP:LISTEN 2>/dev/null || true)
    [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
  fi
done
echo ""
echo "Meridian (simulated data) is starting:"
echo "  Demo window:  http://localhost:5173/"
echo "  Presenter:    http://localhost:5173/presenter"
echo "  API:          http://localhost:8787/api/health"
echo ""
exec npm run dev
