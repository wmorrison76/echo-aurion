import React from 'react';
import { PastryRightSidebarToggle } from '../components/PastryRightSidebarToggle';

export function PastryLayout({ children }) {
  return (
    <div className="flex">
      <PastryRightSidebarToggle />
      <main className="flex-1">{children}</main>
    </div>
  );
}
