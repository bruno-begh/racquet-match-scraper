/**
 * Test Client for Scraper Service
 * Run with: npm run test
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

interface ScraperResult {
  found: boolean;
  storeName: string;
  url?: string;
  price?: string;
  available?: boolean;
  error?: string;
}

interface StoreResponse {
  store: string;
  query: string;
  result: ScraperResult;
  timestamp: string;
}

interface BothStoresResponse {
  query: string;
  stores: {
    prospin: ScraperResult;
    casadotenista: ScraperResult;
  };
  foundIn: string[];
  timestamp: string;
}

async function testHealthCheck() {
  console.log('\n🏥 Testing health check...');
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check passed:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return false;
  }
}

async function testProSpin(racquetName: string) {
  console.log(`\n🔍 Testing ProSpin search for: ${racquetName}`);
  try {
    const response = await fetch(`${API_URL}/scrape/prospin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ racquetName })
    });

    const data: StoreResponse = await response.json();

    if (data.result.found) {
      console.log('✅ Found on ProSpin!');
      console.log(`   URL: ${data.result.url}`);
      console.log(`   Price: ${data.result.price}`);
    } else {
      console.log('❌ Not found on ProSpin');
      if (data.result.error) {
        console.log(`   Error: ${data.result.error}`);
      }
    }

    return data;
  } catch (error) {
    console.error('❌ ProSpin test failed:', error);
    return null;
  }
}

async function testCasaDoTenista(racquetName: string) {
  console.log(`\n🔍 Testing Casa do Tenista search for: ${racquetName}`);
  try {
    const response = await fetch(`${API_URL}/scrape/casadotenista`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ racquetName })
    });

    const data: StoreResponse = await response.json();

    if (data.result.found) {
      console.log('✅ Found on Casa do Tenista!');
      console.log(`   URL: ${data.result.url}`);
      console.log(`   Price: ${data.result.price}`);
    } else {
      console.log('❌ Not found on Casa do Tenista');
      if (data.result.error) {
        console.log(`   Error: ${data.result.error}`);
      }
    }

    return data;
  } catch (error) {
    console.error('❌ Casa do Tenista test failed:', error);
    return null;
  }
}

async function testBothStores(racquetName: string) {
  console.log(`\n🔍 Testing both stores for: ${racquetName}`);
  try {
    const response = await fetch(`${API_URL}/scrape/both`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ racquetName })
    });

    const data: BothStoresResponse = await response.json();

    console.log(`\n📊 Results:`);
    console.log(`   Found in ${data.foundIn.length} store(s): ${data.foundIn.join(', ') || 'None'}`);

    if (data.stores.prospin.found) {
      console.log(`\n   ProSpin:`);
      console.log(`   ✅ ${data.stores.prospin.url}`);
      console.log(`      ${data.stores.prospin.price}`);
    } else {
      console.log(`\n   ProSpin: ❌ Not found`);
    }

    if (data.stores.casadotenista.found) {
      console.log(`\n   Casa do Tenista:`);
      console.log(`   ✅ ${data.stores.casadotenista.url}`);
      console.log(`      ${data.stores.casadotenista.price}`);
    } else {
      console.log(`\n   Casa do Tenista: ❌ Not found`);
    }

    return data;
  } catch (error) {
    console.error('❌ Both stores test failed:', error);
    return null;
  }
}

async function testBatch(racquets: string[]) {
  console.log(`\n🔍 Testing batch search for ${racquets.length} racquets...`);
  try {
    const response = await fetch(`${API_URL}/scrape/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ racquets })
    });

    const data = await response.json();

    console.log(`\n📊 Batch Results:`);
    data.results.forEach((result: any, index: number) => {
      const found = [result.prospin.found, result.casadotenista.found].filter(Boolean).length;
      console.log(`\n   ${index + 1}. ${result.racquet}`);
      console.log(`      Found in ${found} store(s)`);
      if (result.prospin.found) {
        console.log(`      ProSpin: ${result.prospin.price}`);
      }
      if (result.casadotenista.found) {
        console.log(`      Casa do Tenista: ${result.casadotenista.price}`);
      }
    });

    return data;
  } catch (error) {
    console.error('❌ Batch test failed:', error);
    return null;
  }
}

async function runTests() {
  console.log('🎾 RACQUET MATCH SCRAPER SERVICE - TEST CLIENT');
  console.log('='.repeat(60));
  console.log(`\nAPI URL: ${API_URL}\n`);

  // Test 1: Health Check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n⚠️  Service is not responding. Make sure it is running!');
    console.log('   Run: npm run dev');
    return;
  }

  // Test 2: Single racquet tests
  const testRacquet = 'Wilson Ultra 100 V5';

  await testProSpin(testRacquet);
  await testCasaDoTenista(testRacquet);
  await testBothStores(testRacquet);

  // Test 3: Batch test
  const batchRacquets = [
    'Babolat Pure Drive',
    'Head Radical Pro'
  ];

  await testBatch(batchRacquets);

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!\n');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
