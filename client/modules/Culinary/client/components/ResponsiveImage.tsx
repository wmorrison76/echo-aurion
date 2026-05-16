import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  generateResponsiveSrcSet,
  useImageLoading,
  useIntersectionObserver,
  buildImageUrl
} from '@/lib/image-optimization';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  blurhash?: string;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  priority?: boolean;
  sizes?: string;
  onLoad?: () => void;
}

/**
 * Responsive image component with WebP support and LQIP
 * Automatically serves WebP to supported browsers, JPG fallback
 * Includes blur-up effect using blurhash placeholder
 */
export const ResponsiveImage = React.forwardRef<HTMLImageElement, ResponsiveImageProps>(
  (
    {
      src,
      alt,
      width = 800,
      height = 600,
      aspectRatio,
      blurhash,
      className,
      objectFit = 'cover',
      priority = false,
      sizes,
      onLoad
    },
    ref
  ) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const imgRef = React.useRef<HTMLImageElement>(null);
    const isVisible = useIntersectionObserver(containerRef);
    const { placeholder } = useImageLoading(blurhash);

    // Use ref if provided
    React.useImperativeHandle(ref, () => imgRef.current as HTMLImageElement);

    // Generate responsive image srcsets
    const { srcSet, jpgSrcSet, sizes: defaultSizes } = generateResponsiveSrcSet(src, {
      format: 'auto'
    });

    const handleImageLoad = () => {
      setImageLoaded(true);
      onLoad?.();
    };

    const shouldLoad = priority || isVisible;

    return (
      <div
        ref={containerRef}
        className={cn('relative overflow-hidden bg-gray-100', className)}
        style={{
          aspectRatio: aspectRatio || `${width}/${height}`,
          ...(!imageLoaded && placeholder && {
            backgroundImage: `url('${placeholder}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          })
        }}
      >
        {shouldLoad && (
          <picture>
            {/* WebP source for supported browsers */}
            <source
              srcSet={generateResponsiveSrcSet(src, { format: 'webp' }).srcSet}
              type="image/webp"
              sizes={sizes || defaultSizes}
            />

            {/* JPG fallback for older browsers */}
            <source
              srcSet={jpgSrcSet}
              type="image/jpeg"
              sizes={sizes || defaultSizes}
            />

            {/* Fallback img tag */}
            <img
              ref={imgRef}
              src={buildImageUrl(src, { format: 'jpg', width: 400 })}
              srcSet={jpgSrcSet}
              alt={alt}
              width={width}
              height={height}
              loading={priority ? 'eager' : 'lazy'}
              onLoad={handleImageLoad}
              className={cn(
                'w-full h-full transition-opacity duration-300',
                objectFit === 'cover' && 'object-cover',
                objectFit === 'contain' && 'object-contain',
                objectFit === 'fill' && 'object-fill',
                objectFit === 'scale-down' && 'object-scale-down',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
            />
          </picture>
        )}

        {/* Loading skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
        )}
      </div>
    );
  }
);

ResponsiveImage.displayName = 'ResponsiveImage';

/**
 * Recipe Card Image - optimized for recipe listings
 */
export function RecipeCardImage({
  src,
  alt,
  blurhash
}: {
  src: string;
  alt: string;
  blurhash?: string;
}) {
  return (
    <ResponsiveImage
      src={src}
      alt={alt}
      width={400}
      height={300}
      aspectRatio="4/3"
      blurhash={blurhash}
      className="rounded-lg"
      objectFit="cover"
    />
  );
}

/**
 * Gallery Image - full-width optimized
 */
export function GalleryImage({
  src,
  alt,
  blurhash
}: {
  src: string;
  alt: string;
  blurhash?: string;
}) {
  return (
    <ResponsiveImage
      src={src}
      alt={alt}
      width={1200}
      height={800}
      aspectRatio="3/2"
      blurhash={blurhash}
      className="rounded-lg w-full"
      objectFit="cover"
    />
  );
}

/**
 * Hero Image - large display image
 */
export function HeroImage({
  src,
  alt,
  blurhash
}: {
  src: string;
  alt: string;
  blurhash?: string;
}) {
  return (
    <ResponsiveImage
      src={src}
      alt={alt}
      width={1920}
      height={1080}
      aspectRatio="16/9"
      blurhash={blurhash}
      className="w-full"
      objectFit="cover"
      priority
    />
  );
}

/**
 * Thumbnail Image - small preview
 */
export function ThumbnailImage({
  src,
  alt,
  blurhash
}: {
  src: string;
  alt: string;
  blurhash?: string;
}) {
  return (
    <ResponsiveImage
      src={src}
      alt={alt}
      width={150}
      height={150}
      aspectRatio="1/1"
      blurhash={blurhash}
      className="rounded"
      objectFit="cover"
    />
  );
}
