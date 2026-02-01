import fs from 'fs';
import path from 'path';

export interface Product {
  store: string;
  name: string;
  url: string;
  price: string;
  available: boolean;
  lastUpdated: string;
}

export class ProductsStore {
  private filePath: string;
  private products: Product[] = [];

  constructor(filePath: string = './data/products.json') {
    this.filePath = filePath;
    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Load products if file exists
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.products = JSON.parse(data);
        console.log(`Loaded ${this.products.length} products from ${this.filePath}`);
      } else {
        this.products = [];
        this.saveToFile();
      }
    } catch (error) {
      console.error('Error loading products from file:', error);
      this.products = [];
    }
  }

  private saveToFile() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.filePath, JSON.stringify(this.products, null, 2), 'utf-8');
      console.log(`Saved ${this.products.length} products to ${this.filePath}`);
    } catch (error) {
      console.error('Error saving products to file:', error);
    }
  }

  upsertProduct(product: Product) {
    // Find existing product by URL
    const existingIndex = this.products.findIndex(p => p.url === product.url);

    if (existingIndex >= 0) {
      // Update existing product
      this.products[existingIndex] = product;
    } else {
      // Add new product
      this.products.push(product);
    }
  }

  searchProducts(query: string, store?: string): Product[] {
    const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);

    let results = this.products.filter(p => p.available);

    // Filter by store if specified
    if (store) {
      results = results.filter(p => p.store === store);
    }

    // Filter by search terms - all terms must match
    results = results.filter(product => {
      const searchText = product.name.toLowerCase();
      return searchTerms.every(term => searchText.includes(term));
    });

    // Sort by relevance (number of matching terms in order)
    results.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // Count how many terms appear in order
      let aScore = 0;
      let bScore = 0;

      for (let i = 0; i < searchTerms.length; i++) {
        if (aName.includes(searchTerms[i])) aScore++;
        if (bName.includes(searchTerms[i])) bScore++;
      }

      return bScore - aScore;
    });

    return results.slice(0, 10);
  }

  getAllProducts(store?: string): Product[] {
    if (store) {
      return this.products.filter(p => p.store === store);
    }
    return this.products;
  }

  getProductCount(store?: string): number {
    if (store) {
      return this.products.filter(p => p.store === store).length;
    }
    return this.products.length;
  }

  clearStore(store: string) {
    this.products = this.products.filter(p => p.store !== store);
    this.saveToFile();
  }

  save() {
    this.saveToFile();
  }

  reload() {
    this.loadFromFile();
  }
}
