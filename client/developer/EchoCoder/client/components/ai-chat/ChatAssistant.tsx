import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Maximize2,
  Code,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { getChatService } from "@/services/chatService";
import { cn } from "@/lib/utils";
import { VoiceTranslateControl } from "@/components/messaging/VoiceTranslateControl";

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: Date;
    }>
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [analyzeMode, setAnalyzeMode] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatService = getChatService();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const initChat = async () => {
      const sessionId = await chatService.createSession();
      setSessionId(sessionId);
    };
    initChat();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const userMessage = input;
    setInput("");
    setLoading(true);

    try {
      const message = await chatService.sendMessage(sessionId, userMessage, {
        file: "current-file.ts",
        line: 0,
        code: selectedCode,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: userMessage,
          timestamp: new Date(),
        },
        {
          id: message.id,
          role: "assistant",
          content: message.content,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Failed to process message. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeCode = async () => {
    if (!sessionId || !selectedCode) return;
    setAnalyzeMode(true);
    setLoading(true);

    try {
      const result = await chatService.analyzeCode(
        sessionId,
        selectedCode,
        "typescript",
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `analysis-${Date.now()}`,
          role: "assistant",
          content: `Code Analysis:\n\n${result.analysis}\n\nIssues Found:\n${result.issues.map((i) => `- Line ${i.line}: ${i.issue} (${i.severity})`).join("\n")}`,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Failed to analyze code:", error);
    } finally {
      setLoading(false);
      setAnalyzeMode(false);
    }
  };

  const handleGetSentryContext = async () => {
    if (!sessionId) return;
    setLoading(true);

    try {
      const context = await chatService.getSentryContext(sessionId);
      const insightText = context.insights.join("\n");
      setMessages((prev) => [
        ...prev,
        {
          id: `sentry-${Date.now()}`,
          role: "assistant",
          content: `Sentry Error Context:\n\n${insightText}\n\nRecent Errors: ${context.errors.length}`,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Failed to get Sentry context:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40 flex items-center gap-2"
        title="Open AI Assistant"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 transition-all duration-200",
        isMinimized ? "w-80 h-14" : "w-96 h-[600px]",
      )}
    >
      <Card className="h-full flex flex-col shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-sm">AI Assistant</CardTitle>
            {sessionId && (
              <Badge variant="outline" className="text-xs">
                Active
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <ScrollArea className="flex-1 p-4">
              <div ref={scrollRef} className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Hi! I'm your AI coding assistant.</p>
                    <p className="text-xs mt-2">
                      Ask me anything about your code.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2",
                        msg.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-xs rounded-lg px-3 py-2 text-sm",
                          msg.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-muted text-foreground border border-border",
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <CardContent className="p-3 border-t space-y-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAnalyzeCode}
                  disabled={loading || !selectedCode}
                  className="text-xs h-8"
                >
                  <Code className="w-3 h-3 mr-1" />
                  Analyze
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGetSentryContext}
                  disabled={loading}
                  className="text-xs h-8"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Sentry
                </Button>
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder="Ask something..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  className="text-xs h-8"
                />
                <VoiceTranslateControl
                  compact
                  onCommit={(payload) => {
                    const text = payload.translation || payload.transcript;
                    setInput(text);
                    handleSendMessage({ preventDefault: () => {} } as any);
                  }}
                />
                <Button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="h-8 w-8 p-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
