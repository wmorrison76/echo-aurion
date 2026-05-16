import { useState, useEffect } from 'react';

export const usePerfMode = () => {
  const [perfMode, setPerfMode] = useState('full');
  useEffect(() => {
    const lowPerf = navigator.deviceMemory && navigator.deviceMemory < 4;
    setPerfMode(lowPerf ? 'light' : 'full');
  }, []);
  return { perfMode };
};