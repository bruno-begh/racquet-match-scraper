import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { searchProSpin } from './scrapers/prospin';
import { searchCasaDoTenista } from './scrapers/casadotenista';
import { ProductsStore } from './database/products-store';
import { populateGrid } from './scripts/populate-grid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize products store
const productsStore = new ProductsStore();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'racquet-match-scraper',
    version: '1.1.0-category-fix',
    timestamp: new Date().toISOString()
  });
});

// Search in local database (fast, recommended)
app.post('/search', async (req: Request, res: Response) => {
  try {
    const { racquetName, store } = req.body;

    if (!racquetName) {
      return res.status(400).json({
        error: 'racquetName is required',
        example: { racquetName: 'Wilson Ultra 100 V5' }
      });
    }

    console.log(`[Local Search] Searching for: ${racquetName}`);
    const results = productsStore.searchProducts(racquetName, store);

    const response = {
      query: racquetName,
      totalFound: results.length,
      products: results.map(p => ({
        store: p.store,
        name: p.name,
        url: p.url,
        price: p.price,
        available: p.available
      })),
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('[Local Search] Error:', error);
    res.status(500).json({
      error: 'Failed to search products',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get database stats
app.get('/stats', (req: Request, res: Response) => {
  res.json({
    totalProducts: productsStore.getProductCount(),
    byStore: {
      prospin: productsStore.getProductCount('ProSpin'),
      casadotenista: productsStore.getProductCount('Casa do Tenista')
    },
    timestamp: new Date().toISOString()
  });
});

// ProSpin scraper endpoint
app.post('/scrape/prospin', async (req: Request, res: Response) => {
  try {
    const { racquetName } = req.body;

    if (!racquetName) {
      return res.status(400).json({
        error: 'racquetName is required',
        example: { racquetName: 'Wilson Ultra 100 V5' }
      });
    }

    console.log(`[ProSpin] Searching for: ${racquetName}`);
    const result = await searchProSpin(racquetName);

    res.json({
      store: 'ProSpin',
      query: racquetName,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ProSpin] Error:', error);
    res.status(500).json({
      error: 'Failed to scrape ProSpin',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Casa do Tenista scraper endpoint
app.post('/scrape/casadotenista', async (req: Request, res: Response) => {
  try {
    const { racquetName } = req.body;

    if (!racquetName) {
      return res.status(400).json({
        error: 'racquetName is required',
        example: { racquetName: 'Wilson Ultra 100 V5' }
      });
    }

    console.log(`[Casa do Tenista] Searching for: ${racquetName}`);
    const result = await searchCasaDoTenista(racquetName);

    res.json({
      store: 'Casa do Tenista',
      query: racquetName,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Casa do Tenista] Error:', error);
    res.status(500).json({
      error: 'Failed to scrape Casa do Tenista',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search both stores simultaneously
app.post('/scrape/both', async (req: Request, res: Response) => {
  try {
    const { racquetName } = req.body;

    if (!racquetName) {
      return res.status(400).json({
        error: 'racquetName is required',
        example: { racquetName: 'Wilson Ultra 100 V5' }
      });
    }

    console.log(`[Both Stores] Searching for: ${racquetName}`);

    // Search both stores in parallel
    const [prospinResult, casaTenistaResult] = await Promise.allSettled([
      searchProSpin(racquetName),
      searchCasaDoTenista(racquetName)
    ]);

    const results = {
      query: racquetName,
      stores: {
        prospin: prospinResult.status === 'fulfilled'
          ? prospinResult.value
          : { found: false, error: prospinResult.reason?.message },
        casadotenista: casaTenistaResult.status === 'fulfilled'
          ? casaTenistaResult.value
          : { found: false, error: casaTenistaResult.reason?.message }
      },
      foundIn: [
        prospinResult.status === 'fulfilled' && prospinResult.value.found ? 'ProSpin' : null,
        casaTenistaResult.status === 'fulfilled' && casaTenistaResult.value.found ? 'Casa do Tenista' : null
      ].filter(Boolean),
      timestamp: new Date().toISOString()
    };

    res.json(results);
  } catch (error) {
    console.error('[Both Stores] Error:', error);
    res.status(500).json({
      error: 'Failed to scrape stores',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Batch search endpoint for multiple racquets
app.post('/scrape/batch', async (req: Request, res: Response) => {
  try {
    const { racquets } = req.body;

    if (!Array.isArray(racquets) || racquets.length === 0) {
      return res.status(400).json({
        error: 'racquets array is required',
        example: { racquets: ['Wilson Ultra 100 V5', 'Babolat Pure Drive'] }
      });
    }

    console.log(`[Batch] Searching for ${racquets.length} racquets`);

    const results = [];

    // Process sequentially to avoid overwhelming the stores
    for (const racquetName of racquets) {
      const [prospinResult, casaTenistaResult] = await Promise.allSettled([
        searchProSpin(racquetName),
        searchCasaDoTenista(racquetName)
      ]);

      results.push({
        racquet: racquetName,
        prospin: prospinResult.status === 'fulfilled'
          ? prospinResult.value
          : { found: false, error: prospinResult.reason?.message },
        casadotenista: casaTenistaResult.status === 'fulfilled'
          ? casaTenistaResult.value
          : { found: false, error: casaTenistaResult.reason?.message }
      });

      // Add delay between racquets to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({
      totalSearched: racquets.length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Batch] Error:', error);
    res.status(500).json({
      error: 'Failed to process batch search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Populate database with all products
app.post('/populate', async (_req: Request, res: Response) => {
  try {
    console.log('[Populate] Starting full database population...');

    // Return immediately with accepted status
    res.status(202).json({
      status: 'accepted',
      message: 'Database population started in background',
      timestamp: new Date().toISOString()
    });

    // Run population in background
    populateGrid().then(() => {
      console.log('[Populate] Database population completed successfully');
    }).catch((error) => {
      console.error('[Populate] Database population failed:', error);
    });
  } catch (error) {
    console.error('[Populate] Error:', error);
    res.status(500).json({
      error: 'Failed to start database population',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🎾 Racquet Match Scraper Service`);
  console.log(`📍 Running on port ${PORT}`);
  console.log(`🔍 Endpoints:`);
  console.log(`   - POST /search (local database)`);
  console.log(`   - GET  /stats (database stats)`);
  console.log(`   - POST /populate (update database)`);
  console.log(`   - POST /scrape/prospin`);
  console.log(`   - POST /scrape/casadotenista`);
  console.log(`   - POST /scrape/both`);
  console.log(`   - POST /scrape/batch`);
  console.log(`   - GET  /health`);
});

export default app;
