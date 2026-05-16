/**
 * EchoAi^3 Chat Integration
 * -------------------------
 * Integrates EchoAi^3 Unified Brain with the chat window
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getEchoAi3UnifiedBrain, SystemQuery } from "./unified-brain";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import {
  resolveEchoContext,
  resolveEchoPermissionProfile,
  type EchoResolvedContext,
} from "@shared/echo-ai3-context";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  timestamp?: string;
  relatedModules?: string[];
  codeReferences?: string[];
  suggestedActions?: string[];
}

interface UseEchoAi3ChatOptions {
  moduleOverride?: string;
  surface?: EchoResolvedContext["surface"];
}

export function useEchoAi3Chat(options: UseEchoAi3ChatOptions = {}) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const location = useLocation();
  const brain = getEchoAi3UnifiedBrain();
  
  // Expose setHistory for external updates (like echo-action events)
  const setHistoryRef = useRef(setHistory);
  setHistoryRef.current = setHistory;

  // Get current context from location and user
  const getCurrentContext = useCallback(() => {
    const userRole = (user as any)?.role || undefined;
    const selectedOutlet =
      (user as any)?.outlet_name || (user as any)?.outletId || (user as any)?.outlet_id || "all outlets";
    const resolved = resolveEchoContext({
      pathname: location.pathname,
      explicitModule: options.moduleOverride,
      selectedOutlet,
      userRole,
      surface: options.surface,
    });

    return {
      module: resolved.activeModule,
      userRole,
      currentPage: resolved.pathname,
      activeModule: resolved.activeModule,
      moduleFamily: resolved.moduleFamily,
      selectedOutlet: resolved.selectedOutlet,
      surface: resolved.surface,
      permissions: resolved.permissions,
    };
  }, [location.pathname, options.moduleOverride, options.surface, user]);

  /**
   * Send a message to EchoAi^3
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

      // Add user message to history
      const userMessage: ChatMessage = {
        role: "user",
        text: message,
        timestamp: new Date().toISOString(),
      };

      setHistory((prev) => [...prev, userMessage]);
      setInput(""); // Clear input after sending
      setIsLoading(true);
      setError(null);

    try {
      // Get current context
      const context = getCurrentContext();

      // Query the unified brain
      const query: SystemQuery = {
        query: message,
        context,
      };

      const response = await brain.understand(query);

      // Add assistant response to history
      const assistantMessage: ChatMessage = {
        role: "assistant",
        text: response.answer,
        timestamp: new Date().toISOString(),
        relatedModules: response.relatedModules,
        codeReferences: response.codeReferences,
        suggestedActions: response.suggestedActions,
      };

      setHistory((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get response";
      setError(errorMessage);
      
      const errorResponse: ChatMessage = {
        role: "assistant",
        text: `I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      
      setHistory((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }, [brain, getCurrentContext]);

  /**
   * Clear chat history (reset conversation)
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setInput("");
    setError(null);
    // Reset conversation in brain
    brain.conversationHistory = [];
  }, [brain]);
  
  /**
   * Reset conversation (alias for clearHistory)
   */
  const resetConversation = useCallback(() => {
    clearHistory();
  }, [clearHistory]);

  /**
   * Get module understanding
   */
  const getModuleInfo = useCallback((moduleId: string) => {
    return brain.getModuleUnderstanding(moduleId);
  }, [brain]);

  /**
   * Get role understanding
   */
  const getRoleInfo = useCallback((role: string) => {
    return brain.getRoleUnderstanding(role);
  }, [brain]);

  return {
    history,
    input,
    setInput,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    resetConversation,
    getModuleInfo,
    getRoleInfo,
    setHistory: setHistoryRef.current, // Expose for external updates
  };
}

/**
 * React hook for EchoAi^3 chat with auto-suggestions
 */
interface UseEchoAi3ChatWithSuggestionsOptions extends UseEchoAi3ChatOptions {
  moduleName?: string;
}

export function useEchoAi3ChatWithSuggestions(options: UseEchoAi3ChatWithSuggestionsOptions = {}) {
  const chat = useEchoAi3Chat(options);
  const { user } = useAuth();
  const location = useLocation();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Create a proper sendMessage wrapper that handles both user messages and AI responses
  const sendMessageWrapper = useCallback(async (message: string, aiResponse?: string) => {
    if (!chat) return;
    
    if (aiResponse) {
      // Direct AI response (from echo-action event)
      const aiMessage: ChatMessage = {
        role: "assistant",
        text: aiResponse,
        timestamp: new Date().toISOString(),
      };
      // Use the chat's setHistory if available
      if (chat.setHistory) {
        chat.setHistory((prev: ChatMessage[]) => [...prev, aiMessage]);
      } else if (chat.history) {
        // Fallback: add to history array (won't trigger re-render but better than nothing)
        chat.history.push(aiMessage);
      }
    } else if (message && chat.sendMessage) {
      // User message - send to brain
      await chat.sendMessage(message);
    }
  }, [chat]);

  // Generate suggestions based on current context
  useEffect(() => {
    const generateSuggestions = () => {
      const currentPage = location.pathname;
      const module = options.moduleOverride || currentPage.split("/")[1] || undefined;
      const userRole = (user as any)?.role || undefined;
      const permissionProfile = resolveEchoPermissionProfile(userRole);

      const suggestionsList: string[] = [];

      // Module-specific suggestions
      if (module) {
        switch (module) {
          case "culinary":
          case "pastry":
            suggestionsList.push(
              "How do I create a new recipe?",
              "What's the food cost for this recipe?",
              "How do I add a recipe to the menu?",
              "What ingredients do I need for this recipe?"
            );
            break;
          case "inventory":
          case "ordering-inventory":
            suggestionsList.push(
              "What items need reordering?",
              "How do I create a purchase order?",
              "What's our current inventory value?",
              "Where is this item stored?"
            );
            break;
          case "schedule":
            suggestionsList.push(
              "Who's scheduled this week?",
              "What's our labor cost?",
              "How do I create a shift?",
              "Who's available for overtime?"
            );
            break;
          case "aurum":
          case "echo-aurum":
          case "finance":
            suggestionsList.push(
              "Show me the P&L for this period",
              "What's our budget variance?",
              "What are our outstanding invoices?",
              "Show me the financial reports"
            );
            break;
        }
      }

      // Role-specific suggestions
      if (userRole) {
        switch (userRole.toLowerCase()) {
          case "chef":
          case "master chef":
            suggestionsList.push(
              "How do I cost out a recipe?",
              "What's my food cost percentage?",
              "Show me recipes under $5 plate cost"
            );
            break;
          case "cpa":
          case "finance":
          case "director":
            suggestionsList.push(
              "What's our labor cost percentage?",
              "Show me the P&L",
              "What's our budget variance?",
              "Which outlets are most profitable?"
            );
            break;
          case "purchasing":
          case "manager":
            suggestionsList.push(
              "What items need reordering?",
              "Show me pending purchase orders",
              "What did we receive today?",
              "Which vendor has the best price?"
            );
            break;
        }
      }

      if (!permissionProfile.canAccessCompensation) {
        const blockedTerms = ["salary", "compensation", "payroll", "wage"];
        const filtered = suggestionsList.filter((item) =>
          !blockedTerms.some((term) => item.toLowerCase().includes(term)),
        );
        suggestionsList.splice(0, suggestionsList.length, ...filtered);
      }

      // General suggestions
      if (suggestionsList.length === 0) {
        suggestionsList.push(
          "How does the recipe system work?",
          "What modules integrate with Inventory?",
          "How do I create a purchase order?",
          "What tools does a Master Chef use?",
          "Show me all the modules in the system"
        );
      }

      setSuggestions(suggestionsList.slice(0, 4));
    };

    generateSuggestions();
  }, [location.pathname, options.moduleOverride, user]);

  // Ensure all values are safe with defaults
  return {
    messages: (chat?.history || []) as ChatMessage[],
    input: chat?.input || "",
    setInput: chat?.setInput || (() => {}),
    sendMessage: sendMessageWrapper,
    isLoading: chat?.isLoading || false,
    suggestions: suggestions || [],
    clearHistory: chat?.clearHistory || (() => {}),
    resetConversation: chat?.resetConversation || (() => {}),
    getModuleInfo: chat?.getModuleInfo || (() => ""),
    getRoleInfo: chat?.getRoleInfo || (() => ""),
  };
}
