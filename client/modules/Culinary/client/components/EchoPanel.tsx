/**
 * EchoAi³ Panel Component
 * ----------------------
 * React integration for Echo AI within R&D Labs and other modules.
 * Provides conversational interface, toolbar bindings, and result display.
 */

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Microscope, Zap } from "lucide-react";
import {
  bootstrapEcho,
  EchoAI3,
  buildRDLabsContext,
  echoRDLabsToolbarConfig,
  runRDLabsToolbarAction,
} from "@/echo";

interface EchoPanelProps {
  module?: string;
  context?: Record<string, any>;
  onResponse?: (response: string, source: string) => void;
  className?: string;
  isCompact?: boolean;
}

export function EchoPanel({
  module = "RDLabs",
  context = {},
  onResponse,
  className,
  isCompact = false,
}: EchoPanelProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);

  // Initialize Echo on mount
  useEffect(() => {
    const initializeEcho = async () => {
      try {
        await bootstrapEcho({
          module,
          pageState: context,
          enableMemory: true,
          enableGuardrails: true,
          uiHooks: true,
        });
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize Echo:", error);
      }
    };

    initializeEcho();
  }, [module, context]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !isInitialized) return;

    setIsLoading(true);
    setConversationHistory((prev) => [
      ...prev,
      { role: "user", content: question },
    ]);

    try {
      const response = await EchoAI3.ask({
        prompt: question,
        module,
        context,
      });

      setResponse(response);
      setConversationHistory((prev) => [
        ...prev,
        { role: "echo", content: response },
      ]);

      if (onResponse) {
        onResponse(response, "echo");
      }

      setQuestion("");
    } catch (error) {
      const errorMsg = `Error: ${error instanceof Error ? error.message : "Failed to get response"}`;
      setResponse(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolbarAction = async (actionId: string) => {
    try {
      const result = await runRDLabsToolbarAction(actionId, {
        moduleName: module,
        ...context,
      });
      if (result) {
        setResponse(JSON.stringify(result, null, 2));
        if (onResponse) {
          onResponse(JSON.stringify(result), actionId);
        }
      }
    } catch (error) {
      console.error("Toolbar action failed:", error);
    }
  };

  if (isCompact) {
    return (
      <div className={cn("rounded-lg border border-[#c8a97e]/80 bg-amber-50 p-3 dark:border-[#c8a97e]/30 dark:bg-neutral-950/50", className)}>
        <div className="flex gap-2">
          <Input
            placeholder="Ask Echo..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk(e)}
            disabled={!isInitialized || isLoading}
            className="text-xs"
          />
          <Button
            size="sm"
            onClick={handleAsk}
            disabled={!isInitialized || isLoading || !question.trim()}
            className="bg-[#c8a97e] hover:bg-[#b8976c]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {response && (
          <div className="mt-2 rounded-md bg-white p-2 text-xs dark:bg-slate-900">
            {response}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-[#c8a97e] bg-gradient-to-br from-amber-50 to-blue-50 dark:border-[#b8976c] dark:from-neutral-950 dark:to-blue-950",
        "space-y-4 p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Microscope className="h-5 w-5 text-[#c8a97e]" />
          Echo AI Research Assistant
        </h3>
        {!isInitialized && (
          <span className="text-xs text-muted-foreground">Initializing...</span>
        )}
      </div>

      {/* R&D Toolbar */}
      {isInitialized && (
        <div className="flex flex-wrap gap-2 border-t border-[#c8a97e]/80 pt-2 dark:border-[#c8a97e]/40">
          {echoRDLabsToolbarConfig.map((button) => (
            <Button
              key={button.id}
              size="sm"
              variant="outline"
              onClick={() => handleToolbarAction(button.id)}
              disabled={isLoading}
              className="text-xs"
              title={button.label}
            >
              {button.label}
            </Button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleAsk} className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Ask Echo about recipes, ingredients, experiments..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={!isInitialized || isLoading}
            className="bg-white dark:bg-slate-900"
          />
          <Button
            type="submit"
            disabled={!isInitialized || isLoading || !question.trim()}
            className="bg-[#c8a97e] hover:bg-[#b8976c]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      {/* Response Display */}
      {response && (
        <div className="space-y-2 rounded-md border border-[#c8a97e]/80 bg-white p-3 dark:border-[#c8a97e]/40 dark:bg-slate-900">
          <div className="text-xs font-semibold text-[#c8a97e]/30 dark:text-white/80">
            Echo Response
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm text-foreground">
            {response}
          </div>
        </div>
      )}

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="space-y-2 border-t border-[#c8a97e]/80 pt-2 dark:border-[#c8a97e]/40">
          <div className="text-xs font-semibold text-muted-foreground">
            Conversation History
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {conversationHistory.slice(-5).map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-md p-2 text-xs",
                  msg.role === "user"
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "bg-white/80 dark:bg-[#c8a97e]/30"
                )}
              >
                <span className="font-semibold">
                  {msg.role === "user" ? "You" : "Echo"}:
                </span>{" "}
                {msg.content.slice(0, 100)}
                {msg.content.length > 100 ? "..." : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      {!isInitialized && (
        <div className="rounded-md bg-yellow-100 p-2 text-xs text-yellow-800 dark:bg-yellow-950 dark:text-yellow-100">
          Echo is initializing...
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Echo is thinking...
        </div>
      )}
    </div>
  );
}

/**
 * Compact variant for embedding in sidebar or panels
 */
export function EchoPanelCompact(props: Omit<EchoPanelProps, "isCompact">) {
  return <EchoPanel {...props} isCompact={true} />;
}

export default EchoPanel;
