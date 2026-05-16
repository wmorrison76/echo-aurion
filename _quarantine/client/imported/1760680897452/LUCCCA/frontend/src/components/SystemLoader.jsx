import React from 'react';
import { LoadingProgress } from './LoadingProgress';

export function SystemLoader() {
  return (
    <div className="system-loader flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-2xl font-bold mb-4">LUCCCA Core System</h1>
      <LoadingProgress duration={3000} />
    </div>
  );
}
