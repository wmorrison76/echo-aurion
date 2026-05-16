// PrefetchLinks.jsx
// Prefetch route data.

import React from 'react';
export default function PrefetchLinks({ href }) {
  return <link rel='prefetch' href={href} />;
}
