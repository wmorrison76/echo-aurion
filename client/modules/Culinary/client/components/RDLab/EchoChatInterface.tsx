import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Send,
  Loader,
  AlertCircle,
  ChevronRight,
  Beaker,
  TrendingUp,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { useEchoChatHistory } from "@/hooks/use-echo-chat-history";
import {
  speakText,
  stopAudio,
  checkServiceHealth,
} from "@/lib/elevenlabs-service";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface EchoChatInterfaceProps {
  onEnterLab?: (
    track: "fine-dining" | "manufacturing",
    mode: "culinary" | "pastry",
    context: { projectName: string; conversation: string; theme: string },
  ) => void;
  onLabTrigger?: (projectInfo: {
    projectName: string;
    projectId: string;
    conversationContext: string;
    extractedData?: any;
  }) => void;
  onTransitionStateChange?: (state: "collecting_data" | "collected") => void;
}

export function EchoChatInterface({
  onEnterLab,
  onLabTrigger,
  onTransitionStateChange,
}: EchoChatInterfaceProps) {
  const chatHistory = useEchoChatHistory();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lab entry trigger keywords and phrases
  const labTriggerPatterns = [
    /want to (create|design|make|build|start|develop|experiment with)\s+(?:a\s+)?([^\.!?]+)/i,
    /let'?s?\s+(create|design|make|build|start|develop)\s+(?:a\s+)?([^\.!?]+)/i,
    /i'?m?\s+(creating|designing|making|building|starting|developing)\s+(?:a\s+)?([^\.!?]+)/i,
    /new\s+(project|experiment|recipe|idea)(?:\s+(?:for|about|with))?\s+([^\.!?]+)/i,
    /enter the lab/i,
    /start an experiment/i,
    /open the lab/i,
    /(?:let'?s\s+)?go\s+(?:to\s+)?(?:the\s+)?lab/i,
    /go to the lab/i,
    /let's go to lab/i,
  ];

  const detectLabTrigger = (text: string): string | null => {
    for (const pattern of labTriggerPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Extract the project name from the match
        const projectName = match[2]?.trim() || match[1]?.trim() || "Unnamed Project";
        return projectName;
      }
    }
    return null;
  };

  // Initialize messages from stored history or show welcome message
  useEffect(() => {
    if (!chatHistory.isLoaded) return;

    const checkTTSAndInit = async () => {
      // Check if TTS service is available
      const health = await checkServiceHealth();
      if (!health.configured) {
        console.warn("TTS service not available:", health.message);
        setVoiceEnabled(false);
        setError(
          "Voice not available: " +
            (health.message || "TTS service not configured"),
        );
      }
    };

    checkTTSAndInit();

    const storedHistory = chatHistory.getHistory();
    if (storedHistory.length > 0) {
      setMessages(
        storedHistory.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp),
        })),
      );
    } else {
      // Show welcome message for new users
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: `Welcome to R&D Labs. I'm ECHO Ai, your culinary research assistant.

I'm here to help you explore new ideas, design experiments, and push the boundaries of your craft. Whether you're working on fine dining innovation, pastry artistry, or scaling production—let's collaborate freely.

What are you thinking about today? A new technique? A flavor combination? Production challenges? Or maybe you want to brainstorm something completely new?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      chatHistory.addMessage({
        id: welcomeMessage.id,
        role: welcomeMessage.role,
        content: welcomeMessage.content,
        timestamp: welcomeMessage.timestamp.toISOString(),
      });
    }
  }, [chatHistory.isLoaded]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    // Check for lab trigger in user message
    const labTriggerMatch = detectLabTrigger(input);

    setMessages((prev) => [...prev, userMessage]);
    chatHistory.addMessage({
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      timestamp: userMessage.timestamp.toISOString(),
    });

    setInput("");
    setError(null);
    setIsLoading(true);

    // Emit collecting_data state if lab trigger detected
    if (labTriggerMatch) {
      onTransitionStateChange?.("collecting_data");
    }

    try {
      const response = await fetch("/api/rdlabs/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages
            .map((m) => ({
              role: m.role,
              content: m.content,
            }))
            .concat([userMessage]),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from ECHO Ai");
      }

      const data = await response.json();

      // Validate response data
      if (!data.message || typeof data.message !== "string") {
        throw new Error(
          `Invalid response format: expected string message, got ${typeof data.message}`,
        );
      }

      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      chatHistory.addMessage({
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        timestamp: assistantMessage.timestamp.toISOString(),
      });

      // Speak the response if voice is enabled
      // Skip TTS for very long responses to avoid timeout
      if (
        voiceEnabled &&
        assistantMessage.content &&
        assistantMessage.content.length > 0 &&
        assistantMessage.content.length < 2000
      ) {
        try {
          await speakAssistantMessage(assistantMessage.content);
        } catch (speakErr) {
          // Log but don't interrupt the chat flow
          // Voice is optional - chat continues normally
          if (speakErr instanceof Error && !speakErr.message.includes("401") && !speakErr.message.includes("not configured")) {
            console.warn("TTS failed, continuing without audio:", speakErr);
          }
          // For auth/config errors, silently continue - voice just unavailable
        }
      }

      // Check for lab trigger in user or assistant message
      if (labTriggerMatch) {
        // Emit collected state before triggering lab entry
        onTransitionStateChange?.("collected");
        // Delay lab entry to allow UI to update
        setTimeout(() => {
          triggerLabEntry(labTriggerMatch, messages.concat([userMessage, assistantMessage]));
        }, 300);
      } else {
        // Also check assistant response for lab triggers
        const assistantTrigger = detectLabTrigger(assistantMessage.content);
        if (assistantTrigger) {
          onTransitionStateChange?.("collected");
          setTimeout(() => {
            triggerLabEntry(assistantTrigger, messages.concat([userMessage, assistantMessage]));
          }, 300);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
      if (labTriggerMatch) {
        // Reset transition state on error
        onTransitionStateChange?.("collected");
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const speakAssistantMessage = async (text: string) => {
    setIsSpeaking(true);
    try {
      await speakText(text);
    } catch (err) {
      console.error("Error speaking message:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Failed to play audio";

      // Only show toast for actual failures, not for user interruption
      if (!errorMsg.includes("abort")) {
        toast.error(`Audio error: ${errorMsg.substring(0, 50)}...`);
      }
    } finally {
      setIsSpeaking(false);
    }
  };

  const triggerLabEntry = async (projectName: string, allMessages?: Message[]) => {
    try {
      const projectId = `proj_${Date.now()}`;
      const messagesToUse = allMessages || messages;
      const conversationContext = messagesToUse
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      // Call the AI extraction endpoint to get structured project info
      const response = await fetch("/api/rdlabs/extract-project-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          conversationContext,
          messages: messagesToUse.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const extracted = result.data || result;
        onLabTrigger?.({
          projectName: extracted.projectName || projectName,
          projectId,
          conversationContext,
          extractedData: extracted,
        });
      } else {
        console.warn("Extraction endpoint returned non-ok status:", response.status);
        // Fallback if extraction fails
        onLabTrigger?.({
          projectName,
          projectId,
          conversationContext,
        });
      }
    } catch (err) {
      console.error("Lab trigger error:", err);
      // Still trigger lab even if extraction fails
      const projectId = `proj_${Date.now()}`;
      const messagesToUse = allMessages || messages;
      const conversationContext = messagesToUse
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      onLabTrigger?.({
        projectName,
        projectId,
        conversationContext,
      });
    }
  };

  const handleToggleSpeaking = () => {
    if (isSpeaking) {
      stopAudio();
      setIsSpeaking(false);
    } else {
      setVoiceEnabled(!voiceEnabled);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    chatHistory.clearHistory();
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Welcome to R&D Labs. I'm ECHO Ai, your culinary research assistant.

I'm here to help you explore new ideas, design experiments, and push the boundaries of your craft. Whether you're working on fine dining innovation, pastry artistry, or scaling production—let's collaborate freely.

What are you thinking about today? A new technique? A flavor combination? Production challenges? Or maybe you want to brainstorm something completely new?`,
        timestamp: new Date(),
      },
    ]);
    setShowClearConfirm(false);
    toast.success("Chat history cleared");
  };

  return (
    <div className="fixed inset-0 bg-background dark:bg-slate-950 flex items-center justify-center z-50 overflow-hidden">
      {/* Background animated element */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Clear History Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-card border-border p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Clear chat history?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              This will delete all your previous conversations. You can't undo
              this action.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleClearHistory}
              >
                Clear History
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Chat Container */}
      <div className="relative z-10 w-full max-w-2xl h-[90vh] mx-4 flex flex-col rounded-xl border border-border dark:border-slate-800 bg-card dark:bg-slate-900 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border dark:border-slate-800 bg-muted/50 dark:bg-slate-800/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#c8a97e]/08 border border-[#c8a97e]/25">
                <Sparkles className="h-5 w-5 text-[#c8a97e]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">ECHO Ai</h1>
                <p className="text-xs text-muted-foreground">
                  Culinary Research Assistant
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={voiceEnabled ? "default" : "outline"}
                onClick={handleToggleSpeaking}
                title={
                  voiceEnabled
                    ? "Voice enabled (click to disable)"
                    : "Voice disabled (click to enable)"
                }
                className="gap-1"
              >
                {isSpeaking ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : voiceEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                <span className="text-xs">
                  {voiceEnabled ? "Voice" : "Muted"}
                </span>
              </Button>
              {messages.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowClearConfirm(true)}
                  title="Clear conversation"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const newMessage: Message = {
                    id: `msg_${Date.now()}`,
                    role: "user",
                    content:
                      "Ready to enter the lab. What track would you recommend based on our conversation?",
                    timestamp: new Date(),
                  };
                  setMessages((prev) => [...prev, newMessage]);
                  setTimeout(() => {
                    if (onEnterLab) {
                      // Extract project name from conversation
                      const conversationText = messages
                        .map((m) => m.content)
                        .join("\n");
                      const projectNameMatch =
                        conversationText.match(
                          /(?:spherification|recipe|technique|dish|experiment|project)[\s:]+([^.\n]+)/i,
                        ) || [];
                      const projectName =
                        projectNameMatch[1] || "R&D Experiment";

                      const theme = messages.some((m) =>
                        m.content.toLowerCase().includes("pastry"),
                      )
                        ? "pastry"
                        : "culinary";

                      onEnterLab(
                        "fine-dining",
                        theme as "culinary" | "pastry",
                        {
                          projectName: projectName.trim(),
                          conversation: conversationText,
                          theme,
                        },
                      );
                    }
                  }, 500);
                }}
                title="Start working"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 flex flex-col">
          <div className="space-y-4 p-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } gap-2`}
              >
                {message.role === "assistant" && voiceEnabled && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => speakAssistantMessage(message.content)}
                    className="mt-auto"
                    title="Replay audio"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
                <div
                  className={`max-w-md px-4 py-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-[#c8a97e] text-white rounded-br-none"
                      : "bg-muted dark:bg-slate-800 text-foreground rounded-bl-none border border-border dark:border-slate-700"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === "user"
                        ? "text-white/80"
                        : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted dark:bg-slate-800 text-foreground rounded-lg rounded-bl-none border border-border dark:border-slate-700 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader className="h-4 w-4 animate-spin text-[#c8a97e]" />
                    <span className="text-sm text-muted-foreground">
                      ECHO Ai is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 max-w-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Error
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Quick Actions (optional) */}
        {messages.length === 1 && (
          <div className="border-t border-border dark:border-slate-800 px-6 py-4 bg-muted/50 dark:bg-slate-800/50">
            <p className="text-xs text-muted-foreground mb-3">
              Suggested topics:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setInput(
                    "I want to design a new dish for fine dining. What should I consider?",
                  )
                }
                className="justify-start text-xs"
              >
                <Beaker className="h-3 w-3 mr-1" />
                Design new dish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setInput("Help me scale up a recipe for production.")
                }
                className="justify-start text-xs"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Scale recipe
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-border dark:border-slate-800 bg-muted/50 dark:bg-slate-800/50 p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask ECHO Ai anything about your R&D work..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={() => {
                const projectName = input.trim() || "R&D Experiment";
                triggerLabEntry(projectName);
              }}
              disabled={isLoading}
              size="sm"
              variant="outline"
              title="Manually open lab (or say 'let's go to the lab')"
              className="gap-2"
            >
              <Beaker className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              size="sm"
              className="gap-2"
            >
              {isLoading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
