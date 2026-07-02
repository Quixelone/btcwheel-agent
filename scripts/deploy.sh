#!/bin/bash
set -e

APP_DIR="/opt/btcwheel-agent"

echo "=== Deploying BtcWheel Agent ==="

cd "${APP_DIR}"

git pull origin main
npm install
npm run build

if pm2 describe btcwheel-agent >/dev/null 2>&1; then
  echo "[Deploy] Restarting btcwheel-agent..."
  pm2 restart btcwheel-agent
else
  echo "[Deploy] Starting btcwheel-agent..."
  pm2 start dist/index.js --name btcwheel-agent
fi

pm2 save

echo "=== Deploy complete ==="
