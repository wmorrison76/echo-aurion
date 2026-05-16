import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Mic,
  MicOff,
  Send,
  Upload,
  Settings,
  Download,
  Brain,
  Code2,
  DollarSign,
  BarChart3,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Volume2,
  Zap,
  FileText,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type PersonaType = "developer" | "cpa" | "statistician" | "chef" | "teacher";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  confidence?: number;
}

interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
}

interface PersonaInfo {
  type: PersonaType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  expertise: string[];
}

const PERSONAS: Record<PersonaType, PersonaInfo> = {
  developer: {
    type: "developer",
    name: "Developer Assistant",
    description: "Code generation, debugging, architecture",
    icon: <Code2 className="w-5 h-5" />,
    color: "bg-blue-500",
    expertise: ["React", "TypeScript", "Node.js", "SQL", "API Design"],
  },
  cpa: {
    type: "cpa",
    name: "Financial Analyst",
    description: "P&L analysis, financial forecasting, cost optimization",
    icon: <DollarSign className="w-5 h-5" />,
    color: "bg-green-500",
    expertise: [
      "P&L Analysis",
      "Forecasting",
      "Cost Optimization",
      "Revenue Strategy",
    ],
  },
  statistician: {
    type: "statistician",
    name: "Data Analyst",
    description: "Demand forecasting, trend analysis, metrics",
    icon: <BarChart3 className="w-5 h-5" />,
    color: "bg-purple-500",
    expertise: [
      "Forecasting",
      "Trend Analysis",
      "Statistical Analysis",
      "Metrics",
    ],
  },
  chef: {
    type: "chef",
    name: "Culinary Advisor",
    description: "Menu optimization, recipe costing, supply chain",
    icon: <BookOpen className="w-5 h-5" />,
    color: "bg-orange-500",
    expertise: [
      "Recipe Costing",
      "Menu Optimization",
      "Ingredient Sourcing",
      "Food Safety",
    ],
  },
  teacher: {
    type: "teacher",
    name: "Educational Guide",
    description: "Explanations, tutorials, learning guidance",
    icon: <BookOpen className="w-5 h-5" />,
    color: "bg-pink-500",
    expertise: [
      "Explanations",
      "Tutorials",
      "Learning Paths",
      "Concept Breaking",
    ],
  },
};

export function EchoAIMasterInterface() {
  const [currentPersona, setCurrentPersona] =
    useState<PersonaType>("developer");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voice, setVoice] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    transcript: "",
    interimTranscript: "",
  });
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [pdfUploadProgress, setPdfUploadProgress] = useState(0);
  const [knowledgeStats, setKnowledgeStats] = useState({
    modulesIndexed: 0,
    pdfsProcessed: 0,
    embeddingsCreated: 0,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onstart = () => {
          setVoice((prev) => ({ ...prev, isListening: true }));
        };

        recognitionRef.current.onresult = (event: any) => {
          let interim = "";
          let final = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript + " ";
            } else {
              interim += transcript;
            }
          }

          if (final) {
            setInputValue((prev) => prev + final);
            setVoice((prev) => ({
              ...prev,
              transcript: prev.transcript + final,
              interimTranscript: "",
            }));
          } else {
            setVoice((prev) => ({
              ...prev,
              interimTranscript: interim,
            }));
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
        };

        recognitionRef.current.onend = () => {
          setVoice((prev) => ({
            ...prev,
            isListening: false,
            transcript: "",
            interimTranscript: "",
          }));
        };
      }
    }
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleVoiceListening = () => {
    if (!recognitionRef.current) return;

    if (voice.isListening) {
      recognitionRef.current.stop();
    } else {
      setVoice({
        isListening: true,
        isSpeaking: false,
        transcript: "",
        interimTranscript: "",
      });
      recognitionRef.current.start();
    }
  };

  const speakMessage = (text: string) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    synthesisRef.current = new SpeechSynthesisUtterance(text);
    synthesisRef.current.rate = 0.95;
    synthesisRef.current.pitch = 1;

    synthesisRef.current.onstart = () => {
      setVoice((prev) => ({ ...prev, isSpeaking: true }));
    };

    synthesisRef.current.onend = () => {
      setVoice((prev) => ({ ...prev, isSpeaking: false }));
    };

    window.speechSynthesis.speak(synthesisRef.current);
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/echo-ai/process-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          persona: currentPersona,
          conversationContext: messages.slice(-5), // Last 5 messages for context
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        confidence: data.confidence,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Speak response if voice is enabled
      if (voiceEnabled) {
        speakMessage(data.response);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error processing your request.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadPdf = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setPdfUploadProgress(10);
      const response = await fetch("/api/echo-ai/upload-pdf", {
        method: "POST",
        body: formData,
      });

      setPdfUploadProgress(50);

      if (!response.ok) throw new Error("Upload failed");

      setPdfUploadProgress(75);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setPdfUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));

      setPdfUploadProgress(0);

      // Update stats
      setKnowledgeStats((prev) => ({
        ...prev,
        pdfsProcessed: prev.pdfsProcessed + 1,
      }));
    } catch (error) {
      console.error("PDF upload error:", error);
      setPdfUploadProgress(0);
    }
  };

  const indexModules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/echo-ai/index-modules", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Indexing failed");

      const data = await response.json();
      setKnowledgeStats({
        modulesIndexed: data.result.modulesIndexed || 0,
        pdfsProcessed: knowledgeStats.pdfsProcessed,
        embeddingsCreated: data.result.embeddingsCreated || 0,
      });
    } catch (error) {
      console.error("Indexing error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const personaInfo = PERSONAS[currentPersona];

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        {/* Sidebar - Persona Selection & Settings */}
        <div className="lg:col-span-1 space-y-4">
          {/* Persona Selector */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-sm">Active Persona</CardTitle>
              <CardDescription>Switch AI expertise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(PERSONAS).map(([key, persona]) => (
                <button
                  key={key}
                  onClick={() => setCurrentPersona(key as PersonaType)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    currentPersona === key
                      ? `${persona.color} text-white shadow-lg`
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {persona.icon}
                    <span className="font-medium text-sm">{persona.name}</span>
                  </div>
                  <p className="text-xs opacity-75">{persona.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Knowledge Stats */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-sm">Knowledge Base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400">Modules</span>
                  <span className="text-xs font-bold">
                    {knowledgeStats.modulesIndexed}
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    (knowledgeStats.modulesIndexed / 17) * 100,
                    100,
                  )}
                  className="h-1"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400">PDFs</span>
                  <span className="text-xs font-bold">
                    {knowledgeStats.pdfsProcessed}
                  </span>
                </div>
                <Progress
                  value={knowledgeStats.pdfsProcessed * 10}
                  className="h-1"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400">Embeddings</span>
                  <span className="text-xs font-bold">
                    {knowledgeStats.embeddingsCreated}
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    (knowledgeStats.embeddingsCreated / 10000) * 100,
                    100,
                  )}
                  className="h-1"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={indexModules}
                disabled={isLoading}
                className="w-full mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Indexing...
                  </>
                ) : (
                  <>
                    <Brain className="w-3 h-3 mr-2" />
                    Index Modules
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Voice Settings */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-sm">Voice Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant={voiceEnabled ? "default" : "outline"}
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="w-full"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                {voiceEnabled ? "Voice On" : "Voice Off"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleVoiceListening}
                disabled={!voiceEnabled}
                className="w-full"
              >
                {voice.isListening ? (
                  <>
                    <MicOff className="w-3 h-3 mr-2" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="w-3 h-3 mr-2" />
                    Start Listening
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 flex flex-col">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="bg-slate-800 border-b border-slate-700">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="pdf">PDF Learning</TabsTrigger>
              <TabsTrigger value="context">Context</TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent
              value="chat"
              className="flex-1 flex flex-col gap-4 mt-0"
            >
              <Card className="flex-1 flex flex-col bg-slate-800 border-slate-700">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-12 text-slate-500">
                        <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Start a conversation with {personaInfo.name}</p>
                      </div>
                    )}

                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${
                          msg.role === "user" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            msg.role === "user"
                              ? "bg-blue-600"
                              : `${personaInfo.color}`
                          }`}
                        >
                          {msg.role === "user" ? (
                            "U"
                          ) : (
                            <Zap className="w-4 h-4" />
                          )}
                        </div>
                        <div
                          className={`flex-1 ${
                            msg.role === "user" ? "text-right" : ""
                          }`}
                        >
                          <div
                            className={`inline-block p-3 rounded-lg max-w-xs lg:max-w-md ${
                              msg.role === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-slate-700 text-slate-100"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {msg.timestamp.toLocaleTimeString()}
                            {msg.confidence && (
                              <span className="ml-2">
                                Confidence: {(msg.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="border-t border-slate-700 p-4 space-y-2">
                  {voice.interimTranscript && (
                    <p className="text-xs text-slate-400 italic">
                      {voice.interimTranscript}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Ask the AI anything..."
                      className="bg-slate-700 border-slate-600 text-white resize-none"
                      rows={2}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={isLoading || !inputValue.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* PDF Learning Tab */}
            <TabsContent value="pdf" className="flex-1 mt-0">
              <Card className="h-full bg-slate-800 border-slate-700 flex flex-col">
                <CardHeader>
                  <CardTitle>PDF Knowledge Upload</CardTitle>
                  <CardDescription>
                    Teach the AI from PDFs (up to 1000 pages each, 50MB max)
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <div
                    className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        uploadPdf(files[0]);
                      }
                    }}
                  >
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-slate-400 mb-2">
                      Drag and drop PDF or click to select
                    </p>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          uploadPdf(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload">
                      <Button
                        as="span"
                        variant="outline"
                        className="cursor-pointer"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Select PDF
                      </Button>
                    </label>
                  </div>

                  {pdfUploadProgress > 0 && pdfUploadProgress < 100 && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">
                        Processing PDF...
                      </p>
                      <Progress value={pdfUploadProgress} />
                    </div>
                  )}

                  <div className="bg-slate-700 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-medium text-slate-300">
                      Upload History
                    </h4>
                    <p className="text-xs text-slate-500">
                      Total PDFs processed: {knowledgeStats.pdfsProcessed}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Context Tab */}
            <TabsContent value="context" className="flex-1 mt-0">
              <Card className="h-full bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle>Current Context</CardTitle>
                  <CardDescription>
                    Information {personaInfo.name} is using
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Active Persona</h4>
                    <Badge className={`${personaInfo.color}`}>
                      {personaInfo.name}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Expertise</h4>
                    <div className="flex flex-wrap gap-2">
                      {personaInfo.expertise.map((exp) => (
                        <Badge key={exp} variant="outline">
                          {exp}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Conversation History
                    </h4>
                    <p className="text-xs text-slate-400">
                      {messages.length} messages in conversation
                    </p>
                  </div>

                  <div className="bg-slate-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium">
                          Knowledge Base Ready
                        </p>
                        <p className="text-xs text-slate-500">
                          {knowledgeStats.modulesIndexed} modules indexed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium">Voice Enabled</p>
                        <p className="text-xs text-slate-500">
                          {voiceEnabled ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
