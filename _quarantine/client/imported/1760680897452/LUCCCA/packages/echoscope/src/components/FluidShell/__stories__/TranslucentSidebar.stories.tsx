
import React, { useState } from 'react';
import { TranslucentSidebar } from '../TranslucentSidebar';

export default {
  title: 'Whiteboard/TranslucentSidebar',
  component: TranslucentSidebar,
};

export const Default = () => {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}>Toggle</button>
      <TranslucentSidebar isOpen={open} onClose={() => setOpen(false)}>
        <div>Content</div>
      </TranslucentSidebar>
    </div>
  );
};
