// File: src/components/EchoCore/components/interaction/EchoVoiceInput.jsx
import React, { useState } from 'react';

const EchoVoiceInput = ({ onTranscribe }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const handleStartListening = () => {
    setIsListening(true);
    // Mock transcription logic
    setTimeout(() => {
      const mock = 'Echo captured your voice input.';
      setTranscript(mock);
      onTranscribe && onTranscribe(mock);
      setIsListening(false);
    }, 2000);
  };

  return (
    <div className="p-4 bg-gray-100 border rounded">
      <button
        onClick={handleStartListening}
        disabled={isListening}
        className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700"
      >
        {isListening ? 'Listening...' : 'Start Voice Input'}
      </button>
      {transcript && <p className="mt-2 text-sm text-gray-700">{transcript}</p>}
    </div>
  );
};

export default EchoVoiceInput;