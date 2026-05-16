/**
 * LUCCCA | CD-05
 * Toggle between 2D and 3D preview modes.
 */
import React, { useState } from 'react';

export const PreviewToggle = () => {
  const [is3D, setIs3D] = useState(false);

  return (
    <button
      onClick={() => setIs3D(!is3D)}
      className="px-4 py-2 bg-blue-500 text-white rounded-lg"
    >
      {is3D ? 'Switch to 2D' : 'Switch to 3D'}
    </button>
  );
};
