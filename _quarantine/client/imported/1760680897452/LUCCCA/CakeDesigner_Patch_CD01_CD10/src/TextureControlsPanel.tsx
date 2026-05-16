/**
 * LUCCCA | CD-03 (PATCH V1)
 * Accessible slider UI for texture intensity.
 */
import React, { useState } from 'react';
import { clampPrecision } from './precisionUtils';

interface Props {
  onIntensityChange: (v: number) => void;
  defaultValue?: number;
}

export const TextureControlsPanel: React.FC<Props> = ({ onIntensityChange, defaultValue = 0.5 }) => {
  const [intensity, setIntensity] = useState(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = clampPrecision(parseFloat(e.target.value));
    setIntensity(value);
    onIntensityChange(value);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <label className="block mb-2 font-semibold" htmlFor="texture-intensity">
        Texture Intensity
      </label>
      <input
        id="texture-intensity"
        aria-label="Texture Intensity"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={intensity}
        onChange={handleChange}
        className="w-full"
      />
      <span className="text-xs text-gray-600">Current: {intensity.toFixed(5)}</span>
    </div>
  );
};
