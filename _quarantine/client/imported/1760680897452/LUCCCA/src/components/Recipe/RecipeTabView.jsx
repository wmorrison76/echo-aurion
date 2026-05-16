
// File: components/Recipe/RecipeTabView.jsx
import React from 'react';
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const tabs = [
  'Recipe List',
  'Add Recipe',
  'Scale Recipe',
  'Cost Breakdown',
  'Allergens',
  'Gallery',
  'Prep Sheet',
  'Labeling',
  'Notes'
];

const RecipeTabView = ({ category }) => {
  return (
    <>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab} value={tab}>
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab} value={tab}>
          <div className="mt-4 p-2 border rounded bg-white shadow-sm">
            <h2 className="font-semibold text-lg">{tab} – {category}</h2>
            <p className="text-sm text-gray-500 italic">[Placeholder content for {tab}]</p>
          </div>
        </TabsContent>
      ))}
    </>
  );
};

export default RecipeTabView;

