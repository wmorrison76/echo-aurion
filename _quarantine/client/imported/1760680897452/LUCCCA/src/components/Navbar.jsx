import React from 'react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  return (
    <nav className="navbar bg-gray-800 text-white p-4 flex items-center justify-between">
      <Logo />
      <ul className="flex gap-4 items-center">
        <li>Dashboard</li>
        <li>Echo AI</li>
        <li>Settings</li>
        <ThemeToggle />
      </ul>
    </nav>
  );
}
