// LazyLoadWrapper.jsx
// HOC for lazy loading components.

import React, { Suspense } from 'react';
export default function LazyLoadWrapper({ children }) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}
