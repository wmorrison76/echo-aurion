import React from 'react';

export function MobileGridWrapper({ children }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
      {children}
    </div>
  );
}
