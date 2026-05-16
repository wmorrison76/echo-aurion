import React, { useState } from "react";
import KitchenTabs from "./KitchenTabs";
import RecipeListTab from "../../../components/Recipe/RecipeListView";
import AddRecipeTab from "./AddRecipeTab";
import RightSidebar from "./RightSidebar";






export default function KitchenLibrary() {
  const [activeTab, setActiveTab] = useState("recipes");

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-y-auto">
        <KitchenTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        {activeTab === "recipes" && <RecipeListTab />}
        {activeTab === "add" && <AddRecipeTab />}
      </div>
      {activeTab === "add" && (
        <div className="w-96 border-l border-gray-300 bg-white">
          <RightSidebar />
        </div>
      )}
    </div>
  );
}
