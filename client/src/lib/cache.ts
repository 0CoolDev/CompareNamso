// LocalStorage cache with TTL for BIN lookups and generated cards
interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class CacheManager {
  private prefix: string;
  private defaultTTL: number;

  constructor(prefix: string = 'cardgen_', defaultTTL: number = 24 * 60 * 60 * 1000) {
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
  }

  // Set item in cache with optional TTL
  set<T>(key: string, value: T, ttl?: number): void {
    try {
      const item: CacheItem<T> = {
        value,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.error('Cache set error:', error);
      // Handle quota exceeded error
      if (error instanceof DOMException && error.code === 22) {
        this.clearExpired();
        // Try again
        try {
          const item: CacheItem<T> = {
            value,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
          };
          localStorage.setItem(this.prefix + key, JSON.stringify(item));
        } catch {
          // If still fails, clear oldest items
          this.clearOldest(5);
        }
      }
    }
  }

  // Get item from cache
  get<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);
      const age = Date.now() - item.timestamp;

      if (age > item.ttl) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Check if item exists and is valid
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Remove specific item
  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  // Clear all expired items
  clearExpired(): number {
    let cleared = 0;
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (!key.startsWith(this.prefix)) continue;
      
      try {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) continue;
        
        const item: CacheItem<any> = JSON.parse(itemStr);
        const age = Date.now() - item.timestamp;
        
        if (age > item.ttl) {
          localStorage.removeItem(key);
          cleared++;
        }
      } catch {
        // Remove corrupted items
        localStorage.removeItem(key);
        cleared++;
      }
    }
    
    return cleared;
  }

  // Clear oldest items to free space
  clearOldest(count: number): number {
    const items: { key: string; timestamp: number }[] = [];
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (!key.startsWith(this.prefix)) continue;
      
      try {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) continue;
        
        const item: CacheItem<any> = JSON.parse(itemStr);
        items.push({ key, timestamp: item.timestamp });
      } catch {
        // Remove corrupted items
        localStorage.removeItem(key);
      }
    }
    
    // Sort by timestamp (oldest first)
    items.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest items
    const toRemove = Math.min(count, items.length);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(items[i].key);
    }
    
    return toRemove;
  }

  // Clear all cache items
  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Get cache statistics
  getStats(): {
    totalItems: number;
    totalSize: number;
    expiredItems: number;
  } {
    let totalItems = 0;
    let totalSize = 0;
    let expiredItems = 0;
    
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (!key.startsWith(this.prefix)) continue;
      
      totalItems++;
      const itemStr = localStorage.getItem(key);
      if (itemStr) {
        totalSize += itemStr.length;
        
        try {
          const item: CacheItem<any> = JSON.parse(itemStr);
          const age = Date.now() - item.timestamp;
          if (age > item.ttl) {
            expiredItems++;
          }
        } catch {
          expiredItems++;
        }
      }
    }
    
    return { totalItems, totalSize, expiredItems };
  }
}

// Create singleton instances for different cache types
export const binCache = new CacheManager('bin_cache_', 24 * 60 * 60 * 1000); // 24 hours
export const cardCache = new CacheManager('card_cache_', 1 * 60 * 60 * 1000); // 1 hour
export const sessionCache = new CacheManager('session_cache_', 30 * 60 * 1000); // 30 minutes
