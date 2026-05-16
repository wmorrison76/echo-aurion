// File: useEmotionAnalysis.js
import { useState, useEffect } from "react";

export default function useEmotionAnalysis({ transcriptLog = "", voiceTone = "", userId = "guest" }) {
  const [emotion, setEmotion] = useState("neutral");
  const [riskLevel, setRiskLevel] = useState("low");
  const [cue, setCue] = useState(null);

  useEffect(() => {
    const lowered = transcriptLog.toLowerCase();

    const cues = [
      { phrase: "i'm fine", emotion: "suppressing", risk: "medium" },
      { phrase: "whatever", emotion: "disengaged", risk: "medium" },
      { phrase: "it's nothing", emotion: "bottling", risk: "medium" },
      { phrase: "i just need sleep", emotion: "fatigued", risk: "medium" },
      { phrase: "no one cares", emotion: "isolated", risk: "high" },
      { phrase: "i'm good", emotion: "denial", risk: "medium" }
    ];

    const match = cues.find(c => lowered.includes(c.phrase));

    if (match) {
      setEmotion(match.emotion);
      setRiskLevel(match.risk);
      setCue(match.phrase);
    } else {
      setEmotion("neutral");
      setRiskLevel("low");
      setCue(null);
    }
  }, [transcriptLog]);

  return { emotion, riskLevel, cue };
}
