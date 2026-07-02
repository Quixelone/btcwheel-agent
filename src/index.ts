import { config, validateConfig } from './config';
import { initWhatsApp, getWhatsAppStatus } from './whatsapp';
import { startScheduler } from './scheduler';

async function main() {
  try {
    validateConfig();
    console.log('[Agent] BtcWheel VPS agent starting...');

    // Start WhatsApp client (kept alive 24/7)
    initWhatsApp();

    // Start cron scheduler
    startScheduler();

    // Health log every 5 minutes
    setInterval(() => {
      const status = getWhatsAppStatus();
      console.log(`[Health] WhatsApp initialized=${status.initialized} ready=${status.ready}`);
    }, 5 * 60 * 1000);

    console.log('[Agent] Running. Press Ctrl+C to stop.');
  } catch (error) {
    console.error('[Agent] Startup failed:', error);
    process.exit(1);
  }
}

main();
