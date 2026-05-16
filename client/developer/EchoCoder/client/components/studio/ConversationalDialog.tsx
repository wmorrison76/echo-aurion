import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Lightbulb, Zap, AlertCircle } from "lucide-react";
import { realAIConversationService } from "@/services/RealAIConversationService";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  suggestedActions?: string[];
}

interface DialogPhase {
  phase: "idea" | "understanding" | "planning" | "implementation" | "complete";
  completedSteps: string[];
  nextQuestion?: string;
}

export const ConversationalDialog: React.FC<{
  onGenerationStart: (understanding: any) => void;
  onImplementation: (code: any) => void;
}> = ({ onGenerationStart, onImplementation }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiInitialized, setAiInitialized] = useState(false);
  const [currentUnderstanding, setCurrentUnderstanding] = useState<any>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<DialogPhase>({
    phase: "idea",
    completedSteps: ["Initial greeting"],
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize AI conversation on mount
  useEffect(() => {
    const initAI = async () => {
      try {
        const greeting =
          await realAIConversationService.initializeConversation();
        setMessages([
          {
            id: "1",
            role: "ai",
            content: greeting,
            timestamp: new Date(),
            suggestedActions: [
              "I want to build a recipe management system",
              "I need a booking/reservation system",
              "I'm creating a content dashboard",
            ],
          },
        ]);
        setAiInitialized(true);
      } catch (error) {
        console.error("Failed to initialize AI:", error);
        setMessages([
          {
            id: "1",
            role: "ai",
            content:
              "⚠️ AI initialization failed. Make sure ECHO_OPENAI_API_KEY is set. Falling back to manual mode.",
            timestamp: new Date(),
          },
        ]);
      }
    };

    initAI();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading || !aiInitialized) return;

    // Add user message
    const userMessage: Message = {
      id: Math.random().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Get real AI response
      const {
        response,
        understanding,
        phase: newPhaseValue,
      } = await realAIConversationService.sendMessage(text);

      // Add AI response
      const aiMessage: Message = {
        id: Math.random().toString(),
        role: "ai",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Update phase and trigger generation if ready
      const newPhase = {
        phase: newPhaseValue,
        completedSteps: [
          ...(phase.completedSteps || []),
          `Completeness: ${understanding.completenessScore}%`,
        ],
      };
      setPhase(newPhase);

      // If ready to generate, trigger it
      if (newPhaseValue === "ready") {
        onGenerationStart({
          phase: "implementation",
          idea: understanding.coreIdea,
          understanding,
        });
      }

      setLoading(false);
    } catch (error: any) {
      const errorMessage: Message = {
        id: Math.random().toString(),
        role: "ai",
        content: `⚠️ Error: ${error.message}. Please check your API key configuration.`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-secondary/5 relative z-50">
      {/* Phase Progress - Compressed header */}
      <div className="px-4 py-1.5 border-b border-border/50 bg-background/95 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <div
            className={`w-2 h-2 rounded-full ${phase.phase === "idea" ? "bg-blue-500" : "bg-green-500"}`}
          />
          <span className="font-medium capitalize text-[0.75rem]">{phase.phase}</span>
          <span className="text-muted-foreground text-[0.7rem]">
            {phase.completedSteps.length}
          </span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-4 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[95%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-card border border-border rounded-bl-none"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
                  {msg.content}
                </p>
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-3 space-y-2 flex flex-col">
                    {msg.suggestedActions.map((action, idx) => (
                      <Button
                        key={idx}
                        variant="secondary"
                        size="sm"
                        className="text-xs justify-start h-8"
                        onClick={() => handleSendMessage(action)}
                        disabled={loading}
                      >
                        <Lightbulb className="w-3 h-3 mr-1" />
                        {action}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">
                AI is understanding your vision...
              </span>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border/50 bg-card">
        <Input
          placeholder={
            phase.phase === "complete"
              ? "Tell me what to change..."
              : "Continue describing your vision..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage(input)}
          disabled={loading}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground mt-2">
          <Zap className="w-3 h-3 inline mr-1" />
          AI will auto-detect and generate
        </p>
      </div>
    </div>
  );
};

export default ConversationalDialog;
