/**
 * Reusable EchoAi^3 Chat Button Component
 * Enterprise-grade production-ready implementation
 * 
 * Usage:
 * <ModuleChatButton moduleId="ai-cooking-assistant" moduleName="AI Cooking Assistant" />
 */

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEchoAi3ChatWithSuggestions } from "@/lib/echo-ai3/chat-integration";
import { ForecastPanel } from "@/lib/echo-ai3/components/ForecastPanel";
import { VoiceTranslateControl } from "@/components/messaging/VoiceTranslateControl";

interface ModuleChatButtonProps {
  moduleId: string;
  moduleName: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function ModuleChatButton({
  moduleId,
  moduleName,
  className,
  variant = "outline",
  size = "md",
}: ModuleChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    suggestions,
    clearHistory,
  } = useEchoAi3ChatWithSuggestions({ moduleOverride: moduleId, moduleName });

  // Close on outside click (unless pinned)
  useEffect(() => {
    if (!isOpen || isPinned) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isPinned]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    await sendMessage(input);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("relative", className)} ref={chatRef}>
      {/* Chat Button */}
      <Button
        variant={variant}
        size="icon"
        className={cn(
          sizeClasses[size],
          "rounded-full shadow-lg transition-all",
          isOpen && "bg-primary text-primary-foreground"
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Open ${moduleName} chat`}
      >
        <MessageCircle className={cn(size === "sm" ? "w-4 h-4" : size === "md" ? "w-5 h-5" : "w-6 h-6")} />
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            "absolute bottom-full right-0 mb-2 w-96 max-h-[600px]",
            "bg-background/95 backdrop-blur-xl border border-border rounded-lg shadow-2xl",
            "flex flex-col overflow-hidden z-50"
          )}
          style={{
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">{moduleName} Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={() => setShowForecast(!showForecast)}
                title="Toggle Forecast Panel"
              >
                📊
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? "Unpin" : "Pin"}
              >
                📌
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Forecast Panel (if enabled) */}
          {showForecast && (
            <div className="border-b border-border p-3 bg-muted/20">
              <ForecastPanel moduleId={moduleId} />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Ask me anything about {moduleName}</p>
                {suggestions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(suggestion);
                          handleSend();
                        }}
                        className="block w-full text-left px-3 py-2 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.relatedModules && msg.relatedModules.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">
                          Related: {msg.relatedModules.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-3 bg-muted/30 space-y-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
              <VoiceTranslateControl
                compact
                onCommit={(payload) => {
                  const text = payload.translation || payload.transcript;
                  setInput(text);
                  sendMessage(text);
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="mt-2 text-xs text-muted-foreground"
              >
                Clear History
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
