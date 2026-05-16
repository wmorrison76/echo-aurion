import React, { useState } from "react";

export default function KitchenLibraryTabs() {
  const [activeTab, setActiveTab] = useState("recipes");

  const tabs = [
    "Recipes",
    "Recipe Input",
    "Ingredients",
    "Inventory",
    "Invoices",
    "Menu Builder",
    "Server Notes"
  ];

  return (
    <div className="kitchen-library-tabs p-4">
      <div className="flex space-x-4 border-b mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={\`py-2 px-4 \${activeTab === tab ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-400 hover:text-blue-300"}\`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="tab-content text-white bg-gray-900 p-4 rounded-lg shadow-inner">
        Currently viewing: <strong>{activeTab}</strong> (Mock content)
      </div>
    </div>
  );
}