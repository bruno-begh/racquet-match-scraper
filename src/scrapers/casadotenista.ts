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
 * Searches for a racquet on Casa do Tenista store
 * @param racquetName - Full name of the racquet to search for
 * @returns ScraperResult with product information
 */
export async function searchCasaDoTenista(racquetName: string): Promise<ScraperResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log(`[Casa do Tenista] Starting search for: ${racquetName}`);

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();

    // Navigate to Casa do Tenista homepage
    console.log('[Casa do Tenista] Navigating to homepage...');
    await page.goto('https://www.casadotenista.com.br/', { waitUntil: 'networkidle', timeout: 30000 });

    // Find and fill search field
    console.log('[Casa do Tenista] Locating search field...');
    const searchSelector = 'input[type="search"], input[name="q"], input[placeholder*="Buscar"], input[placeholder*="buscar"], input[placeholder*="Pesquisar"]';
    await page.waitForSelector(searchSelector, { timeout: 10000 });

    console.log(`[Casa do Tenista] Typing: ${racquetName}`);
    await page.fill(searchSelector, racquetName);

    // Submit search
    console.log('[Casa do Tenista] Submitting search...');
    await page.press(searchSelector, 'Enter');

    // Wait for search results
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Debug: log current URL
    const currentUrl = page.url();
    console.log(`[Casa do Tenista] Current URL after search: ${currentUrl}`);

    // Try to find product link in results
    console.log('[Casa do Tenista] Extracting product information...');

    // Debug: Try to find ALL links first
    const allLinks = await page.locator('a[href]').all();
    console.log(`[Casa do Tenista] Found ${allLinks.length} total links on page`);

    // Try multiple selectors progressively
    const selectors = [
      'a[href*="/produto/"]',
      'a[href*="/product/"]',
      'a[href*="/p/"]',
      'a[href*="wilson"]',
      'a[href*="raquete"]',
      '.product-item a',
      '.item-product a',
      '.product-card a',
      '.product a',
      'a.product-link',
      'a'
    ];

    let productLinks: any[] = [];
    for (const selector of selectors) {
      productLinks = await page.locator(selector).all();
      if (productLinks.length > 0) {
        console.log(`[Casa do Tenista] Found ${productLinks.length} links with selector: ${selector}`);

        // Log first 5 hrefs for debugging
        for (let i = 0; i < Math.min(5, productLinks.length); i++) {
          const href = await productLinks[i].getAttribute('href');
          console.log(`[Casa do Tenista]   Link ${i}: ${href}`);
        }
        break;
      }
    }

    if (productLinks.length === 0) {
      console.log('[Casa do Tenista] No products found in search results with any selector');

      // Debug: log page title
      const title = await page.title();
      console.log(`[Casa do Tenista] Page title: ${title}`);

      await browser.close();
      return {
        found: false,
        storeName: 'Casa do Tenista',
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
        storeName: 'Casa do Tenista',
        error: 'Product URL not found'
      };
    }

    // Ensure full URL
    const fullUrl = productUrl.startsWith('http')
      ? productUrl
      : `https://www.casadotenista.com.br${productUrl}`;

    console.log(`[Casa do Tenista] Found product URL: ${fullUrl}`);

    // Navigate to product page to get price
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Extract price
    const priceSelectors = [
      '.price',
      '.product-price',
      '[class*="price"]',
      '[class*="preco"]',
      '[data-price]',
      'span:has-text("R$")',
      '.valor',
      '.best-price'
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

    console.log(`[Casa do Tenista] Found price: ${price}`);

    await browser.close();

    return {
      found: true,
      storeName: 'Casa do Tenista',
      url: fullUrl,
      price,
      available: true
    };

  } catch (error) {
    console.error('[Casa do Tenista] Error during search:', error);

    if (browser) {
      await browser.close();
    }

    return {
      found: false,
      storeName: 'Casa do Tenista',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
