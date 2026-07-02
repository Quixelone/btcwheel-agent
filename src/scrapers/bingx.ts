import { ScrapedProduct } from './types';
import { launchBrowser, loadCookies, saveCookies } from './browser';

const BINGX_URL = 'https://bingx.com/en/wealth/dual-investment';

export async function scrapeBingX(): Promise<ScrapedProduct[]> {
  const browser = await launchBrowser();
  const products: ScrapedProduct[] = [];

  try {
    const page = await browser.newPage();
    await loadCookies(page, 'bingx');

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

    await page.goto(BINGX_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 12000));

    // Click Buy Low and Sell High tabs to load both datasets
    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const buyLow = all.find((el) => {
        const txt = (el as HTMLElement).innerText || (el as HTMLElement).textContent || '';
        return txt.includes('Buy BTC low with USDT') && txt.length < 100;
      });
      const sellHigh = all.find((el) => {
        const txt = (el as HTMLElement).innerText || (el as HTMLElement).textContent || '';
        return txt.includes('Sell BTC high for USDT') && txt.length < 100;
      });
      if (buyLow) (buyLow as HTMLElement).click();
      if (sellHigh) setTimeout(() => (sellHigh as HTMLElement).click(), 3000);
    });

    await new Promise((r) => setTimeout(r, 8000));
    await saveCookies(page, 'bingx');

    // BingX responses are not fully documented; attempt common shapes
    for (const { body } of responses) {
      const list =
        body?.data?.list ||
        body?.data?.products ||
        body?.result?.list ||
        body?.list;
      if (!Array.isArray(list)) continue;

      for (const item of list) {
        try {
          const strike = parseFloat(item.strikePrice || item.strike || item.price);
          const apyRaw = parseFloat(item.apy || item.annualRate || item.yearlyRate);
          const apy = apyRaw > 1 ? apyRaw : apyRaw * 100;
          const expireTime = Number(item.settlementTime || item.expireTime || item.expirationTime);
          const side = String(item.side || item.type || item.direction || '').toUpperCase();

          if (!strike || !apy || !expireTime) continue;
          if (apy < 1 || apy > 500) continue;

          const type = side.includes('PUT') || side.includes('LOW') ? 'BUY_LOW' : 'SELL_HIGH';

          products.push({
            exchange: 'BingX',
            asset: 'BTC',
            type,
            strike_price: strike,
            apy: Math.round(apy * 100) / 100,
            settlement_date: new Date(expireTime).toISOString(),
            is_safe: apy < 50,
            ai_analysis: `BingX Dual | Strike: $${strike} | APY: ${apy.toFixed(2)}%`,
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
