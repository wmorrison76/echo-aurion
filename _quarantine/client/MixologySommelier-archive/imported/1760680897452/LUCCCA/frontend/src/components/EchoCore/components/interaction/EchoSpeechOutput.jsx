// File: src/components/EchoCore/components/interaction/EchoSpeechOutput.jsx
import React from 'react';

const EchoSpeechOutput = ({ message }) => {
  const handleSpeak = () => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(message);
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="p-4 bg-white border rounded shadow mt-4">
      <p className="text-sm mb-2">{message}</p>
      <button onClick={handleSpeak} className="px-3 py-1 bg-green-600 text-white rounded">
        Speak
      </button>
    </div>
  );
};

export default EchoSpeechOutput;