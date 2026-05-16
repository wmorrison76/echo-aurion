
/**
 * LUCCCA | SEG-A-WB-14
 */
import React from 'react';

export const OrderingPane: React.FC = () => {
  return (
    <section role="region" aria-label="Ordering" className="p-4 w-full h-full">
      <h2 className="font-semibold text-lg mb-2">Ordering</h2>
      <input className="border rounded p-2 w-full" placeholder="Quick add..." />
    </section>
  );
};
