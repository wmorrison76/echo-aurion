import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle2,
  Send,
  Plus,
  Pause,
  Play,
} from "lucide-react";

interface DialogueMessage {
  id: string;
  timestamp: string;
  speaker: "echo" | "openai" | "system";
  content: string;
  messageType:
    | "question"
    | "answer"
    | "suggestion"
    | "correction"
    | "confirmation";
}

interface TrainingDialogueProps {
  domain: "culinary" | "finance" | "hospitality" | "beverage" | "safety";
  focusAreas: string[];
  onDialogueComplete?: (summary: string) => void;
  onKnowledgeCapture?: (knowledge: any[]) => void;
}

interface KnowledgeProposal {
  type: string;
  title: string;
  content: string;
  confirmed: boolean;
}

export function EchoOpenAITrainingMode({
  domain,
  focusAreas,
  onDialogueComplete,
  onKnowledgeCapture,
}: TrainingDialogueProps) {
  const [dialogueId, setDialogueId] = useState<string>("");
  const [messages, setMessages] = useState<DialogueMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [knowledgeProposals, setKnowledgeProposals] = useState<
    KnowledgeProposal[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    questionsAsked: 0,
    knowledgeItems: 0,
  });

  useEffect(() => {
    if (isInitializing) {
      initializeDialogue();
    }
  }, [isInitializing]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeDialogue = async () => {
    try {
      setIsInitializing(true);

      const response = await fetch("/api/echo-training/init-dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          focusAreas,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.code === "insufficient_quota"
            ? "OpenAI API quota exceeded. Please check your billing settings and try again."
            : data.error ||
              "Failed to initialize dialogue. Please check your connection and try again.";

        const errorMsg: DialogueMessage = {
          id: `msg-error-${Date.now()}`,
          timestamp: new Date().toISOString(),
          speaker: "system",
          content: `❌ Initialization Error: ${errorMessage}`,
          messageType: "correction",
        };
        setMessages([errorMsg]);
        console.error(
          "Dialogue initialization failed:",
          data.code || "unknown error",
          data.message,
        );
        return;
      }

      const dialogue = data.dialogue;

      setDialogueId(dialogue.id);
      setMessages(dialogue.messages);
      setIsActive(true);
      setStats((s) => ({ ...s, questionsAsked: 1 }));
    } catch (error) {
      console.error("Dialogue initialization failed:", error);
      const errorMsg: DialogueMessage = {
        id: `msg-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        speaker: "system",
        content:
          "❌ Network error: Unable to connect to training service. Please check your connection and try again.",
        messageType: "correction",
      };
      setMessages([errorMsg]);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !dialogueId || isLoading) return;

    const userMessage: DialogueMessage = {
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      speaker: "echo",
      content: userInput,
      messageType: "question",
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/echo-training/dialogue-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dialogueId,
          currentMessage: userInput,
          domain,
          focusAreas,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process dialogue turn");
      }

      const data = await response.json();

      if (data.openaiMessage) {
        setMessages((prev) => [...prev, data.openaiMessage]);
        setStats((s) => ({ ...s, questionsAsked: s.questionsAsked + 1 }));
      }

      if (data.knowledgeExtracted && data.knowledgeExtracted.length > 0) {
        setKnowledgeProposals((prev) => [
          ...prev,
          ...data.knowledgeExtracted.map((p: string) => ({
            type: "concept",
            title: p.split(":")[0],
            content: p,
            confirmed: false,
          })),
        ]);
      }

      await captureKnowledgeAutomatically(data.openaiMessage.content);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: DialogueMessage = {
        id: `msg-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        speaker: "system",
        content: "Failed to process message. Please try again.",
        messageType: "correction",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const captureKnowledgeAutomatically = async (openaiResponse: string) => {
    try {
      const response = await fetch(
        "/api/echo-training/auto-capture-openai-knowledge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            openaiResponse,
            context: `Training dialogue for ${domain}. Focus areas: ${focusAreas.join(", ")}`,
            domain,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        console.log(
          `[Knowledge Capture] Extracted ${data.extracted} items:`,
          data.knowledge,
        );

        if (data.knowledge && data.knowledge.length > 0) {
          const numItems = data.knowledge.length;
          setStats((s) => ({
            ...s,
            knowledgeItems: s.knowledgeItems + numItems,
          }));

          const learningMessage: DialogueMessage = {
            id: `msg-learning-${Date.now()}`,
            timestamp: new Date().toISOString(),
            speaker: "system",
            content: `📚 Captured ${numItems} new knowledge item${numItems !== 1 ? "s" : ""}: ${data.knowledge.map((k: any) => k.title).join(", ")}`,
            messageType: "confirmation",
          };
          setMessages((prev) => [...prev, learningMessage]);

          if (onKnowledgeCapture) {
            onKnowledgeCapture(data.knowledge);
          }
        }
      } else {
        const errorData = await response.text();
        console.error("[Knowledge Capture] Server error:", errorData);
      }
    } catch (error) {
      console.error("[Knowledge Capture] Failed to capture knowledge:", error);
    }
  };

  const handleConfirmKnowledge = async () => {
    const confirmedItems = knowledgeProposals.filter((p) => p.confirmed);

    if (confirmedItems.length === 0) return;

    try {
      const response = await fetch(
        "/api/echo-training/save-learned-knowledge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dialogueId,
            knowledge: confirmedItems.map((item) => ({
              id: `knowledge-${Date.now()}-${Math.random()}`,
              type: item.type,
              title: item.title,
              description: item.content,
              content: item.content,
              sourceType: "openai",
              tags: [domain, ...focusAreas],
              domain,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })),
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setKnowledgeProposals((prev) => prev.filter((p) => !p.confirmed));

        const confirmMessage: DialogueMessage = {
          id: `msg-confirm-${Date.now()}`,
          timestamp: new Date().toISOString(),
          speaker: "system",
          content: `✓ Learned and stored ${data.stored} knowledge items`,
          messageType: "confirmation",
        };
        setMessages((prev) => [...prev, confirmMessage]);
      }
    } catch (error) {
      console.error("Failed to confirm knowledge:", error);
    }
  };

  const handleCompleteDialogue = async () => {
    try {
      const response = await fetch("/api/echo-training/complete-dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dialogueId,
          dialogue: {
            id: dialogueId,
            messages,
            domain,
            topic: `Training in ${domain}`,
            status: "completed",
            trainedKnowledge: [],
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsActive(false);

        const summaryMessage: DialogueMessage = {
          id: `msg-summary-${Date.now()}`,
          timestamp: new Date().toISOString(),
          speaker: "system",
          content: data.summary,
          messageType: "confirmation",
        };
        setMessages((prev) => [...prev, summaryMessage]);

        if (onDialogueComplete) {
          onDialogueComplete(data.summary);
        }
      }
    } catch (error) {
      console.error("Failed to complete dialogue:", error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-indigo-900">
              Echo AI Training Mode
            </h2>
            <p className="text-sm text-indigo-700 mt-1">
              Learning domain:{" "}
              <span className="font-medium capitalize">{domain}</span>
            </p>
            <p className="text-sm text-indigo-600">
              Focus areas: {focusAreas.join(", ")}
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-2 justify-end">
              <AlertCircle className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-900">
                {stats.questionsAsked} questions
              </span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                {stats.knowledgeItems} items learned
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white border-gray-200 h-96 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.speaker === "echo" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.speaker === "echo"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : message.speaker === "system"
                    ? message.messageType === "confirmation"
                      ? "bg-green-100 text-green-900 rounded-none border-l-4 border-green-500"
                      : "bg-gray-100 text-gray-900 rounded-none"
                    : "bg-indigo-100 text-indigo-900 rounded-bl-none"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.speaker === "echo"
                    ? "text-blue-200"
                    : message.speaker === "system"
                      ? "text-gray-600"
                      : "text-gray-500"
                }`}
              >
                {message.speaker === "system"
                  ? "System"
                  : message.speaker === "echo"
                    ? "Echo"
                    : "OpenAI"}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </Card>

      {knowledgeProposals.length > 0 && (
        <Card className="bg-amber-50 border-amber-200 p-4">
          <h3 className="font-semibold text-amber-900 mb-3">
            Proposed Knowledge Items ({knowledgeProposals.length})
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {knowledgeProposals.map((proposal, index) => (
              <label
                key={index}
                className="flex items-start gap-3 p-2 hover:bg-amber-100 rounded"
              >
                <input
                  type="checkbox"
                  checked={proposal.confirmed}
                  onChange={(e) => {
                    setKnowledgeProposals((prev) =>
                      prev.map((p, i) =>
                        i === index ? { ...p, confirmed: e.target.checked } : p,
                      ),
                    );
                  }}
                  className="mt-1"
                />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-amber-900">{proposal.title}</p>
                  <p className="text-amber-700 text-xs">
                    {proposal.content.substring(0, 100)}...
                  </p>
                </div>
              </label>
            ))}
          </div>
          <Button
            onClick={handleConfirmKnowledge}
            disabled={!knowledgeProposals.some((p) => p.confirmed) || isLoading}
            className="mt-3 w-full bg-amber-600 hover:bg-amber-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Learn Selected (
            {knowledgeProposals.filter((p) => p.confirmed).length})
          </Button>
        </Card>
      )}

      {isActive && (
        <div className="flex gap-2">
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask Echo a question or provide feedback..."
            disabled={isLoading || isInitializing}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!userInput.trim() || isLoading || isInitializing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleCompleteDialogue}
          disabled={isInitializing || messages.length < 2}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          Complete Training Session
        </Button>
        <Button
          variant="outline"
          onClick={() => initializeDialogue()}
          disabled={isInitializing}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </div>
    </div>
  );
}
