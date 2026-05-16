/**
 * LUCCCA | CD-10
 * MiniPreviewViewport: a small viewport (picture-in-picture) to show the cake rotating while user edits.
 */
import React from 'react';

type Props = {
  isVisible: boolean;
  onToggle: () => void;
};

export const MiniPreviewViewport: React.FC<Props> = ({ isVisible, onToggle }) => {
  return (
    <div className="fixed bottom-4 right-4">
      <button
        onClick={onToggle}
        className="mb-2 px-2 py-1 bg-gray-700 text-white rounded"
      >
        {isVisible ? 'Hide' : 'Show'} PiP Preview
      </button>
      {isVisible && (
        <div className="w-64 h-40 bg-black/80 rounded overflow-hidden shadow-lg">
          {/* mount WebGL canvas / react-three-fiber Canvas here */}
          <div className="text-white text-center pt-16 opacity-50">
            3D Preview
          </div>
        </div>
      )}
    </div>
  );
};
