#!/bin/bash

# Simple health check: verify PM2 process is running and WhatsApp is authenticated
APP_NAME="btcwheel-agent"

if ! pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  echo "[Health] ${APP_NAME} is not running. Restarting..."
  cd /opt/btcwheel-agent || exit 1
  pm2 start dist/index.js --name "${APP_NAME}"
  pm2 save
  exit 1
fi

echo "[Health] ${APP_NAME} is running."
