import React, { useState, useEffect } from 'react';
import { ProgressBar } from './ProgressBar';

export function LoadingProgress({ duration = 3000 }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const percent = Math.min((elapsed / duration) * 100, 100);
      setProgress(percent);
      if (percent === 100) clearInterval(interval);
    }, 100);

    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className="loading-progress">
      <ProgressBar value={progress} />
      <p>{Math.round(progress)}% Loading...</p>
    </div>
  );
}
