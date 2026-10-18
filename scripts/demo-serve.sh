#!/usr/bin/env bash
# npm run demo:serve — builds the web app once and serves it with the API, no watch or hot reload,
# so the pitch runs a fixed build. Ports: API 8787, web 5173 (override with PORT / WEB_PORT).
# It does not free the ports: run it after stopping `npm run dev` (or use different ports).
set -euo pipefail
cd "$(dirname "$0")/.."
API_PORT="${PORT:-8787}"
WEB="${WEB_PORT:-5173}"
for port in "$API_PORT" "$WEB"; do
  if lsof -ti "tcp:$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is in use. Stop the other server first (or run: npm run demo:start to free it)." >&2
    exit 1
  fi
done
echo "Building the web app…"
npx vite build --config web/vite.config.ts --logLevel warn
PORT="$API_PORT" npx tsx server/src/index.ts &
API_PID=$!
MERIDIAN_API_URL="http://localhost:$API_PORT" WEB_PORT="$WEB" npx vite preview --config web/vite.config.ts &
WEB_PID=$!
trap 'kill $API_PID $WEB_PID 2>/dev/null || true' EXIT INT TERM
sleep 2
echo ""
echo "Meridian fixed build (simulated data):"
echo "  Demo window:  http://localhost:$WEB/"
echo "  Presenter:    http://localhost:$WEB/presenter"
echo "  API:          http://localhost:$API_PORT/api/health"
wait
