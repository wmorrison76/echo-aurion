// frontend/src/components/GridLayout.jsx

import React from 'react';

export function GridLayout({ children }) {
  return (
    <div className="grid-layout grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  );
}
