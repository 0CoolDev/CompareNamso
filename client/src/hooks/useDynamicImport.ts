import { useEffect, useState } from 'react';
import { dynamicImportWithRetry } from '../utils/performance';

/**
 * Hook for dynamic imports with loading state
 */
export function useDynamicImport<T>(
  importFn: () => Promise<{ default: T }>,
  dependencies: any[] = []
) {
  const [module, setModule] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadModule = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const importedModule = await dynamicImportWithRetry(importFn);
        
        if (!cancelled) {
          setModule(importedModule.default);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          console.error('Failed to load module:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadModule();

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return { module, loading, error };
}

/**
 * Example usage for lazy loading heavy components
 */
export function useLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return useDynamicImport(importFn);
}

// Example: Lazy load payment processing component
export const usePaymentProcessor = () => {
  return useLazyComponent(() => 
    import(/* webpackChunkName: "payment-processor" */ '../components/PaymentProcessor')
  );
};

// Example: Lazy load analytics
export const useAnalytics = () => {
  return useDynamicImport(() =>
    import(/* webpackChunkName: "analytics" */ '../utils/analytics')
  );
};

// Example: Lazy load chart library
export const useChartLibrary = () => {
  return useDynamicImport(() =>
    import(/* webpackChunkName: "charts" */ '../utils/charts')
  );
};
