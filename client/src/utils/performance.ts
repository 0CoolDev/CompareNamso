/**
 * Performance optimization utilities
 */

/**
 * Preload critical resources
 */
export function preloadResources() {
  // Add preconnect hints
  const preconnectUrls = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ];

  preconnectUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    if (url.includes('fonts.gstatic.com')) {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  });
}

/**
 * Prefetch chunks that might be needed soon
 */
export function prefetchChunks(chunks: string[]) {
  if ('link' in document.createElement('link')) {
    chunks.forEach(chunk => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = chunk;
      link.as = chunk.endsWith('.js') ? 'script' : 
                 chunk.endsWith('.css') ? 'style' : 'fetch';
      document.head.appendChild(link);
    });
  }
}

/**
 * Load image with WebP fallback
 */
export function getOptimizedImageSrc(
  imageName: string,
  extension: string = 'jpg'
): { webp: string; fallback: string } {
  const basePath = `/assets/images/${imageName}`;
  return {
    webp: `${basePath}.webp`,
    fallback: `${basePath}.${extension}`
  };
}

/**
 * Lazy load images using Intersection Observer
 */
export class ImageLazyLoader {
  private observer: IntersectionObserver | null = null;

  constructor() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              this.loadImage(img);
              this.observer?.unobserve(img);
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.01
        }
      );
    }
  }

  observe(img: HTMLImageElement) {
    if (this.observer) {
      this.observer.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadImage(img);
    }
  }

  private loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (src) {
      img.src = src;
    }
    if (srcset) {
      img.srcset = srcset;
    }

    img.classList.add('loaded');
  }

  disconnect() {
    this.observer?.disconnect();
  }
}

/**
 * Dynamic import with error handling and retry
 */
export async function dynamicImportWithRetry<T>(
  importFn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Dynamic import failed, retrying... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return dynamicImportWithRetry(importFn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user is on a slow connection
 */
export function isSlowConnection(): boolean {
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
  
  if (!connection) return false;
  
  // Check for slow connection types
  const slowTypes = ['slow-2g', '2g', '3g'];
  return slowTypes.includes(connection.effectiveType) || 
         connection.saveData === true;
}

/**
 * Debounce function for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallbackShim(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  
  // Fallback to setTimeout
  const start = Date.now();
  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
    } as IdleDeadline);
  }, 1) as unknown as number;
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallbackShim(handle: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}
