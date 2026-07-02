import { config } from './config';
import { ScrapedProduct } from './scrapers/types';

export async function sendToSupabase(products: ScrapedProduct[]): Promise<{ success: boolean; count?: number; error?: string }> {
  if (products.length === 0) {
    console.warn('[Supabase] No products to send');
    return { success: true, count: 0 };
  }

  try {
    const response = await fetch(config.supabase.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': config.webhook.secret,
      },
      body: JSON.stringify({ products }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Webhook failed ${response.status}: ${text}`);
    }

    const result = (await response.json()) as { count?: number; success?: boolean; error?: string };
    console.log(`[Supabase] Sent ${products.length} products. Saved: ${result.count ?? 'unknown'}`);
    return { success: true, count: result.count };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Supabase] Failed to send products:', msg);
    return { success: false, error: msg };
  }
}
