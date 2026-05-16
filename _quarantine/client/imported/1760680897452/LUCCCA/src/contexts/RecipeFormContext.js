// /src/context/RecipeFormContext.js
import React, { createContext, useState } from "react";

export const RecipeFormContext = createContext();

export const RecipeFormProvider = ({ children }) => {
  const [unitSystem, setUnitSystem] = useState("metric"); // "us" or "metric"
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedCuisines, setSelectedCuisines] = useState([]);

  const toggleUnitSystem = () => {
    setUnitSystem(prev => (prev === "metric" ? "us" : "metric"));
  };

  const updateCategories = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const updateCuisines = (cuisine) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : prev.length < 2
        ? [...prev, cuisine]
        : prev
    );
  };

  return (
    <RecipeFormContext.Provider
      value={{
        unitSystem,
        toggleUnitSystem,
        selectedCategories,
        updateCategories,
        selectedCuisines,
        updateCuisines
      }}
    >
      {children}
    </RecipeFormContext.Provider>
  );
};
