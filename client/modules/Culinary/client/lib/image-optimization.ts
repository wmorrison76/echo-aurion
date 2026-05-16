/**
 * Image Optimization Utilities
 * WebP conversion, LQIP (Low Quality Image Placeholder), responsive images
 */
import React from 'react';

/**
 * Generate responsive image srcset for multiple resolutions
 * Handles WebP with JPG fallback
 */
export function generateResponsiveSrcSet(
  baseUrl: string,
  options: { format?: 'auto' | 'webp' | 'jpg' } = {}
): {
  srcSet: string;
  jpgSrcSet: string;
  sizes: string;
} {
  const format = options.format || 'auto';

  // Define breakpoints for responsive images
  const breakpoints = [200, 400, 800, 1200];

  const srcSet = breakpoints
    .map(width => `${baseUrl}?format=${format}&width=${width} ${width}w`)
    .join(', ');

  const jpgSrcSet = breakpoints
    .map(width => `${baseUrl}?format=jpg&width=${width} ${width}w`)
    .join(', ');

  const sizes =
    '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, (max-width: 1536px) 60vw, 50vw';

  return { srcSet, jpgSrcSet, sizes };
}

/**
 * Check if browser supports WebP format
 */
export async function supportsWebP(): Promise<boolean> {
  return new Promise(resolve => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src =
      'data:image/webp;base64,UklGRjoKAABXQVZFIFBhwsgBAAAAAA==';
  });
}

/**
 * Get appropriate image format based on browser support
 */
export async function getOptimalImageFormat(): Promise<'webp' | 'jpg'> {
  try {
    const supported = await supportsWebP();
    return supported ? 'webp' : 'jpg';
  } catch {
    return 'jpg';
  }
}

/**
 * Generate blurhash placeholder (requires blurhash library on server)
 * Returns a data URL that can be used as image placeholder
 */
export function generatePlaceholderUrl(
  blurhash: string,
  width: number = 32,
  height: number = 24
): string {
  // This will be populated by blurhash library on client side
  // For now, return a simple solid color placeholder
  if (!blurhash) {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=';
  }

  // Decode blurhash to canvas and return as data URL
  try {
    // Note: Actual blurhash decoding requires the blurhash library
    // This is a placeholder implementation
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, width, height);
    }
    return canvas.toDataURL();
  } catch {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=';
  }
}

/**
 * Lazy load images using Intersection Observer
 * Useful for below-the-fold images
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  src: string,
  srcset?: string
): void {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const image = entry.target as HTMLImageElement;
        image.src = src;
        if (srcset) {
          image.srcset = srcset;
        }
        image.classList.add('loaded');
        observer.unobserve(image);
      }
    });
  });

  imageObserver.observe(img);
}

/**
 * Preload images for better perceived performance
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Get image dimensions without loading full image
 */
export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Calculate responsive image sizes based on viewport
 */
export function getResponsiveImageSizes(): {
  small: number;
  medium: number;
  large: number;
} {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isTablet = typeof window !== 'undefined' && window.innerWidth < 1024;

  if (isMobile) {
    return { small: 200, medium: 400, large: 600 };
  }
  if (isTablet) {
    return { small: 400, medium: 800, large: 1000 };
  }
  return { small: 400, medium: 800, large: 1200 };
}

/**
 * Build image URL with query parameters
 */
export function buildImageUrl(
  baseUrl: string,
  options?: {
    format?: 'webp' | 'jpg' | 'auto';
    width?: number;
    height?: number;
    quality?: number;
  }
): string {
  const params = new URLSearchParams();

  if (options?.format) {
    params.append('format', options.format);
  }
  if (options?.width) {
    params.append('width', String(options.width));
  }
  if (options?.height) {
    params.append('height', String(options.height));
  }
  if (options?.quality) {
    params.append('quality', String(options.quality));
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return params.toString() ? `${baseUrl}${separator}${params.toString()}` : baseUrl;
}

/**
 * React hook for managing image loading states
 */
export function useImageLoading(blurhash?: string) {
  const [loaded, setLoaded] = React.useState(false);
  const [placeholder, setPlaceholder] = React.useState<string>('');

  React.useEffect(() => {
    if (blurhash) {
      const placeholderUrl = generatePlaceholderUrl(blurhash);
      setPlaceholder(placeholderUrl);
    }
  }, [blurhash]);

  return {
    loaded,
    setLoaded,
    placeholder
  };
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(ref: React.RefObject<HTMLElement>) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.unobserve(ref.current!);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref]);

  return isVisible;
}
