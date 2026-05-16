import React from 'react';

export function LogoAnimated() {
  return (
    <div className="logo-animated text-center text-white">
      <h1 className="text-4xl font-bold">LUCCCA</h1>
      <p>Powered by Echo AI</p>
      <div className="loader mt-4">
        <div className="animate-pulse h-4 w-4 bg-blue-500 rounded-full mx-auto"></div>
      </div>
    </div>
  );
}
