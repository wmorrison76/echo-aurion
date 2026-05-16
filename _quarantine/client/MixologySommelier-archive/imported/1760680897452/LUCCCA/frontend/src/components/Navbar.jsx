import React from 'react';
import { Logo } from './Logo';

export function Navbar() {
  return (
    <nav className="navbar bg-gray-800 text-white p-4 flex items-center justify-between">
      <Logo />
      <ul className="flex gap-4">
        <li>Dashboard</li>
        <li>Echo AI</li>
        <li>Settings</li>
      </ul>
    </nav>
  );
}
