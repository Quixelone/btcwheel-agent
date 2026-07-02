export interface ScrapedProduct {
  exchange: string;
  asset: string;
  type: 'BUY_LOW' | 'SELL_HIGH';
  strike_price: number;
  apy: number;
  settlement_date: string;
  is_safe: boolean;
  ai_analysis?: string;
}
