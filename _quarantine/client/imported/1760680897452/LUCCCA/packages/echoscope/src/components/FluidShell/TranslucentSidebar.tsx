
/**
 * LUCCCA | SEG-A-WB-06
 * File: packages/echoscope/src/components/FluidShell/TranslucentSidebar.tsx
 * Created: 2025-07-27 by Seyth Prime
 */
import React from 'react';

type TranslucentSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
};

export const TranslucentSidebar: React.FC<TranslucentSidebarProps> = ({ isOpen, onClose, children }) => {
  return (
    <aside
      role="complementary"
      aria-hidden={!isOpen}
      className={
        `fixed top-0 left-0 h-full w-80 backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 
         transition-transform duration-200 will-change-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
      }
    >
      <button
        aria-label="Close sidebar"
        className="absolute top-2 right-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/10"
        onClick={onClose}
      >
        ✕
      </button>
      <div className="mt-12 p-4 overflow-y-auto h-full" tabIndex={0}>
        {children}
      </div>
    </aside>
  );
};
