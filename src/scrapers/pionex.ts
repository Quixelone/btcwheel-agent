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

    const now = Date.now();

    for (const { url, body } of responses) {
      if (!url.includes('/dual/products/')) continue;
      if (!body.data || !body.data.products) continue;

      for (const item of body.data.products) {
        try {
          const strike = parseFloat(item.strike);
          const expireTime = parseInt(item.expire_time);
          const baseProfit = parseFloat(item.base_profit);

          if (!strike || !expireTime || !baseProfit) continue;

          const daysToExpiry = Math.max(0.1, (expireTime - now) / (1000 * 60 * 60 * 24));
          const apy = (baseProfit / daysToExpiry) * 365 * 100;

          if (apy < 1 || apy > 500) continue;

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
        } catch {
          // skip invalid item
        }
      }
    }
  } finally {
    await browser.close();
  }

  return products;
}
