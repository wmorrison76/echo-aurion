// File: src/components/EchoCore/components/interaction/EchoCommandPanel.jsx
import React from 'react';
import UIActionButton from './UIActionButton';

const EchoCommandPanel = ({ onVoice, onSpeak, onClear }) => {
  return (
    <div className="flex gap-3">
      <UIActionButton label="Voice Input" onClick={onVoice} />
      <UIActionButton label="Speak Output" onClick={onSpeak} />
      <UIActionButton label="Clear" onClick={onClear} />
    </div>
  );
};

export default EchoCommandPanel;