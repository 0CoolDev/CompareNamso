import { get, set, del, clear } from 'idb-keyval';

interface BINData {
  bin: string;
  bank?: string;
  type?: string;
  level?: string;
  country?: string;
  countryCode?: string;
  website?: string;
  phone?: string;
  prepaid?: boolean;
}

class BINDatabaseManager {
  private static instance: BINDatabaseManager;
  private dbCache: Map<string, BINData> = new Map();
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private readonly DB_KEY = 'bin-database';
  private readonly DB_VERSION_KEY = 'bin-database-version';
  private readonly CURRENT_VERSION = '1.0.0';

  private constructor() {}

  static getInstance(): BINDatabaseManager {
    if (!BINDatabaseManager.instance) {
      BINDatabaseManager.instance = new BINDatabaseManager();
    }
    return BINDatabaseManager.instance;
  }

  /**
   * Lazy load the BIN database
   */
  async loadDatabase(): Promise<void> {
    // If already loading, return the existing promise
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // If already loaded, return immediately
    if (this.isLoaded) {
      return Promise.resolve();
    }

    this.loadPromise = this.performLoad();
    return this.loadPromise;
  }

  private async performLoad(): Promise<void> {
    try {
      // Check if we have a cached version in IndexedDB
      const cachedVersion = await get(this.DB_VERSION_KEY);
      const cachedData = await get(this.DB_KEY);

      if (cachedVersion === this.CURRENT_VERSION && cachedData) {
        // Use cached data
        this.populateCache(cachedData);
        this.isLoaded = true;
        console.log('BIN database loaded from IndexedDB cache');
        return;
      }

      // Fetch the BIN database using dynamic import for code splitting
      const response = await this.fetchBINDatabase();
      const data = await response.json();

      // Store in IndexedDB for future use
      await set(this.DB_KEY, data);
      await set(this.DB_VERSION_KEY, this.CURRENT_VERSION);

      // Populate in-memory cache
      this.populateCache(data);
      this.isLoaded = true;
      console.log('BIN database loaded and cached');
    } catch (error) {
      console.error('Failed to load BIN database:', error);
      // Try to use any existing cached data even if version doesn't match
      const fallbackData = await get(this.DB_KEY);
      if (fallbackData) {
        this.populateCache(fallbackData);
        this.isLoaded = true;
        console.log('Using fallback BIN database from cache');
      } else {
        throw new Error('Unable to load BIN database');
      }
    } finally {
      this.loadPromise = null;
    }
  }

  private async fetchBINDatabase(): Promise<Response> {
    // Use dynamic import to code-split the BIN database file
    return fetch('/api/bin-database', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add cache control
      cache: 'default',
    });
  }

  private populateCache(data: BINData[] | Record<string, BINData>): void {
    if (Array.isArray(data)) {
      data.forEach(item => {
        this.dbCache.set(item.bin, item);
      });
    } else {
      Object.entries(data).forEach(([bin, info]) => {
        this.dbCache.set(bin, info);
      });
    }
  }

  /**
   * Look up BIN information
   */
  async lookup(cardNumber: string): Promise<BINData | null> {
    // Ensure database is loaded
    await this.loadDatabase();

    // Extract BIN (first 6 digits)
    const bin = cardNumber.replace(/\s/g, '').substring(0, 6);

    // Try exact match first
    if (this.dbCache.has(bin)) {
      return this.dbCache.get(bin)!;
    }

    // Try with first 4 digits (some BINs are 4 digits)
    const bin4 = bin.substring(0, 4);
    if (this.dbCache.has(bin4)) {
      return this.dbCache.get(bin4)!;
    }

    return null;
  }

  /**
   * Validate card number using Luhn algorithm
   */
  validateCardNumber(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    
    if (digits.length < 13 || digits.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Get card type from card number
   */
  getCardType(cardNumber: string): string {
    const digits = cardNumber.replace(/\D/g, '');
    
    // Visa
    if (/^4/.test(digits)) {
      return 'Visa';
    }
    
    // Mastercard
    if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) {
      return 'Mastercard';
    }
    
    // American Express
    if (/^3[47]/.test(digits)) {
      return 'American Express';
    }
    
    // Discover
    if (/^6(?:011|5)/.test(digits)) {
      return 'Discover';
    }
    
    // Diners Club
    if (/^3(?:0[0-5]|[68])/.test(digits)) {
      return 'Diners Club';
    }
    
    // JCB
    if (/^35/.test(digits)) {
      return 'JCB';
    }
    
    return 'Unknown';
  }

  /**
   * Clear the cached database
   */
  async clearCache(): Promise<void> {
    this.dbCache.clear();
    await del(this.DB_KEY);
    await del(this.DB_VERSION_KEY);
    this.isLoaded = false;
    console.log('BIN database cache cleared');
  }

  /**
   * Preload the database (can be called on idle)
   */
  preload(): void {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.loadDatabase().catch(console.error);
      });
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      setTimeout(() => {
        this.loadDatabase().catch(console.error);
      }, 1000);
    }
  }
}

// Export singleton instance
export const binDatabase = BINDatabaseManager.getInstance();

// Export types
export type { BINData };
