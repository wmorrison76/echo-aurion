import { useEffect, useState, useCallback } from "react";
import {
  getEchoAIOrbService,
  type MoodState,
} from "@/services/EchoAIOrbService";
import { getEchoAIMoodAnalyzer } from "@/services/EchoAIMoodAnalyzer";

export interface UseEchoAIMoodOptions {
  enableAIAnalysis?: boolean; // Enable GPT-4 mood analysis
  analysisInterval?: number; // How often to run AI analysis (ms)
}

/**
 * Hook for interacting with EchoAI mood system
 */
export function useEchoAIMood(options: UseEchoAIMoodOptions = {}) {
  const { enableAIAnalysis = false, analysisInterval = 30000 } = options;
  const orbService = getEchoAIOrbService();
  const [moodState, setMoodState] = useState<MoodState>(
    orbService.getMoodState(),
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Subscribe to mood changes
  useEffect(() => {
    const unsubscribe = orbService.onMoodChange(setMoodState);
    return () => unsubscribe();
  }, [orbService]);

  // Optional: Enable AI mood analysis
  useEffect(() => {
    if (!enableAIAnalysis) return;

    const moodAnalyzer = getEchoAIMoodAnalyzer();
    let analysisTimer: NodeJS.Timer;

    const runAnalysis = async () => {
      try {
        setIsAnalyzing(true);
        const currentState = orbService.getMoodState();

        const result = await moodAnalyzer.analyzeMood({
          workloadLevel: currentState.workloadLevel,
          currentMood: currentState.current,
          errorRate: 0.05, // Could be tracked from metrics
          requestCount: 0, // Could be tracked from metrics
          activeUsers: 0, // Could be tracked from metrics
          systemUptime: performance.now(),
          timestamp: Date.now(),
        });

        // If AI suggests a different mood with high confidence, apply it
        if (
          result.confidence > 0.7 &&
          result.suggestedMood !== currentState.current
        ) {
          orbService.setMoodOverride(result.suggestedMood);
        }
      } catch (error) {
        console.error("Mood analysis error:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Run initial analysis immediately
    runAnalysis();

    // Set up periodic analysis
    analysisTimer = setInterval(runAnalysis, analysisInterval);

    return () => clearInterval(analysisTimer);
  }, [enableAIAnalysis, analysisInterval, orbService]);

  // Get current workload percentage
  const getWorkloadPercentage = useCallback(() => {
    return Math.round(moodState.workloadLevel * 100);
  }, [moodState.workloadLevel]);

  // Get mood display name
  const getMoodDisplayName = useCallback(() => {
    const names: Record<string, string> = {
      idle: "Idle",
      thinking: "Thinking",
      focused: "Focused",
      creative: "Creative",
      excited: "Excited",
      stressed: "Stressed",
      calm: "Calm",
    };
    return names[moodState.current] || moodState.current;
  }, [moodState.current]);

  // Force mood override
  const setMood = useCallback(
    (mood: typeof moodState.current) => {
      orbService.setMoodOverride(mood);
    },
    [orbService],
  );

  // Start the service
  const startMonitoring = useCallback(() => {
    orbService.start();
  }, [orbService]);

  // Stop the service
  const stopMonitoring = useCallback(() => {
    orbService.stop();
  }, [orbService]);

  return {
    // State
    moodState,
    isAnalyzing,

    // Display info
    mood: moodState.current,
    workloadPercentage: getWorkloadPercentage(),
    moodDisplayName: getMoodDisplayName(),
    transitionProgress: moodState.transitionProgress,
    confidenceLevel: moodState.confidenceLevel,

    // Controls
    setMood,
    startMonitoring,
    stopMonitoring,
  };
}

export default useEchoAIMood;
