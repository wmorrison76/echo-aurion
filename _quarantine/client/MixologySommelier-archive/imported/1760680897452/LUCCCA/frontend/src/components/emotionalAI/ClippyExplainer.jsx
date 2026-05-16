// File: src/components/EchoCore/components/emotionalAI/ClippyExplainer.jsx
import React from 'react';

const ClippyExplainer = ({ showExplanation, onToggle }) => {
  return (
    <div className="mt-4 text-sm text-gray-600">
      <button
        onClick={onToggle}
        className="text-blue-500 underline mb-2"
      >
        {showExplanation ? 'Hide' : 'Explain'} this suggestion
      </button>
      {showExplanation && (
        <p>
          Echo uses contextual cues from your interactions to tailor responses.
          This includes text sentiment, past entries, and current dashboard state.
        </p>
      )}
    </div>
  );
};

export default ClippyExplainer;
