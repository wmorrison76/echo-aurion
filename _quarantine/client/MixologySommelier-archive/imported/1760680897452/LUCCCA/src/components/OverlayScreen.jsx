import React from 'react';

export function OverlayScreen({ isActive, children }) {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {children}
    </div>
  );
}
