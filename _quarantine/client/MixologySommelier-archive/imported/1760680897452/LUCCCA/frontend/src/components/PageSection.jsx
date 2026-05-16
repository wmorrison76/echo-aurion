import React from 'react';

export function PageSection({ title, children }) {
  return (
    <section className="page-section mb-6">
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      {children}
    </section>
  );
}
