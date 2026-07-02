import { config } from './config';
import { ScrapedProduct } from './scrapers/types';

export async function fetchWhatsAppSubscribers(): Promise<string[]> {
  try {
    const url = `${config.supabase.url}/rest/v1/whatsapp_subscribers?is_active=eq.true&select=phone_number`;
    const res = await fetch(url, {
      headers: {
        'apikey': config.supabase.serviceRoleKey,
        'Authorization': `Bearer ${config.supabase.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase query failed ${res.status}: ${text}`);
    }

    const data = (await res.json()) as { phone_number: string }[];
    const numbers = data.map((d) => d.phone_number);
    console.log(`[Supabase] Fetched ${numbers.length} active WhatsApp subscribers`);
    return numbers;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Supabase] Failed to fetch subscribers:', msg);
    return [];
  }
}

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
