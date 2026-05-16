// File: src/components/EchoCore/components/emotionalAI/EmotionLog.jsx
import React from "react";
import { useEchoCore } from "@/context/EchoCoreContext";
import { decryptData } from '@/components/EchoCore/utils/encryption';

const EmotionLog = ({ moodData }) => {
  return (
    <ul className="text-sm text-gray-700">
      {moodData.map((entry, i) => (
        <li key={i} className="mb-1">
          <strong>{entry.timestamp}:</strong> {decryptData(entry.mood)}
        </li>
      ))}
    </ul>
  );
};
const EmotionLog = () => {
  const { emotionLog } = useEchoCore();

  if (!emotionLog.length) {
    return (
      <div className="text-sm text-gray-400 italic">
        No emotional data recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-4 bg-white dark:bg-gray-900 shadow">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
        Emotional State Changes
      </h3>
      {emotionLog.map((entry, idx) => (
        <div
          key={idx}
          className="flex justify-between text-xs text-gray-600 dark:text-gray-300"
        >
          <span>
            <strong>Score:</strong> {entry.score.toFixed(2)}
          </span>
          <span>{new Date(entry.at).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
};

export default EmotionLog;
