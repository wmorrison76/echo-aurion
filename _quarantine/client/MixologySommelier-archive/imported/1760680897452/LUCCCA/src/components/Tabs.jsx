import React, { useState } from 'react';

export function Tabs({ tabs = [] }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="tabs">
      <div className="tab-buttons flex gap-2 mb-4">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`py-2 px-4 rounded ${
              activeTab === index ? 'bg-blue-600 text-white' : 'bg-gray-300'
            }`}
            onClick={() => setActiveTab(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">{tabs[activeTab]?.content}</div>
    </div>
  );
}
