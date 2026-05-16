import React, { useState } from 'react';
import { PastryRightSidebar } from './PastryRightSidebar';

export function PastryRightSidebarToggle() {
  const [open, setOpen] = useState(true);

  return (
    <>
      {open && <PastryRightSidebar />}
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-2 top-2 p-2 bg-pink-600 text-white rounded z-50"
      >
        {open ? 'Hide' : 'Show'} Pastry Sidebar
      </button>
    </>
  );
}
