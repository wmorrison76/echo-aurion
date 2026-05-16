// File: src/components/EchoCore/context/EchoCoreContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { encryptLog, decryptLog } from "../utils/encryption";

// [TEAM LOG: Context] - Global Echo AI presence + emotional state
const EchoCoreContext = createContext();

export function EchoCoreProvider({ children, userId }) {
  const [mood, setMood] = useState("neutral");
  const [listening, setListening] = useState(false);
  const [emotionLog, setEmotionLog] = useState([]);

  const logEmotion = (state) => {
    const entry = { timestamp: Date.now(), state };
    const updatedLog = [...emotionLog, entry];
    setEmotionLog(updatedLog);
    encryptLog(userId, updatedLog);
  };

  useEffect(() => {
    const saved = decryptLog(userId);
    if (saved) setEmotionLog(saved);
  }, [userId]);

  return (
    <EchoCoreContext.Provider value={{ mood, setMood, listening, setListening, emotionLog, logEmotion }}>
      {children}
    </EchoCoreContext.Provider>
  );
}

export const useEchoCore = () => useContext(EchoCoreContext);
