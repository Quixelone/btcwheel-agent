import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { config } from './config';

let client: Client | null = null;
let isReady = false;

export function initWhatsApp(): Client {
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth',
      clientId: config.whatsapp.sessionName,
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    },
  });

  client.on('qr', (qr) => {
    console.log('[WhatsApp] Scan this QR code with your phone:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    isReady = true;
    console.log('[WhatsApp] Client is ready');
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Authenticated');
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Auth failure:', msg);
    isReady = false;
  });

  client.on('disconnected', (reason) => {
    console.warn('[WhatsApp] Disconnected:', reason);
    isReady = false;
    // Try to reinitialize after a delay
    setTimeout(() => {
      console.log('[WhatsApp] Reinitializing...');
      client?.initialize().catch((err) => console.error('[WhatsApp] Reinit failed:', err));
    }, 30000);
  });

  client.initialize().catch((err) => {
    console.error('[WhatsApp] Initialization failed:', err);
  });

  return client;
}

export async function sendWhatsAppMessage(message: string): Promise<void> {
  if (!client || !isReady) {
    throw new Error('WhatsApp client not ready');
  }

  for (const recipient of config.whatsapp.recipients) {
    const chatId = `${recipient}@c.us`;
    try {
      await client.sendMessage(chatId, message);
      console.log(`[WhatsApp] Message sent to ${recipient}`);
    } catch (error) {
      console.error(`[WhatsApp] Failed to send to ${recipient}:`, error);
    }
  }
}

export function getWhatsAppStatus(): { initialized: boolean; ready: boolean } {
  return { initialized: !!client, ready: isReady };
}
