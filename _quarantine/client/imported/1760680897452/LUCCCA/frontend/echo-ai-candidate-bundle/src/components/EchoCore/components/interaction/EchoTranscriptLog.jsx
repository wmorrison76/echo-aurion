// File: src/components/EchoCore/components/interaction/EchoTranscriptLog.jsx
import React from 'react';

const EchoTranscriptLog = ({ transcripts = [] }) => {
  return (
    <div className="mt-4 p-4 border bg-white rounded shadow">
      <h3 className="text-sm font-semibold mb-2">Voice Transcripts</h3>
      <ul className="text-xs text-gray-700 space-y-1 max-h-32 overflow-y-auto">
        {transcripts.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
};

export default EchoTranscriptLog;