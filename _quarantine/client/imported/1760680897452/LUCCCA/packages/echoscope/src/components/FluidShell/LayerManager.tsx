
/**
 * LUCCCA | SEG-A-WB-11
 * z-index stack manager, focus cycling.
 */
import React, { useRef } from 'react';

export const LayerManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stackRef = useRef<number>(100);
  return <div data-layer-root style={{ position: 'relative', zIndex: stackRef.current }}>{children}</div>;
};
