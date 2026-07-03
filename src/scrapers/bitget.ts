import { ScrapedProduct } from './types';
import { launchBrowser, loadCookies, saveCookies } from './browser';

const BITGET_URL = 'https://www.bitget.com/en/earn/dual-investment';

export async function scrapeBitget(): Promise<ScrapedProduct[]> {
  const browser = await launchBrowser();
  const products: ScrapedProduct[] = [];

  try {
    const page = await browser.newPage();
    await loadCookies(page, 'bitget');

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

    await page.goto(BITGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 15000));
    await saveCookies(page, 'bitget');

    console.log(`[Bitget] Intercepted ${responses.length} JSON responses`);
    if (responses.length > 0) {
      responses.forEach((r, i) => {
        console.log(`[Bitget] Response ${i}: ${r.url.substring(0, 120)}... keys: ${Object.keys(r.body).join(',')}`);
      });
    }

    for (const { url, body } of responses) {
      if (!url.includes('bitget.com')) continue;

      const list =
        body?.data?.list ||
        body?.data?.products ||
        body?.result?.list ||
        body?.list;
      if (!Array.isArray(list)) continue;

      console.log(`[Bitget] Processing list of ${list.length} items`);
      if (list.length > 0) {
        console.log('[Bitget] Sample item:', JSON.stringify(list[0], null, 2));
      }

      for (const item of list) {
        try {
          const strike = parseFloat(item.strikePrice || item.strike || item.price);
          const apyRaw = parseFloat(item.apy || item.annualRate || item.yearlyRate || item.returnRate);
          const apy = apyRaw > 1 ? apyRaw : apyRaw * 100;
          const expireTime = Number(item.settlementTime || item.expireTime || item.expirationTime);
          const side = String(item.side || item.type || item.direction || '').toUpperCase();

          if (!strike || !apy || !expireTime) {
            console.log(`[Bitget] Skipping invalid item: strike=${strike}, apy=${apy}, expireTime=${expireTime}`);
            continue;
          }
          if (apy < 1 || apy > 500) {
            console.log(`[Bitget] Skipping item due to APY out of range: ${apy}`);
            continue;
          }

          const type = side.includes('PUT') || side.includes('LOW') ? 'BUY_LOW' : 'SELL_HIGH';

          products.push({
            exchange: 'Bitget',
            asset: 'BTC',
            type,
            strike_price: strike,
            apy: Math.round(apy * 100) / 100,
            settlement_date: new Date(expireTime).toISOString(),
            is_safe: apy < 50,
            ai_analysis: `Bitget Dual | Strike: ${strike} | APY: ${apy.toFixed(2)}%`,
          });
        } catch (err) {
          console.log('[Bitget] Error parsing item:', err);
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`[Bitget] Total products extracted: ${products.length}`);
  return products;
}
