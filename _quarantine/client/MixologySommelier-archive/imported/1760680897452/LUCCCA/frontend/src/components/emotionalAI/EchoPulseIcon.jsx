// File: src/components/EchoCore/components/emotionalAI/EchoPulseIcon.jsx
import React from 'react';
import { useEchoContext } from '@/components/EchoCore/context';

const EchoPulseIcon = () => {
  const { sentiment } = useEchoContext();

  const pulseColor = {
    happy: 'green',
    sad: 'blue',
    angry: 'red',
    neutral: 'gray'
  }[sentiment] || 'gray';

  return (
    <div className={`w-4 h-4 rounded-full bg-${pulseColor}-500 animate-pulse`} title={`Sentiment: ${sentiment}`} />
  );
};

export default EchoPulseIcon;