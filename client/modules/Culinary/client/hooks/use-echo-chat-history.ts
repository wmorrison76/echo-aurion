import { useState, useEffect, useCallback } from "react";

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const STORAGE_KEY = "echo_chat_history";
const MAX_HISTORY_ITEMS = 100;

export function useEchoChatHistory() {
  const [history, setHistory] = useState<StoredMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredMessage[];
        setHistory(parsed);
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;

    try {
      // Keep only the most recent messages
      const toStore = history.slice(-MAX_HISTORY_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }, [history, isLoaded]);

  const addMessage = useCallback((message: StoredMessage) => {
    setHistory((prev) => [...prev, message]);
  }, []);

  const addMessages = useCallback((messages: StoredMessage[]) => {
    setHistory((prev) => [...prev, ...messages]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear chat history:", error);
    }
  }, []);

  const getHistory = useCallback(() => {
    return history;
  }, [history]);

  const getRecentSummary = useCallback(() => {
    if (history.length === 0) return "";

    const recent = history.slice(-10);
    return recent
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n");
  }, [history]);

  return {
    history,
    isLoaded,
    addMessage,
    addMessages,
    clearHistory,
    getHistory,
    getRecentSummary,
  };
}
