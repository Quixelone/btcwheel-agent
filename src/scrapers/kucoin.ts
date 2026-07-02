import { ScrapedProduct } from './types';

function getTomorrow8am(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(8, 0, 0, 0);
  return d;
}

export async function scrapeKuCoin(): Promise<ScrapedProduct[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(
      'https://api.kucoin.com/api/v1/struct-earn/dual/products?category=DUAL_CLASSIC',
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }
    );
    const data = (await res.json()) as any;
    if (data.code !== '200000') {
      throw new Error(`KuCoin API error: ${data.msg}`);
    }

    const tomorrow8am = getTomorrow8am();
    const result: ScrapedProduct[] = [];

    for (const p of data.data || []) {
      const isBtc =
        p.investCurrency === 'BTC' ||
        p.targetCurrency === 'BTC' ||
        p.strikeCurrency === 'BTC';
      if (!isBtc) continue;

      const type = p.side === 'PUT' ? 'BUY_LOW' : 'SELL_HIGH';
      const strike = parseFloat(p.strikePrice);
      const annualRate = parseFloat(p.annualRate);
      const apy = annualRate * 100;
      const settlementTime = Number(p.expectSettleTime || p.expirationTime);

      if (!strike || !annualRate || !settlementTime) continue;
      if (apy <= 0 || apy > 500) continue;

      const diffFromTarget = Math.abs(settlementTime - tomorrow8am.getTime());
      if (diffFromTarget > 60 * 60 * 1000) continue;

      const settlementDate = new Date(settlementTime).toISOString();

      result.push({
        exchange: 'KuCoin',
        asset: 'BTC',
        type,
        strike_price: strike,
        apy: Math.round(apy * 100) / 100,
        settlement_date: settlementDate,
        is_safe: apy < 50,
        ai_analysis: `KuCoin Dual | Side: ${p.side} | Strike: $${strike} | APY: ${apy.toFixed(2)}%`,
      });
    }

    return result;
  } finally {
    clearTimeout(timeout);
  }
}
