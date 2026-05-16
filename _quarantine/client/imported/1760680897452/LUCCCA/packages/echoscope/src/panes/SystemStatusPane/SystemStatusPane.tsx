
/**
 * LUCCCA | SEG-A-WB-16
 */
import React from 'react';

export const SystemStatusPane: React.FC<{ perfMode: 'light' | 'full'; online: boolean }> = ({ perfMode, online }) => {
  return (
    <section role="status" className="p-4 w-full h-full">
      <h2 className="font-semibold text-lg mb-2">System Status</h2>
      <ul className="text-sm">
        <li>PerfMode: {perfMode}</li>
        <li>Network: {online ? 'online' : 'offline'}</li>
      </ul>
    </section>
  );
};
