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

    // Navigate directly to search results page with query
    const searchUrl = `https://www.prospin.com.br/buscar?q=${encodeURIComponent(racquetName)}`;
    console.log(`[ProSpin] Navigating to search URL: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Debug: log current URL
    const currentUrl = page.url();
    console.log(`[ProSpin] Current URL after search: ${currentUrl}`);

    // Try to find product link in results
    console.log('[ProSpin] Extracting product information...');

    // Debug: Try to find ALL links first
    const allLinks = await page.locator('a[href]').all();
    console.log(`[ProSpin] Found ${allLinks.length} total links on page`);

    // Try multiple selectors progressively
    const selectors = [
      'a[href*="/produto/"]',
      'a[href*="/product/"]',
      'a[href*="wilson"]',
      'a[href*="raquete"]',
      '.product-item a',
      '.item-product a',
      '.product a',
      'a.product-link',
      'a'
    ];

    let productLinks: any[] = [];
    let matchedSelector = '';

    for (const selector of selectors) {
      productLinks = await page.locator(selector).all();
      if (productLinks.length > 0) {
        matchedSelector = selector;
        console.log(`[ProSpin] Found ${productLinks.length} links with selector: ${selector}`);

        // Log first 5 hrefs for debugging
        for (let i = 0; i < Math.min(5, productLinks.length); i++) {
          const href = await productLinks[i].getAttribute('href');
          const text = await productLinks[i].textContent();
          console.log(`[ProSpin]   Link ${i}: ${href} | Text: ${text?.substring(0, 50)}`);
        }
        break;
      }
    }

    // Filter links to find best match for the search query
    if (productLinks.length > 0 && matchedSelector !== 'a') {
      const keywords = racquetName.toLowerCase().split(' ').filter(k => k.length > 2);
      console.log(`[ProSpin] Filtering with keywords: ${keywords.join(', ')}`);

      const scoredLinks = [];
      for (const link of productLinks.slice(0, 20)) {
        const href = (await link.getAttribute('href')) || '';
        const text = (await link.textContent()) || '';
        const combined = (href + ' ' + text).toLowerCase();

        let score = 0;
        for (const keyword of keywords) {
          if (combined.includes(keyword)) score++;
        }

        if (score > 0) {
          scoredLinks.push({ link, score, href, text });
        }
      }

      scoredLinks.sort((a, b) => b.score - a.score);

      if (scoredLinks.length > 0) {
        console.log(`[ProSpin] Best match: ${scoredLinks[0].href} (score: ${scoredLinks[0].score})`);
        productLinks = [scoredLinks[0].link];
      } else {
        console.log('[ProSpin] No keyword matches found, using first result');
      }
    }

    if (productLinks.length === 0) {
      console.log('[ProSpin] No products found in search results with any selector');

      // Debug: log page title and HTML snippet
      const title = await page.title();
      console.log(`[ProSpin] Page title: ${title}`);

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
