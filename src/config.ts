import dotenv from 'dotenv';
dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    webhookUrl: process.env.SUPABASE_WEBHOOK_URL || '',
  },
  webhook: {
    secret: process.env.OPENCLAW_WEBHOOK_SECRET || '',
  },
  whatsapp: {
    sessionName: process.env.WHATSAPP_SESSION_NAME || 'btcwheel-session',
    recipients: (process.env.WHATSAPP_RECIPIENTS || '')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean),
  },
  scrape: {
    schedule: process.env.SCRAPE_SCHEDULE || '5 8 * * *',
    headless: process.env.SCRAPE_HEADLESS !== 'false',
  },
};

export function validateConfig(): void {
  const required = [
    config.supabase.url,
    config.supabase.serviceRoleKey,
    config.supabase.webhookUrl,
    config.webhook.secret,
  ];
  if (required.some((v) => !v)) {
    throw new Error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_WEBHOOK_URL, OPENCLAW_WEBHOOK_SECRET');
  }
  if (config.whatsapp.recipients.length === 0) {
    console.warn('[Config] No WhatsApp recipients configured (WHATSAPP_RECIPIENTS)');
  }
}
