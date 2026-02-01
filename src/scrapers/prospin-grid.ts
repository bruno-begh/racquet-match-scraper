import { chromium, Browser } from 'playwright';
import { Product } from '../database/products-store';

export async function scrapeProsSpinGrid(): Promise<Omit<Product, 'id'>[]> {
  let browser: Browser | null = null;
  const allProducts: Omit<Product, 'id'>[] = [];

  try {
    console.log('[ProSpin GRID] Starting - 10 pages @ https://www.prospin.com.br/raquetes/aplicacao-tenis');
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

    for (let pageNum = 1; pageNum <= 10; pageNum++) {
      const page = await browser.newPage();
      const pageUrl = pageNum === 1
        ? 'https://www.prospin.com.br/raquetes/aplicacao-tenis'
        : `https://www.prospin.com.br/raquetes/aplicacao-tenis?p=${pageNum}`;

      console.log(`\n[ProSpin GRID] Page ${pageNum}/10: ${pageUrl}`);
      await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(4000);

      // Scroll to load all products on this page
      await page.evaluate(async () => {
        for (let i = 0; i < 3; i++) {
          window.scrollTo(0, document.body.scrollHeight);
          await new Promise(r => setTimeout(r, 500));
        }
      });
      await page.waitForTimeout(2000);

      // Get ALL product links from the grid on THIS page
      // Using product images as selector (more reliable)
      const productLinks = await page.locator('li.flex a[href*="/raquete-de-tenis-"]').all();
      console.log(`[ProSpin GRID] Found ${productLinks.length} product links in grid on page ${pageNum}`);

      // Extract unique URLs from this page only
      const pageUrls = new Set<string>();
      for (const link of productLinks) {
        const href = await link.getAttribute('href');
        if (href) {
          const fullUrl = href.startsWith('http') ? href : `https://www.prospin.com.br${href}`;
          pageUrls.add(fullUrl);
        }
      }

      console.log(`[ProSpin GRID] ${pageUrls.size} unique products on page ${pageNum}`);

      // Visit each product page with delay to avoid rate limiting
      for (const url of pageUrls) {
        try {
          // Add delay between requests to avoid 403 Forbidden
          await new Promise(r => setTimeout(r, 1000));

          const prodPage = await browser.newPage();
          await prodPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await prodPage.waitForTimeout(1500);

          const nameEl = prodPage.locator('h1').first();
          const productName = (await nameEl.textContent({ timeout: 10000 }))?.trim() || '';

          if (!productName || productName.length < 5) {
            await prodPage.close();
            continue;
          }

          let price = 'Preço não disponível';
          const priceEl = prodPage.locator('span:has-text("R$")').first();
          if (await priceEl.count() > 0) {
            const priceText = await priceEl.textContent();
            if (priceText) price = priceText.trim();
          }

          // Skip category pages (price ranges, R$ 0, or no price)
          if (price.includes(' - ') || price.includes('R$ 0') || price === 'Preço não disponível' || !price.match(/R\$\s*[\d.,]+$/)) {
            console.log(`[ProSpin GRID] ⏭️  Skipping category: ${productName} (${price})`);
            await prodPage.close();
            continue;
          }

          allProducts.push({
            store: 'ProSpin',
            name: productName,
            url,
            price,
            available: true,
            lastUpdated: new Date().toISOString()
          });

          console.log(`[ProSpin GRID] ${allProducts.length}. ${productName}`);
          await prodPage.close();

        } catch (err) {
          console.error(`[ProSpin GRID] Error on ${url}: ${(err as Error).message.substring(0, 50)}`);
        }
      }

      await page.close();
    }

    console.log(`\n[ProSpin GRID] Complete: ${allProducts.length} products (target: 174)`);
    await browser.close();
    return allProducts;

  } catch (error) {
    console.error('[ProSpin GRID] Fatal error:', error);
    if (browser) await browser.close();
    return allProducts;
  }
}
