// File: src/components/EchoCore/hooks/useEmotionAnalysis.js

import { useEffect, useState } from "react";

/**
 * Custom hook to analyze emotional sentiment of user input or text.
 * Can be used to detect tone (e.g., frustration, joy, stress) in chef/user typing.
 * Useful for triggering Echo's emotional awareness responses.
 *
 * @param {string} input - Text input to analyze
 * @returns {{ emotion: string, score: number, loading: boolean }}
 */
const useEmotionAnalysis = (input) => {
  const [emotion, setEmotion] = useState("neutral");
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input) {
      setEmotion("neutral");
      setScore(0);
      return;
    }

    setLoading(true);

    // Simulated emotion scoring logic — replace with AI model or API as needed
    const analyze = () => {
      const lowered = input.toLowerCase();

      if (lowered.includes("stress") || lowered.includes("help")) {
        return { emotion: "stress", score: 0.8 };
      }
      if (lowered.includes("happy") || lowered.includes("excited")) {
        return { emotion: "joy", score: 0.9 };
      }
      if (lowered.includes("angry") || lowered.includes("frustrated")) {
        return { emotion: "anger", score: 0.85 };
      }
      if (lowered.includes("tired") || lowered.includes("burnt out")) {
        return { emotion: "fatigue", score: 0.75 };
      }

      return { emotion: "neutral", score: 0.2 };
    };

    const result = analyze();
    setEmotion(result.emotion);
    setScore(result.score);
    setLoading(false);
  }, [input]);

  return { emotion, score, loading };
};

export default useEmotionAnalysis;
