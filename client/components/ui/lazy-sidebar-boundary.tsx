/**
 * Lazy Sidebar Boundary Component
 * Wraps heavy sidebars with Suspense and provides loading skeleton
 */

import React, { ComponentType, ReactNode, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for sidebars
 */
function SidebarSkeleton() {
  return (
    <div className="w-full p-4 space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface LazySidebarBoundaryProps {
  component: ComponentType<any>;
  componentProps?: Record<string, any>;
  fallback?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Lazy Sidebar Boundary
 * Wraps sidebar components with Suspense and loading fallback
 */
export const LazySidebarBoundary = React.forwardRef<
  HTMLDivElement,
  LazySidebarBoundaryProps
>(
  (
    {
      component: Component,
      componentProps = {},
      fallback = <SidebarSkeleton />,
      children,
      className = "",
    },
    ref
  ) => {
    return (
      <Suspense fallback={fallback}>
        <div ref={ref} className={className}>
          <Component {...componentProps} />
        </div>
      </Suspense>
    );
  }
);

LazySidebarBoundary.displayName = "LazySidebarBoundary";

/**
 * Create a lazy sidebar component
 * Usage: const LazySidebar = createLazySidebar(() => import('./Sidebar'))
 */
export function createLazySidebar<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ReactNode
) {
  const LazyComponent = React.lazy(importFn);

  return React.forwardRef<HTMLDivElement, P & { className?: string }>(
    (props, ref) => {
      const { className, ...componentProps } = props as P & { className?: string };

      return (
        <div ref={ref} className={className}>
          <Suspense fallback={fallback || <SidebarSkeleton />}>
            <LazyComponent {...(componentProps as P)} />
          </Suspense>
        </div>
      );
    }
  );
}

/**
 * Hook to manage lazy sidebar loading state
 */
export function useLazySidebarState(defaultOpen = false) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const [isLoading, setIsLoading] = React.useState(false);

  const openSidebar = React.useCallback(() => {
    setIsLoading(true);
    setIsOpen(true);
    // Simulate load time - in reality this is managed by Suspense
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  const closeSidebar = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }, [isOpen, closeSidebar, openSidebar]);

  return {
    isOpen,
    isLoading,
    openSidebar,
    closeSidebar,
    toggleSidebar,
  };
}

/**
 * Optimized sidebar wrapper that defers loading until sidebar is opened
 */
export const DeferredSidebar = React.forwardRef<
  HTMLDivElement,
  {
    component: ComponentType<any>;
    componentProps?: Record<string, any>;
    isOpen: boolean;
    fallback?: ReactNode;
    children?: ReactNode;
  }
>(
  (
    {
      component: Component,
      componentProps = {},
      isOpen,
      fallback = <SidebarSkeleton />,
    },
    ref
  ) => {
    if (!isOpen) {
      return null; // Don't render or load until opened
    }

    return (
      <div ref={ref}>
        <Suspense fallback={fallback}>
          <Component {...componentProps} />
        </Suspense>
      </div>
    );
  }
);

DeferredSidebar.displayName = "DeferredSidebar";

export default {
  SidebarSkeleton,
  LazySidebarBoundary,
  createLazySidebar,
  useLazySidebarState,
  DeferredSidebar,
};
