// File: src/components/EchoCore/components/interaction/EchoResponseBlock.jsx
import React from 'react';
import EchoAnimator from './EchoAnimator';

const EchoResponseBlock = ({ response }) => {
  if (!response) return null;
  return (
    <EchoAnimator>
      <div className="p-4 bg-gray-50 border rounded">
        <h4 className="font-bold text-gray-700">Echo's Response</h4>
        <p className="text-sm mt-2">{response}</p>
      </div>
    </EchoAnimator>
  );
};

export default EchoResponseBlock;