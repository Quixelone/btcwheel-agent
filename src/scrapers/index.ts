import { ScrapedProduct } from './types';
import { scrapeBybit } from './bybit';
import { scrapeKuCoin } from './kucoin';
import { scrapePionex } from './pionex';
import { scrapeBingX } from './bingx';
import { scrapeBitget } from './bitget';

export interface ScrapeResult {
  products: ScrapedProduct[];
  btcPrice?: number;
  errors: string[];
}

export async function fetchBtcPrice(): Promise<number | undefined> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const data = (await res.json()) as { price: string };
    return parseFloat(data.price);
  } catch (error) {
    console.warn('[BTC Price] Failed to fetch:', error);
    return undefined;
  }
}

export async function scrapeAll(): Promise<ScrapeResult> {
  const errors: string[] = [];
  const allProducts: ScrapedProduct[] = [];

  const btcPrice = await fetchBtcPrice();

  const scrapers = [
    { name: 'Bybit', fn: scrapeBybit },
    { name: 'KuCoin', fn: scrapeKuCoin },
    { name: 'Pionex', fn: scrapePionex },
    { name: 'BingX', fn: scrapeBingX },
    { name: 'Bitget', fn: scrapeBitget },
  ];

  const results = await Promise.allSettled(
    scrapers.map(async ({ name, fn }) => {
      try {
        const products = await fn();
        console.log(`[Scraper] ${name}: ${products.length} products`);
        return { name, products };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[Scraper] ${name} failed:`, msg);
        return { name, products: [], error: msg };
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allProducts.push(...result.value.products);
      if (result.value.error) {
        errors.push(`${result.value.name}: ${result.value.error}`);
      }
    } else {
      errors.push(String(result.reason));
    }
  }

  return { products: allProducts, btcPrice, errors };
}
