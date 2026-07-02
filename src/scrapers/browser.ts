import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

puppeteer.use(StealthPlugin());

const COOKIES_DIR = './cookies';

export function getCookiePath(exchange: string): string {
  if (!fs.existsSync(COOKIES_DIR)) {
    fs.mkdirSync(COOKIES_DIR, { recursive: true });
  }
  return path.join(COOKIES_DIR, `${exchange}_cookies.json`);
}

export async function launchBrowser(): Promise<ReturnType<typeof puppeteer.launch>> {
  return puppeteer.launch({
    headless: config.scrape.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1280,800',
    ],
  });
}

export async function loadCookies(page: any, exchange: string): Promise<void> {
  const cookiePath = getCookiePath(exchange);
  if (!fs.existsSync(cookiePath)) return;
  try {
    const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
    await page.setCookie(...cookies);
    console.log(`[Browser] Loaded ${cookies.length} cookies for ${exchange}`);
  } catch (error) {
    console.warn(`[Browser] Failed to load cookies for ${exchange}:`, error);
  }
}

export async function saveCookies(page: any, exchange: string): Promise<void> {
  try {
    const cookies = await page.cookies();
    fs.writeFileSync(getCookiePath(exchange), JSON.stringify(cookies, null, 2));
  } catch (error) {
    console.warn(`[Browser] Failed to save cookies for ${exchange}:`, error);
  }
}
