import { ScrapedProduct } from './scrapers/types';

export function formatWhatsAppMessage(products: ScrapedProduct[], btcPrice?: number): string {
  if (products.length === 0) {
    return '📊 *BtcWheel Dual Investment*\n\nNessuna opportunità trovata per oggi.';
  }

  const buyLow = products.filter((p) => p.type === 'BUY_LOW');
  const sellHigh = products.filter((p) => p.type === 'SELL_HIGH');

  let msg = `📊 *BtcWheel Dual Investment - Opportunità del giorno*\n`;
  if (btcPrice) {
    msg += `💰 BTC: $${btcPrice.toLocaleString()}\n`;
  }
  msg += `⏰ Scadenza: domani 08:00 UTC\n\n`;

  if (buyLow.length > 0) {
    msg += `*🟢 Buy BTC Low (CSP)*\n`;
    for (const p of buyLow.slice(0, 5)) {
      msg += `• Strike $${p.strike_price.toLocaleString()} — APY ${p.apy.toFixed(2)}% (${p.exchange})\n`;
    }
    msg += '\n';
  }

  if (sellHigh.length > 0) {
    msg += `*🔴 Sell BTC High (CC)*\n`;
    for (const p of sellHigh.slice(0, 5)) {
      msg += `• Strike $${p.strike_price.toLocaleString()} — APY ${p.apy.toFixed(2)}% (${p.exchange})\n`;
    }
    msg += '\n';
  }

  msg += `_Dati aggregati da exchange principali. Non è consiglio finanziario._`;
  return msg;
}
