import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Save, Copy, Code2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface SeedRequirements {
  title: string;
  description: string;
  detailLevel: "concise" | "detailed" | "comprehensive";
  messages: Message[];
  generatedCode?: string;
  requirementsDoc?: string;
  completedAt?: Date;
}

export default function AI3SeedGenerator() {
  const [open, setOpen] = useState(false);
  const [detailLevel, setDetailLevel] = useState<
    "concise" | "detailed" | "comprehensive" | null
  >(null);
  const [initialProblem, setInitialProblem] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingModule, setGeneratingModule] = useState(false);
  const [savedRequirements, setSavedRequirements] =
    useState<SeedRequirements | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartInterview = async () => {
    if (!detailLevel || !initialProblem.trim()) {
      toast.error("Please select detail level and describe your project");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai3/seed-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialProblem,
          detailLevel,
          stage: "initial",
        }),
      });

      if (!response.ok) throw new Error("Failed to start interview");

      const data = await response.json();
      setMessages([
        {
          role: "user",
          content: initialProblem,
          timestamp: new Date(),
        },
        {
          role: "ai",
          content: data.initialResponse,
          timestamp: new Date(),
        },
      ]);
      setInitialProblem("");
    } catch (error) {
      toast.error("Failed to start interview");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !detailLevel) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, timestamp: new Date() },
    ]);
    setLoading(true);

    try {
      const response = await fetch("/api/ai3/seed-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          userMessage,
          detailLevel,
          stage: "interview",
        }),
      });

      if (!response.ok) throw new Error("Failed to get AI response");

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: data.response,
          timestamp: new Date(),
        },
      ]);

      if (data.readyForGeneration) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content:
              "✅ Great! I have all the details I need. Ready to generate your module and requirements document. Click 'Generate Module' below to proceed.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      toast.error("Failed to get response");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateModule = async () => {
    setGeneratingModule(true);
    try {
      const response = await fetch("/api/ai3/seed-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          detailLevel,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate module");

      const data = await response.json();
      const requirements: SeedRequirements = {
        title: data.moduleTitle || "Generated Module",
        description: data.moduleDescription || "",
        detailLevel,
        messages,
        generatedCode: data.generatedCode,
        requirementsDoc: data.requirementsDoc,
        completedAt: new Date(),
      };

      setSavedRequirements(requirements);
      toast.success("Module generated successfully!");
    } catch (error) {
      toast.error("Failed to generate module");
      console.error(error);
    } finally {
      setGeneratingModule(false);
    }
  };

  const handleSaveRequirements = () => {
    if (!savedRequirements) return;

    const dataStr = JSON.stringify(savedRequirements, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${savedRequirements.title.toLowerCase().replace(/\s+/g, "-")}-requirements.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Requirements saved!");
  };

  const handleCopyCode = () => {
    if (savedRequirements?.generatedCode) {
      navigator.clipboard.writeText(savedRequirements.generatedCode);
      toast.success("Code copied to clipboard!");
    }
  };

  const isStarted = messages.length > 0;
  const showGenerateButton =
    messages.length > 0 &&
    messages[messages.length - 1].role === "ai" &&
    messages[messages.length - 1].content.includes("✅");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Code2 className="h-4 w-4" />
          AI³ Seed Generator
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>AI³ Intelligent Seed Generator</DialogTitle>
          <DialogDescription>
            Multi-turn AI interview to gather requirements and auto-generate
            modules
          </DialogDescription>
        </DialogHeader>

        {!isStarted ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Detail Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["concise", "detailed", "comprehensive"] as const).map(
                  (level) => (
                    <button
                      key={level}
                      onClick={() => setDetailLevel(level)}
                      className={`rounded-lg border p-3 text-sm font-medium transition ${
                        detailLevel === level
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {level === "concise" && "🎯 Concise\n(key questions)"}
                      {level === "detailed" && "📋 Detailed\n(comprehensive)"}
                      {level === "comprehensive" &&
                        "🔬 Comprehensive\n(deep dive)"}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Describe Your Project/Problem
              </label>
              <Textarea
                placeholder="Example: We need to track food allergies, course pickup, and service metrics during a banquet for 25 tables of 8 people..."
                value={initialProblem}
                onChange={(e) => setInitialProblem(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <Button
              onClick={handleStartInterview}
              disabled={loading || !detailLevel || !initialProblem.trim()}
              className="w-full gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Start AI Interview
            </Button>
          </div>
        ) : !savedRequirements ? (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto rounded-lg border border-primary/20 bg-background/50 p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder="Answer the question or add more details..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    handleSendMessage();
                  }
                }}
                className="min-h-[80px]"
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  size="sm"
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                </Button>
                {showGenerateButton && (
                  <Button
                    onClick={handleGenerateModule}
                    disabled={generatingModule}
                    size="sm"
                    variant="default"
                    className="gap-2"
                  >
                    {generatingModule ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Code2 className="h-4 w-4" />
                    )}
                    Generate
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>{savedRequirements.title}</CardTitle>
                <CardDescription>
                  {savedRequirements.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    📋 Requirements Document
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-xs max-h-[200px] overflow-y-auto whitespace-pre-wrap font-mono">
                    {savedRequirements.requirementsDoc}
                  </div>
                </div>

                {savedRequirements.generatedCode && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        💻 Generated Code
                      </div>
                      <Button
                        onClick={handleCopyCode}
                        size="sm"
                        variant="ghost"
                        className="gap-2"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-xs max-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono">
                      {savedRequirements.generatedCode.slice(0, 1000)}...
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSaveRequirements}
                    className="gap-2 flex-1"
                  >
                    <Save className="h-4 w-4" />
                    Save Requirements
                  </Button>
                  <Button
                    onClick={() => {
                      setOpen(false);
                      setSavedRequirements(null);
                      setMessages([]);
                      setDetailLevel(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Start New Seed
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
