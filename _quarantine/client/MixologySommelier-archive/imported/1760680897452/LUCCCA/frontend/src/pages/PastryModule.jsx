import React from 'react';
import { Tabs } from '../components/Tabs';

export default function PastryModule() {
  const tabs = [
    { label: 'Cakes', content: <p>Pastry Cake Library and Designer</p> },
    { label: 'Take a Slice', content: <p>Pre-made Pastry Items</p> },
    { label: 'Breads', content: <p>Bakery Bread Inventory</p> },
    { label: 'Pastry Settings', content: <p>Customize Pastry System</p> },
  ];

  return (
    <div className="pastry-module-page">
      <h1 className="text-2xl font-bold mb-4">Pastry & Baking Module</h1>
      <Tabs tabs={tabs} />
    </div>
  );
}
