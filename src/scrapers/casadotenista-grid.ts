import { chromium, Browser } from 'playwright';
import { Product } from '../database/products-store';

export async function scrapeCasaDoTenistaGrid(): Promise<Omit<Product, 'id'>[]> {
  let browser: Browser | null = null;
  const products: Omit<Product, 'id'>[] = [];

  try {
    console.log('[Casa GRID] Starting @ https://www.casadotenista.com.br/raquetes/raquetes-de-tenis');
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.goto('https://www.casadotenista.com.br/raquetes/raquetes-de-tenis', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await page.waitForTimeout(3000);

    // Click "Mostrar mais" button exactly 2 times
    // Using the specific "fetch-more" button (not "fetch-previous")
    for (let i = 0; i < 2; i++) {
      try {
        const showMoreButton = page.locator('.vtex-search-result-3-x-buttonShowMore--fetch-more');

        if (await showMoreButton.count() > 0) {
          console.log(`[Casa GRID] Clicking "Mostrar mais" (${i + 1}/2)`);
          await showMoreButton.click();
          await page.waitForTimeout(5000); // Wait for products to load
        } else {
          console.log(`[Casa GRID] No "Mostrar mais" button found on click ${i + 1}`);
          break;
        }
      } catch (err) {
        console.log(`[Casa GRID] Could not click button ${i + 1}: ${(err as Error).message}`);
        break;
      }
    }

    // Scroll to ensure all products are loaded
    // @ts-ignore - window and document are available in browser context
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(r => setTimeout(r, 500));
      }
    });
    await page.waitForTimeout(2000);

    // Get ALL product links from the grid (no filtering)
    // Looking for product links in the grid - typically anchors in product cards
    const productLinks = await page.locator('a[href*="/raquete-de-tenis-"][href*="/p"]').all();
    console.log(`[Casa GRID] Found ${productLinks.length} product link elements in grid`);

    // Extract unique URLs
    const productUrls = new Set<string>();
    for (const link of productLinks) {
      let url = await link.getAttribute('href');
      if (!url) continue;

      if (!url.startsWith('http')) {
        url = `https://www.casadotenista.com.br${url.startsWith('/') ? url : '/' + url}`;
      }

      // Only skip query params and ensure ends with /p
      if (url.includes('?') || !url.endsWith('/p')) continue;

      productUrls.add(url);
    }

    console.log(`[Casa GRID] ${productUrls.size} unique product URLs (target: 47)`);

    // Visit each product page
    for (const url of productUrls) {
      try {
        const prodPage = await browser.newPage();
        await prodPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
        await prodPage.waitForTimeout(1500);

        const nameEl = prodPage.locator('h1').first();
        const productName = (await nameEl.textContent({ timeout: 10000 }))?.trim() || '';

        if (!productName || productName.length < 5) {
          await prodPage.close();
          continue;
        }

        let price = 'Preço não disponível';
        const priceSelectors = ['[class*="sellingPrice"]', '[class*="bestPrice"]', 'span:has-text("R$")'];

        for (const sel of priceSelectors) {
          const priceEl = prodPage.locator(sel).first();
          if (await priceEl.count() > 0) {
            const priceText = await priceEl.textContent({ timeout: 5000 });
            if (priceText?.includes('R$')) {
              price = priceText.trim().replace(/\s+/g, ' ');
              break;
            }
          }
        }

        // Skip category pages (price ranges, R$ 0, or no price)
        if (price.includes(' - ') || price.includes('R$ 0') || price === 'Preço não disponível' || !price.match(/R\$\s*[\d.,]+$/)) {
          console.log(`[Casa GRID] ⏭️  Skipping category: ${productName} (${price})`);
          await prodPage.close();
          continue;
        }

        products.push({
          store: 'Casa do Tenista',
          name: productName,
          url,
          price,
          available: true,
          lastUpdated: new Date().toISOString()
        });

        console.log(`[Casa GRID] ${products.length}. ${productName}`);
        await prodPage.close();

      } catch (err) {
        console.error(`[Casa GRID] Error on ${url}: ${(err as Error).message.substring(0, 50)}`);
      }
    }

    console.log(`\n[Casa GRID] Complete: ${products.length} products (target: 47)`);
    await browser.close();
    return products;

  } catch (error) {
    console.error('[Casa GRID] Fatal error:', error);
    if (browser) await browser.close();
    return products;
  }
}
