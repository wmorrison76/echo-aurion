import React from 'react';
import { Link } from 'react-router-dom';

export function PastryRightSidebar() {
  return (
    <aside className="pastry-right-sidebar fixed right-0 top-0 w-64 h-full bg-pink-100 dark:bg-zinc-800 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Pastry Recipes</h2>
      <ul className="flex flex-col gap-2">
        <li><Link to="/pastry-library">Pastry Library</Link></li>
        <li><Link to="/cake-designer-form">Cake Designer</Link></li>
      </ul>
      <div className="mt-4">
        <h3 className="text-sm font-bold">Recipe Visibility</h3>
        <ul>
          <li>Pastry Only</li>
          <li>Outlet</li>
          <li>Global</li>
        </ul>
      </div>
    </aside>
  );
}
