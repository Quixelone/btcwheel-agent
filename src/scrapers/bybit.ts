import { ScrapedProduct } from './types';

function getTomorrow8am(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(8, 0, 0, 0);
  return d;
}

export async function scrapeBybit(): Promise<ScrapedProduct[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const productsRes = await fetch(
      'https://api.bybit.com/v5/earn/advance/product?category=DualAssets&coin=BTC',
      { signal: controller.signal }
    );
    const productsData = (await productsRes.json()) as any;
    if (productsData.retCode !== 0) {
      throw new Error(`Bybit API error: ${productsData.retMsg}`);
    }

    const products = (productsData.result?.list || [])
      .filter(
        (p: any) =>
          p.status === 'Available' &&
          !p.isVipProduct &&
          ((p.baseCoin === 'BTC' && p.quoteCoin === 'USDT') ||
            (p.baseCoin === 'USDT' && p.quoteCoin === 'BTC'))
      )
      .sort((a: any, b: any) => Number(a.settlementTime) - Number(b.settlementTime));

    if (products.length === 0) {
      console.warn('[Bybit] No available BTC/USDT products');
      return [];
    }

    const tomorrow8am = getTomorrow8am();
    const result: ScrapedProduct[] = [];

    for (const product of products.slice(0, 20)) {
      const extraRes = await fetch(
        `https://api.bybit.com/v5/earn/advance/product-extra-info?category=DualAssets&productId=${product.productId}`,
        { signal: controller.signal }
      );
      const extraData = (await extraRes.json()) as any;
      if (extraData.retCode !== 0) continue;

      const quote = extraData.result?.list?.[0];
      if (!quote) continue;

      const settlementTime = Number(product.settlementTime);
      const diffFromTarget = Math.abs(settlementTime - tomorrow8am.getTime());
      if (diffFromTarget > 60 * 60 * 1000) continue;

      const settlementDate = new Date(settlementTime).toISOString();

      for (const level of quote.buyLowPrice || []) {
        const strike = parseFloat(level.selectPrice);
        const apy = parseFloat(level.apyE8) / 1_000_000;
        if (strike <= 0 || apy <= 0 || apy > 500) continue;
        result.push({
          exchange: 'Bybit',
          asset: 'BTC',
          type: 'BUY_LOW',
          strike_price: strike,
          apy: Math.round(apy * 100) / 100,
          settlement_date: settlementDate,
          is_safe: apy < 50,
          ai_analysis: `Bybit Dual Asset Buy Low | Strike: $${strike} | APY: ${apy.toFixed(2)}%`,
        });
      }

      for (const level of quote.sellHighPrice || []) {
        const strike = parseFloat(level.selectPrice);
        const apy = parseFloat(level.apyE8) / 1_000_000;
        if (strike <= 0 || apy <= 0 || apy > 500) continue;
        result.push({
          exchange: 'Bybit',
          asset: 'BTC',
          type: 'SELL_HIGH',
          strike_price: strike,
          apy: Math.round(apy * 100) / 100,
          settlement_date: settlementDate,
          is_safe: apy < 50,
          ai_analysis: `Bybit Dual Asset Sell High | Strike: $${strike} | APY: ${apy.toFixed(2)}%`,
        });
      }
    }

    return result;
  } finally {
    clearTimeout(timeout);
  }
}
