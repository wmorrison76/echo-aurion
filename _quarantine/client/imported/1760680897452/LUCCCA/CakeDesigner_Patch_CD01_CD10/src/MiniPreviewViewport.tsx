/**
 * LUCCCA | CD-10 (PATCH V1)
 */
import React from 'react';

type Props = {
  isVisible: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
};

export const MiniPreviewViewport: React.FC<Props> = ({ isVisible, onToggle, children }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={onToggle}
        className="mb-2 px-2 py-1 bg-gray-700 text-white rounded"
      >
        {isVisible ? 'Hide' : 'Show'} PiP Preview
      </button>
      {isVisible && (
        <div className="w-64 h-40 bg-black/80 rounded overflow-hidden shadow-lg">
          {children ?? <div className="text-white text-center pt-16 opacity-50">3D Preview</div>}
        </div>
      )}
    </div>
  );
};
