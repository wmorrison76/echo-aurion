import React, { Suspense, ComponentType } from 'react';
import { UniversalErrorBoundary } from '@/components/UniversalErrorBoundary';

interface LoadingFallbackProps {
  moduleName: string;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ moduleName }) => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading {moduleName}...</p>
    </div>
  </div>
);

export function safeModuleLoader(
  importFn: () => Promise<{ default: ComponentType<any> }>,
  moduleName: string
): React.FC {
  const LazyComponent = React.lazy(importFn);

  return function SafeModule(props: any) {
    return (
      <UniversalErrorBoundary moduleName={moduleName}>
        <Suspense fallback={<LoadingFallback moduleName={moduleName} />}>
          <LazyComponent {...props} />
        </Suspense>
      </UniversalErrorBoundary>
    );
  };
}
