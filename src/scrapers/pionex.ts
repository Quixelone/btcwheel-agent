import { ScrapedProduct } from './types';
import { launchBrowser, loadCookies, saveCookies } from './browser';

const PIONEX_URL = 'https://www.pionex.com/en/structured-finance/landing?k=USDT&k1=BTC';

export async function scrapePionex(): Promise<ScrapedProduct[]> {
  const browser = await launchBrowser();
  const products: ScrapedProduct[] = [];

  try {
    const page = await browser.newPage();
    await loadCookies(page, 'pionex');

    const responses: { url: string; body: any }[] = [];
    page.on('response', async (res: any) => {
      try {
        const ct = res.headers()['content-type'] || '';
        if (!ct.includes('json') && !ct.includes('text/plain')) return;
        const text = await res.text();
        if (!text || (text[0] !== '{' && text[0] !== '[')) return;
        const body = JSON.parse(text);
        responses.push({ url: res.url(), body });
      } catch {
        // ignore
      }
    });

    await page.goto(PIONEX_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 15000));
    await saveCookies(page, 'pionex');

    console.log(`[Pionex] Intercepted ${responses.length} JSON responses`);
    const dualResponses = responses.filter(r => r.url.includes('/dual/products/'));
    console.log(`[Pionex] Responses matching /dual/products/: ${dualResponses.length}`);
    if (dualResponses.length > 0) {
      console.log('[Pionex] Sample response URL:', dualResponses[0].url);
      console.log('[Pionex] Sample response body keys:', Object.keys(dualResponses[0].body));
      if (dualResponses[0].body.data) {
        console.log('[Pionex] Sample data keys:', Object.keys(dualResponses[0].body.data));
      }
    }

    const now = Date.now();

    for (const { url, body } of dualResponses) {
      if (!body.data || !body.data.products) {
        console.log('[Pionex] Response has no body.data.products');
        continue;
      }

      console.log(`[Pionex] Processing ${body.data.products.length} products from response`);
      if (body.data.products.length > 0) {
        console.log('[Pionex] Sample product:', JSON.stringify(body.data.products[0], null, 2));
      }

      for (const item of body.data.products) {
        try {
          const strike = parseFloat(item.strike);
          const expireTime = parseInt(item.expire_time);
          const baseProfit = parseFloat(item.base_profit);

          if (!strike || !expireTime || !baseProfit) {
            console.log(`[Pionex] Skipping invalid product: strike=${strike}, expireTime=${expireTime}, baseProfit=${baseProfit}`);
            continue;
          }

          const daysToExpiry = Math.max(0.1, (expireTime - now) / (1000 * 60 * 60 * 24));
          const apy = (baseProfit / daysToExpiry) * 365 * 100;

          if (apy < 1 || apy > 500) {
            console.log(`[Pionex] Skipping product due to APY out of range: ${apy}`);
            continue;
          }

          const isPut = item.product_id && item.product_id.includes('-P-');
          const type = isPut ? 'BUY_LOW' : 'SELL_HIGH';

          products.push({
            exchange: 'Pionex',
            asset: 'BTC',
            type,
            strike_price: strike,
            apy: Math.round(apy * 100) / 100,
            settlement_date: new Date(expireTime).toISOString(),
            is_safe: apy < 50,
            ai_analysis: `Pionex Dual | Strike: $${strike} | APY: ${apy.toFixed(2)}%`,
          });
        } catch (err) {
          console.log('[Pionex] Error parsing product:', err);
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`[Pionex] Total products extracted: ${products.length}`);
  return products;
}
