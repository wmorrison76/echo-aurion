// File: components/KitchenLibrary/RecipeInputPage.jsx

import React, { useState, useEffect } from 'react';
import RightSidebar from './RightSidebar'; // Placeholder, will build next
import { FiSave, FiImage, FiSettings } from 'react-icons/fi';
import { GiWeight, GiNotebook } from 'react-icons/gi';
import { MdOutlineCurrencyExchange } from 'react-icons/md';
import { TbArrowsExchange } from 'react-icons/tb';
import './RecipeInputPage.css'; // For optional typewriter animation

const RecipeInputPage = () => {
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState([
    { qty: '', unit: '', item: '', prep: '', yield: '', cost: '' },
  ]);
  const [directions, setDirections] = useState(['']);
  const [autoSaveMessage, setAutoSaveMessage] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (recipeName) {
        setAutoSaveMessage('Auto-saving...');
        setTimeout(() => setAutoSaveMessage(''), 2000);
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [recipeName, ingredients, directions]);

  const handleIngredientChange = (index, field, value) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);

    // Add new line if editing last row
    if (index === ingredients.length - 1 && value !== '') {
      setIngredients([...updated, { qty: '', unit: '', item: '', prep: '', yield: '', cost: '' }]);
    }
  };

  const handleDirectionChange = (index, value) => {
    const updated = [...directions];
    updated[index] = value;
    setDirections(updated);
    if (index === directions.length - 1 && value.trim() !== '') {
      setDirections([...updated, '']);
    }
  };

  return (
    <div className="flex w-full h-full">
      <div className="w-3/4 p-6 space-y-6 overflow-y-auto">
        {/* Top Bar */}
        <div className="flex items-start justify-between gap-4">
          <div className="w-1/2 border border-black p-2 rounded-md">
            <input
              type="text"
              maxLength={50}
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="RECIPE NAME"
              className="w-full text-lg font-bold uppercase bg-transparent focus:outline-none placeholder-gray-400"
            />
          </div>
          <div className="flex flex-col items-start space-y-2">
            <div className="bg-red-100 border border-black text-red-800 text-xs px-3 py-1 rounded-full">
              ALLERGENS
            </div>
            <div className="text-sm">
              <span className="font-bold">FULL:</span> $15.00 &nbsp;&nbsp;
              <span className="font-bold">PORTION:</span> 6 &nbsp;&nbsp;
              <span className="font-bold">UNIT:</span> OZ
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <GiWeight title="Baker's Yield" className="text-xl cursor-pointer" />
            <GiNotebook title="R&D Mode" className="text-xl cursor-pointer" />
            <TbArrowsExchange title="Convert Units" className="text-xl cursor-pointer" />
            <FiImage title="Add Image" className="text-xl cursor-pointer" />
            <MdOutlineCurrencyExchange title="Currency" className="text-xl cursor-pointer" />
          </div>
        </div>

        {/* Modifier Strip */}
        <div className="flex justify-between items-center mt-2 border-b border-gray-300 pb-2">
          <div className="text-sm text-gray-600">[MODIFIERS ADDED HERE]</div>
          <div className="w-16 h-16 bg-gray-100 border rounded-md flex items-center justify-center">
            <span className="text-xs text-gray-400">Image</span>
          </div>
        </div>

        {/* Ingredient Grid */}
        <div>
          <h3 className="font-bold text-lg mt-4">INGREDIENTS</h3>
          <div className="space-y-2 mt-2">
            {ingredients.map((line, index) => (
              <div key={index} className="grid grid-cols-6 gap-2">
                <input className="border p-1 rounded text-sm" placeholder="QTY" value={line.qty}
                  onChange={(e) => handleIngredientChange(index, 'qty', e.target.value)} />
                <input className="border p-1 rounded text-sm" placeholder="UNIT" value={line.unit}
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)} />
                <input className="border p-1 rounded text-sm col-span-2" placeholder="ITEM" value={line.item}
                  onChange={(e) => handleIngredientChange(index, 'item', e.target.value)} />
                <input className="border p-1 rounded text-sm" placeholder="PREP" value={line.prep}
                  onChange={(e) => handleIngredientChange(index, 'prep', e.target.value)} />
                <input className="border p-1 rounded text-sm" placeholder="YIELD %" value={line.yield}
                  onChange={(e) => handleIngredientChange(index, 'yield', e.target.value)} />
                <input className="border p-1 rounded text-sm" placeholder="COST" value={line.cost}
                  onChange={(e) => handleIngredientChange(index, 'cost', e.target.value)} />
              </div>
            ))}
            <button className="text-xs text-blue-600 hover:underline mt-1">
              + Add Ingredient
            </button>
          </div>
        </div>

        {/* Directions */}
        <div className="mt-8">
          <h3 className="font-bold text-lg mb-2">DIRECTIONS</h3>
          {directions.map((step, index) => (
            <textarea
              key={index}
              className="w-full border p-2 rounded mb-2 text-sm"
              rows={2}
              value={step}
              onChange={(e) => handleDirectionChange(index, e.target.value)}
              placeholder={`${index + 1}. `}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-black">
            <FiSave className="text-xl" />
            Save
          </button>
          <button className="text-xs border border-gray-400 px-3 py-1 rounded hover:bg-gray-100">
            Generate Nutrition Label
          </button>
        </div>
        {autoSaveMessage && (
          <div className="typewriter mt-2 text-green-600 font-semibold text-sm">
            {autoSaveMessage}
          </div>
        )}
      </div>

      {/* Sidebar (Placeholder) */}
      <RightSidebar />
    </div>
  );
};

export default RecipeInputPage;
