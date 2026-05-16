// src/components/NewRecipeButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const NewRecipeButton = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/new-recipe");
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
    >
      + New Recipe
    </button>
  );
};

export default NewRecipeButton;
