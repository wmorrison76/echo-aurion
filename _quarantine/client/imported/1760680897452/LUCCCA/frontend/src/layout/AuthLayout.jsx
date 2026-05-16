import React from 'react';

export function AuthLayout({ children }) {
  return (
    <div className="auth-layout flex items-center justify-center min-h-screen bg-gray-900 text-white">
      {children}
    </div>
  );
}
