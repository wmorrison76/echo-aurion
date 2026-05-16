import React from 'react';

export function AdminPanelGrid({ children }) {
  return (
    <div className="admin-panel-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {children}
    </div>
  );
}
