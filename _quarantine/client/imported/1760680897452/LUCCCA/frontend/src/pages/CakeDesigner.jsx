import React from 'react';
import { Tabs } from '../components/Tabs';

export default function CakeDesigner() {
  const tabs = [
    { label: 'Base Layers', content: <p>Choose Cake Size and Flavor</p> },
    { label: 'Fillings', content: <p>Select Fillings</p> },
    { label: 'Crumb Coat', content: <p>Apply Crumb Layer</p> },
    { label: 'Final Coating', content: <p>Choose Fondant or Buttercream</p> },
    { label: 'Supports', content: <p>Calculate Internal Supports</p> },
    { label: 'Decorations', content: <p>Design Cake Decorations</p> },
    { label: 'Summary', content: <p>Pricing, Weight, Final Review</p> },
  ];

  return (
    <div className="cake-designer-page">
      <h1 className="text-2xl font-bold mb-4">Cake Designer</h1>
      <Tabs tabs={tabs} />
    </div>
  );
}
