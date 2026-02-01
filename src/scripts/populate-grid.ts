import { ProductsStore } from '../database/products-store';
import { scrapeProsSpinGrid } from '../scrapers/prospin-grid';
import { scrapeCasaDoTenistaGrid } from '../scrapers/casadotenista-grid';

async function populateGrid() {
  console.log('='.repeat(80));
  console.log('🎾 GRID SCRAPE - EXACT USER INSTRUCTIONS');
  console.log('ProSpin: 10 pages @ https://www.prospin.com.br/raquetes/aplicacao-tenis');
  console.log('Casa do Tenista: 2 clicks "Mostrar mais" @ .../raquetes-de-tenis');
  console.log('Target: 174 + 47 = 221 products');
  console.log('='.repeat(80));

  const store = new ProductsStore();
  const startTime = Date.now();

  try {
    // ProSpin: 10 pages
    console.log('\n📦 ProSpin (10 pages)...');
    const prospinStart = Date.now();
    const prospinProducts = await scrapeProsSpinGrid();
    const prospinTime = ((Date.now() - prospinStart) / 1000 / 60).toFixed(1);
    console.log(`✅ ProSpin: ${prospinProducts.length} products in ${prospinTime}min`);

    for (const product of prospinProducts) {
      store.upsertProduct(product);
    }

    // Casa do Tenista: 2 clicks
    console.log('\n📦 Casa do Tenista (2 clicks "Mostrar mais")...');
    const casaStart = Date.now();
    const casaProducts = await scrapeCasaDoTenistaGrid();
    const casaTime = ((Date.now() - casaStart) / 1000 / 60).toFixed(1);
    console.log(`✅ Casa: ${casaProducts.length} products in ${casaTime}min`);

    for (const product of casaProducts) {
      store.upsertProduct(product);
    }

    // Save
    console.log('\n💾 Saving...');
    store.save();

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 GRID SCRAPE RESULTS');
    console.log('='.repeat(80));
    console.log(`Total: ${store.getProductCount()} products (target: 221)`);
    console.log(`  ProSpin: ${store.getProductCount('ProSpin')} (target: 174)`);
    console.log(`  Casa do Tenista: ${store.getProductCount('Casa do Tenista')} (target: 47)`);
    console.log(`Total time: ${totalTime}min`);
    console.log('='.repeat(80));

    // Samples
    console.log('\n📋 First 10 products:');
    store.getAllProducts().slice(0, 10).forEach((p, i) =>
      console.log(`  ${i + 1}. [${p.store}] ${p.name} - ${p.price}`)
    );

    if (store.getProductCount() >= 200) {
      console.log('\n✅ SCRAPING COMPLETE - TARGET REACHED!');
    } else {
      console.log(`\n⚠️  Got ${store.getProductCount()}/221 products - check scrapers`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  populateGrid().catch(console.error);
}

export { populateGrid };
