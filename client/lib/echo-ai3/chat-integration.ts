import { useState, useCallback } from "react";

export interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

interface ChatHookState {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Hook for managing EchoAI3 chat with backend integration
 * Sends messages to /api/echo-ai3/chat endpoint for AI responses
 */
export function useEchoAi3ChatWithSuggestions(): ChatHookState {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      // Add user message to history
      const userMessage: ChatMessage = { role: "user", text: message };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        // Call backend AI endpoint - send as messages array for compatibility
        const response = await fetch("/api/echo-ai3/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: message }],
            maxTokens: 500,
          }),
        });

        if (!response.ok) {
          throw new Error(`Chat API error: ${response.status}`);
        }

        const data = await response.json();

        // Handle both streaming and non-streaming responses
        let aiResponse = "";

        if (data.ok) {
          // Non-streaming response from /api/echo-ai3/chat
          aiResponse = data.response || "I couldn't generate a response.";
        } else if (data.response) {
          // Alternative response format
          aiResponse = data.response;
        } else {
          aiResponse = "I couldn't generate a response.";
        }

        // Add AI response to history
        const aiMessage: ChatMessage = { role: "ai", text: aiResponse };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        console.error("[EchoAI3] Chat error:", error);
        // Add error message to chat
        const errorMessage: ChatMessage = {
          role: "ai",
          text: "Sorry, I encountered an error. Please try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
  };
}
