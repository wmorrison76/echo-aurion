import React from 'react';

export function PanelContainer({ children }) {
  return (
    <div className="panel-container bg-white dark:bg-zinc-800 rounded-lg shadow p-6 mb-6">
      {children}
    </div>
  );
}
