// File: src/components/EchoCore/components/emotionalAI/AIStatusIndicator.jsx
import React from 'react';
import { useEchoContext } from '@/components/EchoCore/context';

const AIStatusIndicator = () => {
  const { status } = useEchoContext();

  const statusColor = {
    idle: 'gray',
    listening: 'green',
    reflecting: 'blue'
  }[status] || 'gray';

  return (
    <div className={`w-3 h-3 rounded-full bg-${statusColor}-500`} title={`Echo is ${status}`} />
  );
};

export default AIStatusIndicator;

// File: src/components/EchoCore/components/emotionalAI/ChefMoodTracker.jsx
import React from 'react';
import EmotionLog from './EmotionLog';

const ChefMoodTracker = ({ moodHistory }) => {
  return (
    <div className="p-4 bg-white shadow rounded">
      <h2 className="text-xl font-semibold mb-2">Chef Mood Tracker</h2>
      <EmotionLog moodData={moodHistory} />
    </div>
  );
};

export default ChefMoodTracker;