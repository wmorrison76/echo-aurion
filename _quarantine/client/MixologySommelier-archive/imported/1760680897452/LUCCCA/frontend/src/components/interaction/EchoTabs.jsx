// File: src/components/EchoCore/components/interaction/EchoTabs.jsx

import React, { useState } from "react";

const EchoTabs = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div>
      <div className="flex border-b border-gray-300 dark:border-gray-700 mb-4">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors duration-300 ${
              activeTab === idx
                ? "border-cyan-600 text-cyan-600"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs[activeTab]?.content}</div>
    </div>
  );
};

export default EchoTabs;
