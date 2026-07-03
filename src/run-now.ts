import { config, validateConfig } from './config';
import { initWhatsApp, waitForReady, sendWhatsAppMessage } from './whatsapp';
import { sendToSupabase, fetchWhatsAppSubscribers } from './supabase';
import { formatWhatsAppMessage } from './format';
import { scrapeAll } from './scrapers';

async function main() {
  try {
    validateConfig();
    console.log('[RunNow] Starting immediate scrape and notify...');

    initWhatsApp();
    console.log('[RunNow] Waiting for WhatsApp to be ready...');
    await waitForReady();

    const { products, btcPrice, errors } = await scrapeAll();

    if (errors.length > 0) {
      console.warn('[RunNow] Scrape errors:', errors);
    }

    console.log(`[RunNow] Scraped ${products.length} products`);

    const supabaseResult = await sendToSupabase(products);
    if (!supabaseResult.success) {
      console.error('[RunNow] Failed to send to Supabase');
    }

    const message = formatWhatsAppMessage(products, btcPrice);
    const recipients = await fetchWhatsAppSubscribers();

    if (recipients.length === 0 && config.whatsapp.recipients.length === 0) {
      console.warn('[RunNow] No WhatsApp recipients configured');
    } else {
      await sendWhatsAppMessage(message, recipients);
      console.log('[RunNow] WhatsApp notifications sent');
    }

    console.log('[RunNow] Done');
    process.exit(0);
  } catch (error) {
    console.error('[RunNow] Failed:', error);
    process.exit(1);
  }
}

main();
