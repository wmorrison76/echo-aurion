import React from 'react';
export function useResizeObserverErrorHandler(){ return { onError: (_?:unknown)=>{} }; }
export default function ResizeObserverErrorBoundary({ children }: { children: React.ReactNode }){ return <>{children}</>; }
