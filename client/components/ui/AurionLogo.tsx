/**
 * AURION Logo Component
 * 
 * Golden 3D logo with globe icon, tagline, and LUCCCA attribution
 * Optimized for sidebar display with smooth fade animations
 */

import React from 'react';
import { cn } from '@/lib/glass';

interface AurionLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon';
  animated?: boolean;
}

export const AurionLogo: React.FC<AurionLogoProps> = ({
  className,
  variant = 'full',
  animated = true,
}) => {
  if (variant === 'icon') {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center',
          animated && 'transition-opacity duration-300 ease-in-out',
          className
        )}
      >
        {/* Globe Icon */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 32 32"
          className="relative z-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="aurion-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
              <stop offset="50%" stopColor="#FFA500" stopOpacity="1" />
              <stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
            </linearGradient>
            <filter id="aurion-glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Globe sphere with bands */}
          <circle cx="16" cy="16" r="14" fill="url(#aurion-gold-gradient)" filter="url(#aurion-glow)" />
          <ellipse cx="16" cy="16" rx="14" ry="4" fill="none" stroke="rgba(255, 215, 0, 0.8)" strokeWidth="1.5" />
          <ellipse cx="16" cy="16" rx="4" ry="14" fill="none" stroke="rgba(255, 215, 0, 0.8)" strokeWidth="1.5" />
          <ellipse cx="16" cy="16" rx="12" ry="2" fill="none" stroke="rgba(255, 215, 0, 0.6)" strokeWidth="1" transform="rotate(45 16 16)" />
          <ellipse cx="16" cy="16" rx="12" ry="2" fill="none" stroke="rgba(255, 215, 0, 0.6)" strokeWidth="1" transform="rotate(-45 16 16)" />
          
          {/* Center dot */}
          <circle cx="16" cy="16" r="2" fill="#FFD700" />
        </svg>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-2.5 min-w-0',
          animated && 'transition-opacity duration-300 ease-in-out',
          className
        )}
      >
        {/* Globe Icon */}
        <div className="relative flex-shrink-0">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            className="relative z-10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="aurion-gold-compact" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
                <stop offset="50%" stopColor="#FFA500" stopOpacity="1" />
                <stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
              </linearGradient>
              <filter id="aurion-glow-compact">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            <circle cx="16" cy="16" r="12" fill="url(#aurion-gold-compact)" filter="url(#aurion-glow-compact)" />
            <ellipse cx="16" cy="16" rx="12" ry="3" fill="none" stroke="rgba(255, 215, 0, 0.8)" strokeWidth="1" />
            <ellipse cx="16" cy="16" rx="3" ry="12" fill="none" stroke="rgba(255, 215, 0, 0.8)" strokeWidth="1" />
            <circle cx="16" cy="16" r="1.5" fill="#FFD700" />
          </svg>
        </div>
        
        {/* AURION Text with tagline */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent tracking-wide leading-tight">
            AURION
          </span>
          <span className="text-xs text-amber-600/70 dark:text-amber-400/60 leading-tight mt-0.5 truncate">
            Intelligence Behind Operations
          </span>
        </div>
      </div>
    );
  }

  // Full variant with tagline
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        animated && 'transition-opacity duration-300 ease-in-out',
        className
      )}
    >
      {/* Globe Icon */}
      <div className="relative flex-shrink-0">
        <svg
          width="36"
          height="36"
          viewBox="0 0 32 32"
          className="relative z-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="aurion-gold-full" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
              <stop offset="50%" stopColor="#FFA500" stopOpacity="1" />
              <stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
            </linearGradient>
            <filter id="aurion-glow-full">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          <circle cx="16" cy="16" r="14" fill="url(#aurion-gold-full)" filter="url(#aurion-glow-full)" />
          <ellipse cx="16" cy="16" rx="14" ry="4" fill="none" stroke="rgba(255, 215, 0, 0.8)" strokeWidth="1.5" />
          <ellipse cx="16" cy="16" rx="4" ry="14" fill="none" stroke="rgba(255, 215, 0, 0.8)" strokeWidth="1.5" />
          <ellipse cx="16" cy="16" rx="12" ry="2" fill="none" stroke="rgba(255, 215, 0, 0.6)" strokeWidth="1" transform="rotate(45 16 16)" />
          <ellipse cx="16" cy="16" rx="12" ry="2" fill="none" stroke="rgba(255, 215, 0, 0.6)" strokeWidth="1" transform="rotate(-45 16 16)" />
          <circle cx="16" cy="16" r="2" fill="#FFD700" />
        </svg>
      </div>
      
      {/* Text Content */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent tracking-wide leading-tight">
          AURION
        </span>
        <span className="text-xs font-medium text-amber-600/80 dark:text-amber-400/70 leading-tight mt-0.5">
          Intelligence Behind Operations
        </span>
        <span className="text-[10px] text-amber-700/60 dark:text-amber-500/50 leading-tight mt-0.5">
          Powered by LUCCCA®
        </span>
      </div>
    </div>
  );
};

export default AurionLogo;
