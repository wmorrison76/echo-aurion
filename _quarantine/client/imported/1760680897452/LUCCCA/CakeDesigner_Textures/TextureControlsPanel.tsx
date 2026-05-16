/**
 * LUCCCA | CD-03
 * UI sliders for controlling texture intensity.
 */
import React, { useState } from 'react';

export const TextureControlsPanel = ({ onIntensityChange }) => {
  const [intensity, setIntensity] = useState(0.5);

  const handleChange = (e) => {
    const value = parseFloat(e.target.value);
    setIntensity(value);
    onIntensityChange(value);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <label className="block mb-2 font-semibold">Texture Intensity</label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={intensity}
        onChange={handleChange}
        className="w-full"
      />
    </div>
  );
};
