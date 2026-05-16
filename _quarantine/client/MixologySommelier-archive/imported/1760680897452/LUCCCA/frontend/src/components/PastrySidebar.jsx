import React from 'react';
import { Link } from 'react-router-dom';

export function PastrySidebar() {
  return (
    <nav className="pastry-sidebar bg-pink-100 dark:bg-zinc-800 p-4">
      <ul className="flex flex-col gap-2">
        <li><Link to="/pastry">Pastry Overview</Link></li>
        <li><Link to="/cake-designer">Cake Designer</Link></li>
      </ul>
    </nav>
  );
}
