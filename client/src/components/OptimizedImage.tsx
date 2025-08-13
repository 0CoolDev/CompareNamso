import React, { useEffect, useRef, useState } from 'react';
import { ImageLazyLoader } from '../utils/performance';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const imageLoader = new ImageLazyLoader();

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  priority = false,
  fallbackSrc,
  onLoad,
  onError,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate WebP and fallback sources
  const getImageSources = () => {
    const isAbsoluteUrl = src.startsWith('http') || src.startsWith('//');
    
    if (isAbsoluteUrl) {
      return {
        webp: null,
        fallback: src,
      };
    }

    // Extract file extension
    const lastDotIndex = src.lastIndexOf('.');
    const extension = lastDotIndex > -1 ? src.substring(lastDotIndex + 1) : '';
    const baseName = lastDotIndex > -1 ? src.substring(0, lastDotIndex) : src;

    // Don't convert SVGs to WebP
    if (extension === 'svg') {
      return {
        webp: null,
        fallback: src,
      };
    }

    return {
      webp: `${baseName}.webp`,
      fallback: src,
    };
  };

  const { webp, fallback } = getImageSources();

  useEffect(() => {
    const img = imgRef.current;
    
    if (!img) return;

    // For priority images, load immediately
    if (priority || loading === 'eager') {
      return;
    }

    // For lazy loading, use the observer
    if (loading === 'lazy' && !priority) {
      imageLoader.observe(img);
    }

    return () => {
      // Cleanup is handled by the ImageLazyLoader class
    };
  }, [loading, priority]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    
    // Try fallback source if available
    if (imgRef.current && fallbackSrc && imgRef.current.src !== fallbackSrc) {
      imgRef.current.src = fallbackSrc;
    } else {
      onError?.();
    }
  };

  // For browsers that support WebP
  if (webp) {
    return (
      <picture className={className}>
        <source 
          srcSet={priority ? webp : undefined}
          data-srcset={!priority ? webp : undefined}
          type="image/webp" 
        />
        <img
          ref={imgRef}
          src={priority ? fallback : undefined}
          data-src={!priority ? fallback : undefined}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : loading}
          decoding={priority ? 'sync' : 'async'}
          className={`${className} ${isLoading ? 'loading' : ''} ${hasError ? 'error' : ''}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      </picture>
    );
  }

  // Fallback for images without WebP support or absolute URLs
  return (
    <img
      ref={imgRef}
      src={priority ? fallback : undefined}
      data-src={!priority ? fallback : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : loading}
      decoding={priority ? 'sync' : 'async'}
      className={`${className} ${isLoading ? 'loading' : ''} ${hasError ? 'error' : ''}`}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};

// CSS for loading states (add to your global styles)
const imageStyles = `
  .loading {
    background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s ease-in-out infinite;
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  img.loaded {
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

// Export styles to be added to your app
export const OptimizedImageStyles = imageStyles;
