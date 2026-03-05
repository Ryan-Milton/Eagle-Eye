#!/usr/bin/env bash
set -euo pipefail

# Start AIS proxy in background
echo "[dev] Starting AIS proxy on :4001..."
bun run server/ais-proxy.ts &
AIS_PID=$!

# Start Flight (ADS-B) proxy in background
echo "[dev] Starting ADS-B proxy on :4002..."
bun run server/flight-proxy.ts &
ADSB_PID=$!

# Start HexDB proxy in background
echo "[dev] Starting HexDB proxy on :4003..."
bun run server/hexdb-proxy.ts &
HEXDB_PID=$!

cleanup() {
  echo "[dev] Shutting down AIS proxy (pid $AIS_PID)..."
  kill "$AIS_PID" 2>/dev/null || true
  wait "$AIS_PID" 2>/dev/null || true
  echo "[dev] Shutting down ADS-B proxy (pid $ADSB_PID)..."
  kill "$ADSB_PID" 2>/dev/null || true
  wait "$ADSB_PID" 2>/dev/null || true
  echo "[dev] Shutting down HexDB proxy (pid $HEXDB_PID)..."
  kill "$HEXDB_PID" 2>/dev/null || true
  wait "$HEXDB_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait for the AIS proxy to be listening (up to 10s)
for i in $(seq 1 40); do
  if lsof -iTCP:4001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[dev] AIS proxy is up."
    break
  fi
  if ! kill -0 "$AIS_PID" 2>/dev/null; then
    echo "[dev] AIS proxy exited unexpectedly." >&2
    exit 1
  fi
  sleep 0.25
done

if ! lsof -iTCP:4001 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "[dev] Timed out waiting for AIS proxy." >&2
  exit 1
fi

# Wait for the ADS-B proxy to be listening (up to 10s)
for i in $(seq 1 40); do
  if lsof -iTCP:4002 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[dev] ADS-B proxy is up."
    break
  fi
  if ! kill -0 "$ADSB_PID" 2>/dev/null; then
    echo "[dev] ADS-B proxy exited unexpectedly." >&2
    exit 1
  fi
  sleep 0.25
done

if ! lsof -iTCP:4002 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "[dev] Timed out waiting for ADS-B proxy." >&2
  exit 1
fi

# Wait for the HexDB proxy to be listening (up to 10s)
for i in $(seq 1 40); do
  if lsof -iTCP:4003 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[dev] HexDB proxy is up."
    break
  fi
  if ! kill -0 "$HEXDB_PID" 2>/dev/null; then
    echo "[dev] HexDB proxy exited unexpectedly." >&2
    exit 1
  fi
  sleep 0.25
done

if ! lsof -iTCP:4003 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "[dev] Timed out waiting for HexDB proxy." >&2
  exit 1
fi

# Start Vite (foreground — Ctrl-C kills it, then cleanup runs)
echo "[dev] Starting Vite..."
exec npx vite
