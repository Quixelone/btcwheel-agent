# BtcWheel Agent

Agent VPS per BtcWheel: raccoglie prodotti Dual Investment da più broker e invia notifiche WhatsApp ai clienti.

## Cosa fa

- Resta connesso 24/7 a WhatsApp Web (`whatsapp-web.js`).
- Ogni giorno alle **08:05 UTC** esegue lo scraping:
  - **Bybit** — Dual Asset Earn API
  - **KuCoin** — Structured Earn API pubblica
  - **Pionex, BingX, Bitget** — browser automation
- Confronta i premi per strike + scadenza.
- Invia i dati a Supabase via webhook.
- Invia un messaggio WhatsApp riepilogativo ai clienti configurati.

## Requisiti

- Ubuntu 22.04 LTS
- Node.js 18+
- Chromium/Chrome
- VPS consigliato: **Hetzner CPX21** (2 vCPU, 4 GB RAM)

## Installazione automatica sul VPS

Scarica `scripts/setup-vps.sh` ed eseguilo come root:

```bash
wget https://raw.githubusercontent.com/Quixelone/btcwheel-agent/main/scripts/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

Lo script installerà Node.js 20, PM2, Google Chrome e clonerà il repo in `/opt/btcwheel-agent`.

Dopo il setup:

```bash
cd /opt/btcwheel-agent
cp .env.example .env
# modifica .env con i tuoi secret
pm2 start dist/index.js --name btcwheel-agent
# al primo avvio, scannerizza il QR code con il numero WhatsApp dedicato
pm2 save
pm2 startup
```

## Configurazione `.env`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_WEBHOOK_URL=https://your-project.supabase.co/functions/v1/scrape-dual-investment
OPENCLAW_WEBHOOK_SECRET=...
WHATSAPP_SESSION_NAME=btcwheel-session
WHATSAPP_RECIPIENTS=390000000000,390000000001
SCRAPE_SCHEDULE=5 8 * * *
SCRAPE_HEADLESS=true
```

## Test immediato (senza aspettare le 8:05 UTC)

Per verificare che scraping e WhatsApp funzionino subito:

```bash
cd /opt/btcwheel-agent
npm run run-now
```

Lo script eseguirà scraping, invierà i dati a Supabase e invierà il messaggio WhatsApp ai destinatari attivi.

## Deploy aggiornamenti

```bash
wget https://raw.githubusercontent.com/Quixelone/btcwheel-agent/main/scripts/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

Oppure esegui direttamente sul server:

```bash
cd /opt/btcwheel-agent
./scripts/deploy.sh
```

## Health check

Aggiungi un cron job per il health check:

```bash
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/btcwheel-agent/scripts/health-check.sh") | crontab -
```

## Note

- I cookie dei broker vengono salvati in `cookies/` per ridurre il rischio di blocchi.
- Le opzioni non sono incluse in questo agent: verranno gestite in una sezione Premium separata.
