import React from 'react';
import { Link } from 'react-router-dom';

export default function PastryAdminDashboard() {
  return (
    <div className="pastry-admin-dashboard-page">
      <h1 className="text-2xl font-bold mb-4">Pastry Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/pastry-library" className="p-4 bg-pink-100 dark:bg-zinc-800 rounded shadow text-center">
          Pastry Library
        </Link>
        <Link to="/pastry-recipe-form" className="p-4 bg-pink-100 dark:bg-zinc-800 rounded shadow text-center">
          Add New Recipe
        </Link>
        <Link to="/cake-designer-form" className="p-4 bg-pink-100 dark:bg-zinc-800 rounded shadow text-center">
          Cake Designer
        </Link>
      </div>
    </div>
  );
}
