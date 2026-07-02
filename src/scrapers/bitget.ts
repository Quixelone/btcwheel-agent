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

    for (const { url, body } of responses) {
      if (!url.includes('bitget.com')) continue;

      const list =
        body?.data?.list ||
        body?.data?.products ||
        body?.result?.list ||
        body?.list;
      if (!Array.isArray(list)) continue;

      for (const item of list) {
        try {
          const strike = parseFloat(item.strikePrice || item.strike || item.price);
          const apyRaw = parseFloat(item.apy || item.annualRate || item.yearlyRate || item.returnRate);
          const apy = apyRaw > 1 ? apyRaw : apyRaw * 100;
          const expireTime = Number(item.settlementTime || item.expireTime || item.expirationTime);
          const side = String(item.side || item.type || item.direction || '').toUpperCase();

          if (!strike || !apy || !expireTime) continue;
          if (apy < 1 || apy > 500) continue;

          const type = side.includes('PUT') || side.includes('LOW') ? 'BUY_LOW' : 'SELL_HIGH';

          products.push({
            exchange: 'Bitget',
            asset: 'BTC',
            type,
            strike_price: strike,
            apy: Math.round(apy * 100) / 100,
            settlement_date: new Date(expireTime).toISOString(),
            is_safe: apy < 50,
            ai_analysis: `Bitget Dual | Strike: $${strike} | APY: ${apy.toFixed(2)}%`,
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
