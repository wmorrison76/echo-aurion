
/**
 * LUCCCA | SEG-A-WB-03 (Patch: buttery RAF-resize)
 */
import React, { useRef } from 'react';
import { windowManager } from '../../state/windowManager';

export const Pane: React.FC<{ id: string }> = ({ id, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} role="dialog" aria-label={id} className="absolute bg-white dark:bg-gray-800 rounded shadow">
      {children}
    </div>
  );
};
