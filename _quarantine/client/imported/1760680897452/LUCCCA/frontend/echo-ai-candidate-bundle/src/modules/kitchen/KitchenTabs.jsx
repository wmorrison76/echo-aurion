import React, { useState } from "react";
import RecipeIndexPage from "@/modules/kitchen/RecipeIndexPage";
import RecipeInputPage from "@/modules/kitchen/RecipeInputPage";
import RightSidebar from "./RightSidebar";

// ✅ Use only objects with label + optional component
const tabs = [
  { label: "Recipes", component: <RecipeIndexPage /> },
  { label: "Recipe Input", component: (
    <div className="flex w-full h-full">
      <div className="flex-grow overflow-y-auto">
        <RecipeInputPage />
      </div>
      <RightSidebar />
    </div>
  )},
  { label: "Ingredients", component: <div>Ingredients content here</div> },
  { label: "Inventory", component: <div>Inventory content here</div> },
  { label: "Invoices", component: <div>Invoices content here</div> },
  { label: "Menu Builder", component: <div>Menu Builder content here</div> },
  { label: "Server Notes", component: <div>Server Notes content here</div> },
];

export default function KitchenTabs() {
  const [activeTab, setActiveTab] = useState(tabs[0].label);

  const currentTab = tabs.find(tab => tab.label === activeTab);

  return (
    <div className="w-full h-full overflow-hidden">
      {/* Tab Column */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex border-b mb-4 space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`text-sm px-4 py-2 rounded-t-md font-semibold ${
                activeTab === tab.label
                  ? "bg-white border border-b-transparent shadow"
                  : "bg-pink-100 text-pink-600 border border-transparent hover:bg-pink-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel Logic */}
        {currentTab?.component}
      </div>
    </div>
  );
}
