import cron from 'node-cron';
import { config } from './config';
import { sendWhatsAppMessage } from './whatsapp';
import { sendToSupabase, fetchWhatsAppSubscribers } from './supabase';
import { formatWhatsAppMessage } from './format';
import { scrapeAll } from './scrapers';

export function startScheduler(): void {
  console.log(`[Scheduler] Daily scrape scheduled for: ${config.scrape.schedule} (UTC)`);

  cron.schedule(config.scrape.schedule, async () => {
    console.log('[Scheduler] Starting daily scrape and notify...');
    try {
      const { products, btcPrice, errors } = await scrapeAll();

      if (errors.length > 0) {
        console.warn('[Scheduler] Scrape errors:', errors);
      }

      // Send to Supabase
      const supabaseResult = await sendToSupabase(products);
      if (!supabaseResult.success) {
        console.error('[Scheduler] Failed to send to Supabase');
      }

      // Send WhatsApp
      const message = formatWhatsAppMessage(products, btcPrice);
      const recipients = await fetchWhatsAppSubscribers();
      try {
        await sendWhatsAppMessage(message, recipients);
        console.log('[Scheduler] WhatsApp notifications sent');
      } catch (error) {
        console.error('[Scheduler] WhatsApp send failed:', error);
      }
    } catch (error) {
      console.error('[Scheduler] Daily job failed:', error);
    }
  });
}
