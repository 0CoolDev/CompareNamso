// BIN Database Lazy Loading Module
import type { BinInfo } from '@shared/schema';

interface BinDatabase {
  [key: string]: Partial<BinInfo>;
}

// Cache for loaded databases
const loadedDatabases: Map<string, BinDatabase> = new Map();
const loadPromises: Map<string, Promise<BinDatabase>> = new Map();

// Detect card brand from BIN
function detectBrandFromBin(bin: string): string {
  const firstDigit = bin[0];
  const firstTwo = bin.substring(0, 2);
  const firstThree = bin.substring(0, 3);
  const firstFour = bin.substring(0, 4);
  const firstSix = bin.substring(0, 6);

  // Visa
  if (firstDigit === '4') return 'visa';
  
  // Mastercard
  if (['51', '52', '53', '54', '55'].includes(firstTwo) || 
      (parseInt(firstSix) >= 222100 && parseInt(firstSix) <= 272099)) {
    return 'mastercard';
  }
  
  // American Express
  if (['34', '37'].includes(firstTwo)) return 'amex';
  
  // Discover
  if (firstFour === '6011' || 
      (parseInt(firstThree) >= 644 && parseInt(firstThree) <= 649) ||
      firstTwo === '65') {
    return 'discover';
  }
  
  // Diners Club
  if (['300', '301', '302', '303', '304', '305', '36', '38'].some(prefix => bin.startsWith(prefix))) {
    return 'others';
  }
  
  // JCB
  if ((parseInt(firstFour) >= 3528 && parseInt(firstFour) <= 3589)) {
    return 'others';
  }
  
  // UnionPay
  if (firstTwo === '62') return 'others';
  
  // Maestro
  if (['50', '56', '57', '58', '67'].includes(firstTwo)) return 'others';
  
  return 'others';
}

// Lazy load a specific database chunk
async function loadDatabase(brand: string): Promise<BinDatabase> {
  // Check if already loaded
  if (loadedDatabases.has(brand)) {
    return loadedDatabases.get(brand)!;
  }

  // Check if already loading
  if (loadPromises.has(brand)) {
    return loadPromises.get(brand)!;
  }

  // Start loading
  const loadPromise = (async () => {
    try {
      const module = await import(`./${brand}.json`);
      const database = module.default || module;
      loadedDatabases.set(brand, database);
      loadPromises.delete(brand);
      return database;
    } catch (error) {
      console.error(`Failed to load BIN database for ${brand}:`, error);
      loadPromises.delete(brand);
      return {};
    }
  })();

  loadPromises.set(brand, loadPromise);
  return loadPromise;
}

// Main function to get BIN info with lazy loading
export async function getBinInfoLazy(bin: string): Promise<BinInfo | null> {
  const brand = detectBrandFromBin(bin);
  const database = await loadDatabase(brand);
  
  // Try exact match first
  if (database[bin]) {
    return database[bin] as BinInfo;
  }
  
  // Try with first 6 digits if longer
  if (bin.length > 6) {
    const sixDigit = bin.substring(0, 6);
    if (database[sixDigit]) {
      return database[sixDigit] as BinInfo;
    }
  }
  
  // Try progressively shorter prefixes
  for (let len = Math.min(bin.length, 8); len >= 6; len--) {
    const prefix = bin.substring(0, len);
    if (database[prefix]) {
      return database[prefix] as BinInfo;
    }
  }
  
  // Return default if not found
  return {
    brand: detectBrandFromBin(bin).charAt(0).toUpperCase() + detectBrandFromBin(bin).slice(1),
    type: 'Unknown',
    level: 'Standard',
    bank: 'Unknown Bank',
    country: 'Unknown'
  };
}

// Preload specific brands (optional)
export async function preloadBrands(brands: string[]): Promise<void> {
  await Promise.all(brands.map(brand => loadDatabase(brand)));
}

// Clear cache (for memory management)
export function clearCache(): void {
  loadedDatabases.clear();
  loadPromises.clear();
}

// Get cache status
export function getCacheStatus(): { loaded: string[], loading: string[] } {
  return {
    loaded: Array.from(loadedDatabases.keys()),
    loading: Array.from(loadPromises.keys())
  };
}
