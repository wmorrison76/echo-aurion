// File: src/context/EchoCoreContext.jsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { encryptData, decryptData } from "@/utils/encryption";

const EchoCoreContext = createContext(null);

export const EchoCoreProvider = ({ children, userProfile }) => {
  // Sentiment and listening states
  const [sentimentScore, setSentimentScore] = useState(0);
  const [listeningState, setListeningState] = useState("idle");
  const [eli5Global, setEli5Global] = useState(false);

  // Emotion log with encryption
  const [emotionLog, setEmotionLog] = useState(() => {
    const stored = localStorage.getItem(`emotionLog_${userProfile?.username || "default"}`);
    return stored ? decryptData(stored) : [];
  });

  const lastActiveRef = useRef(Date.now());

  // Persist emotion log per user with encryption
  useEffect(() => {
    const key = `emotionLog_${userProfile?.username || "default"}`;
    localStorage.setItem(key, encryptData(emotionLog));
  }, [emotionLog, userProfile]);

  // Clear old data if username changes
  useEffect(() => {
    const existingUsers = Object.keys(localStorage).filter(k => k.startsWith("emotionLog_"));
    existingUsers.forEach(k => {
      if (userProfile && !k.endsWith(userProfile.username)) {
        localStorage.removeItem(k);
      }
    });
  }, [userProfile]);

  // Actions
  const updateSentiment = useCallback((score, meta = {}) => {
    setSentimentScore(score);
    setEmotionLog(prev => [
      ...prev,
      {
        at: new Date().toISOString(),
        score,
        meta,
        user: userProfile?.username || "default",
      },
    ]);
  }, [userProfile]);

  const updateListeningState = useCallback(state => setListeningState(state), []);
  const toggleELI5 = useCallback(value => setEli5Global(prev => (typeof value === "boolean" ? value : !prev)), []);
  const markActivity = useCallback(() => { lastActiveRef.current = Date.now(); }, []);

  const value = useMemo(() => ({
    sentimentScore,
    listeningState,
    eli5Global,
    emotionLog,
    lastActiveRef,
    updateSentiment,
    updateListeningState,
    toggleELI5,
    markActivity,
    setEmotionLog,
  }), [sentimentScore, listeningState, eli5Global, emotionLog, updateSentiment, updateListeningState, toggleELI5, markActivity]);

  return <EchoCoreContext.Provider value={value}>{children}</EchoCoreContext.Provider>;
};

export const useEchoCore = () => {
  const ctx = useContext(EchoCoreContext);
  if (!ctx) throw new Error("useEchoCore must be used within an EchoCoreProvider");
  return ctx;
};

export default EchoCoreContext;
