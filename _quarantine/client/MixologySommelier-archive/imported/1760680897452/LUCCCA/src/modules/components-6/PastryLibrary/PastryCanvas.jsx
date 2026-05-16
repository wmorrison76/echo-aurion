// src/components/PastryLibrary/PastryCanvas.jsx
import React, { useState } from 'react';
import TabsHeader from './TabsHeader';
import StructuralGuide from './StructuralGuide';
import DesignUpload from './DesignUpload';

const tabLabels = [
  'Design Upload',
  'Structural Guide',
];

export default function PastryCanvas() {
  const [activeTab, setActiveTab] = useState(tabLabels[0]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Design Upload':
        return <DesignUpload />;
      case 'Structural Guide':
        return <StructuralGuide tiers={3} />; // You can dynamically change this
      default:
        return <div className="p-6 text-gray-500">Choose a tool from above.</div>;
    }
  };

  return (
    <div className="w-full h-full px-4 py-6 bg-gradient-to-br from-pink-50 via-white to-rose-100 rounded shadow-inner border">
      <h1 className="text-3xl font-bold text-center text-rose-700 mb-6">🍰 EchoCanvas: Pastry Designer</h1>
      <TabsHeader tabs={tabLabels} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-6">{renderTabContent()}</div>
    </div>
  );
}
