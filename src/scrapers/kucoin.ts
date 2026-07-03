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
    const allProducts = data.data || [];
    console.log(`[KuCoin] Received ${allProducts.length} products`);

    if (allProducts.length > 0) {
      console.log('[KuCoin] Sample product:', JSON.stringify(allProducts[0], null, 2));
    }

    let btcCount = 0;
    let expiryFiltered = 0;

    for (const p of allProducts) {
      const isBtc =
        p.investCurrency === 'BTC' ||
        p.targetCurrency === 'BTC' ||
        p.strikeCurrency === 'BTC';
      if (!isBtc) continue;
      btcCount++;

      const type = p.side === 'PUT' ? 'BUY_LOW' : 'SELL_HIGH';
      const strike = parseFloat(p.strikePrice);
      const annualRate = parseFloat(p.annualRate);
      const apy = annualRate * 100;
      const settlementTime = Number(p.expectSettleTime || p.expirationTime);

      if (!strike || !annualRate || !settlementTime) {
        console.log(`[KuCoin] Skipping invalid product: strike=${strike}, annualRate=${annualRate}, settlementTime=${settlementTime}`);
        continue;
      }
      if (apy <= 0 || apy > 500) {
        console.log(`[KuCoin] Skipping product due to APY out of range: ${apy}`);
        continue;
      }

      const diffFromTarget = Math.abs(settlementTime - tomorrow8am.getTime());
      if (diffFromTarget > 60 * 60 * 1000) {
        expiryFiltered++;
        console.log(`[KuCoin] Skipping product due to expiry mismatch: ${new Date(settlementTime).toISOString()} (diff ${Math.round(diffFromTarget / 60000)} min)`);
        continue;
      }

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

    console.log(`[KuCoin] ${allProducts.length} total -> ${btcCount} BTC -> ${result.length} after expiry filter (expiry filtered: ${expiryFiltered})`);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}
