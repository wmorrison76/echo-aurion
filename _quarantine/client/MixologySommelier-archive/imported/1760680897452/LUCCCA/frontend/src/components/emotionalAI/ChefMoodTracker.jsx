// File: src/components/EchoCore/components/emotionalAI/ChefMoodTracker.jsx
import React, { useMemo } from "react";
import { useEchoCore } from "@/context/EchoCoreContext";
import { getGradientFromSentiment } from "@/utils/echoStyling";

const ChefMoodTracker = () => {
  const { emotionLog } = useEchoCore();

  const avgSentiment = useMemo(() => {
    if (!emotionLog.length) return 0;
    const sum = emotionLog.reduce((acc, e) => acc + e.score, 0);
    return sum / emotionLog.length;
  }, [emotionLog]);

  return (
    <div className="p-4 rounded-lg shadow bg-white dark:bg-gray-900">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
        Chef Mood Tracker (Today)
      </h3>
      <div
        className={`h-4 rounded-full ${getGradientFromSentiment(avgSentiment)} transition-all duration-700`}
        style={{ width: `${(avgSentiment + 1) * 50}%` }}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Average Sentiment: {avgSentiment.toFixed(2)}
      </p>
    </div>
  );
};

export default ChefMoodTracker;