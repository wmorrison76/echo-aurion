// CustomBackground.jsx
import React, { useState } from "react";

const CustomBackground = ({ onChange }) => {
  const [background, setBackground] = useState("");

  const handleInputChange = (e) => {
    const value = e.target.value;
    setBackground(value);
    onChange(value);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Custom Background (URL):
      </label>
      <input
        type="text"
        value={background}
        onChange={handleInputChange}
        placeholder="Enter image URL..."
        className="border border-gray-300 p-2 rounded w-full text-sm"
      />
    </div>
  );
};

export default CustomBackground;
