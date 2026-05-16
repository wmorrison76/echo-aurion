
/**
 * LUCCCA | SEG-A-WB-12
 * Docking hook with simple overlay states.
 */
import { useState } from 'react';

export type DockZone = 'left' | 'right' | 'top' | 'bottom' | 'center';

export const useDocking = () => {
  const [activeZone, setActiveZone] = useState<DockZone | null>(null);

  const onDragOver = (e: React.DragEvent, zone: DockZone) => {
    e.preventDefault();
    setActiveZone(zone);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    // emit event on bus here
    setActiveZone(null);
    return data;
  };

  return { activeZone, onDragOver, onDrop };
};
