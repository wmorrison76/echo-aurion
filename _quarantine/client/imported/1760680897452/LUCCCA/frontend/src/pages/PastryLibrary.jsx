import React from 'react';
import { Tabs } from '../components/Tabs';

export default function PastryLibrary() {
  const tabs = [
    { label: 'Base Recipes', content: <p>Core Pastry Recipes</p> },
    { label: 'Flavor Variations', content: <p>Linked Variations</p> },
    { label: 'Inventory Links', content: <p>Connect Recipes to Inventory</p> },
  ];

  return (
    <div className="pastry-library-page">
      <h1 className="text-2xl font-bold mb-4">Pastry Recipe Library</h1>
      <Tabs tabs={tabs} />
    </div>
  );
}
