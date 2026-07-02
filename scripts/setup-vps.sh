#!/bin/bash
set -e

echo "=== BtcWheel Agent VPS Setup ==="

# Update system
apt-get update && apt-get upgrade -y

# Install base dependencies for Node.js, Puppeteer and Chromium/Chrome
apt-get install -y \
  curl wget git build-essential ca-certificates gnupg \
  fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 \
  libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 \
  libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
  libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
  libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
  libxss1 libxtst6 lsb-release xdg-utils

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify
node -v
npm -v

# Install PM2
npm install -g pm2

# Install Google Chrome (stable)
CHROME_DEB="google-chrome-stable_current_amd64.deb"
wget -q "https://dl.google.com/linux/direct/${CHROME_DEB}"
dpkg -i "${CHROME_DEB}" || apt-get install -f -y
rm -f "${CHROME_DEB}"

# Create app directory
mkdir -p /opt/btcwheel-agent
cd /opt/btcwheel-agent

# Clone repo (public). For private repos, configure SSH or token first.
git clone https://github.com/Quixelone/btcwheel-agent.git .

# Install dependencies and build
npm install
npm run build

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Create /opt/btcwheel-agent/.env (see .env.example)"
echo "  2. Run: pm2 start dist/index.js --name btcwheel-agent"
echo "  3. Scan the QR code with the dedicated WhatsApp number"
echo "  4. Save PM2 config: pm2 save && pm2 startup"
