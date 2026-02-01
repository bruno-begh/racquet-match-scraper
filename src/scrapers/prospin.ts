import { chromium, Browser, Page } from 'playwright';

export interface ScraperResult {
  found: boolean;
  storeName: string;
  url?: string;
  price?: string;
  available?: boolean;
  error?: string;
}

/**
 * Searches for a racquet on ProSpin store
 * @param racquetName - Full name of the racquet to search for
 * @returns ScraperResult with product information
 */
export async function searchProSpin(racquetName: string): Promise<ScraperResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log(`[ProSpin] Starting search for: ${racquetName}`);

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();

    // Navigate to ProSpin homepage
    console.log('[ProSpin] Navigating to homepage...');
    await page.goto('https://www.prospin.com.br/', { waitUntil: 'networkidle', timeout: 30000 });

    // Find and fill search field
    console.log('[ProSpin] Locating search field...');
    const searchSelector = 'input[type="search"], input[name="q"], input[placeholder*="Buscar"], input[placeholder*="buscar"]';
    await page.waitForSelector(searchSelector, { timeout: 10000 });

    console.log(`[ProSpin] Typing: ${racquetName}`);
    await page.fill(searchSelector, racquetName);

    // Submit search
    console.log('[ProSpin] Submitting search...');
    await page.press(searchSelector, 'Enter');

    // Wait for search results
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Try to find product link in results
    console.log('[ProSpin] Extracting product information...');

    // Look for product cards/links
    const productLinkSelector = 'a[href*="/produto/"], a[href*="/product/"], .product-item a, .item-product a';
    const productLinks = await page.locator(productLinkSelector).all();

    if (productLinks.length === 0) {
      console.log('[ProSpin] No products found in search results');
      await browser.close();
      return {
        found: false,
        storeName: 'ProSpin',
        error: 'No products found in search results'
      };
    }

    // Get first result
    const firstProduct = productLinks[0];
    const productUrl = await firstProduct.getAttribute('href');

    if (!productUrl) {
      await browser.close();
      return {
        found: false,
        storeName: 'ProSpin',
        error: 'Product URL not found'
      };
    }

    // Ensure full URL
    const fullUrl = productUrl.startsWith('http')
      ? productUrl
      : `https://www.prospin.com.br${productUrl}`;

    console.log(`[ProSpin] Found product URL: ${fullUrl}`);

    // Navigate to product page to get price
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Extract price
    const priceSelectors = [
      '.price',
      '.product-price',
      '[class*="price"]',
      '[data-price]',
      'span:has-text("R$")'
    ];

    let price = 'Preço não encontrado';
    for (const selector of priceSelectors) {
      try {
        const priceElement = page.locator(selector).first();
        if (await priceElement.count() > 0) {
          const priceText = await priceElement.textContent();
          if (priceText && priceText.includes('R$')) {
            price = priceText.trim();
            break;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    console.log(`[ProSpin] Found price: ${price}`);

    await browser.close();

    return {
      found: true,
      storeName: 'ProSpin',
      url: fullUrl,
      price,
      available: true
    };

  } catch (error) {
    console.error('[ProSpin] Error during search:', error);

    if (browser) {
      await browser.close();
    }

    return {
      found: false,
      storeName: 'ProSpin',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
