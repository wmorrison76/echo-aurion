import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader } from "lucide-react";
import { IntakeAnswers } from "./types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface CakeRefinementChatProps {
  intakeAnswers: IntakeAnswers;
  onComplete: (refinedAnswers: Partial<IntakeAnswers>) => void;
  onSkip: () => void;
}

const INITIAL_SYSTEM_PROMPT = `You are an expert cake designer assistant. Your role is to help the customer refine their cake design through thoughtful questions. 

Based on their initial intake form, ask specific questions to understand:
1. Visual style and aesthetic (modern, classic, whimsical, minimalist, etc.)
2. Color preferences and combinations
3. Specific decorative elements (flowers, piping, glitter, fondant work, etc.)
4. Texture and surface treatments (smooth, textured, drip, etc.)
5. Any specific themes, patterns, or inspirations
6. Special requests or must-haves

Ask ONE question at a time. Be conversational and encouraging. Help them visualize their ideal cake.`;

export default function CakeRefinementChat({
  intakeAnswers,
  onComplete,
  onSkip,
}: CakeRefinementChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWaiting, setIsWaiting] = useState(false);
  const [refinedAnswers, setRefinedAnswers] = useState<Partial<IntakeAnswers>>(
    {},
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat on mount
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // First message from assistant
        const systemContext = `The customer's initial info:
- Event: ${intakeAnswers.occasion} on ${intakeAnswers.eventDate}
- Guest count: ${intakeAnswers.guestCount}
- Cake shape: ${intakeAnswers.tiersShape}
- Tiers: ${intakeAnswers.tierCount}
- Base flavor: ${intakeAnswers.flavors?.[0] || "Not specified"}
- Frosting: ${intakeAnswers.frostings?.[0] || "Not specified"}
- Design complexity desired: ${intakeAnswers.designComplexity || "Not specified"}`;

        const initialMessage: Message = {
          id: "msg-0",
          role: "assistant",
          content: `Perfect! I can see you're planning a ${intakeAnswers.occasion} with ${intakeAnswers.guestCount} guests on ${intakeAnswers.eventDate}. Let's refine your cake design together to make it exactly what you're dreaming of!\n\nFirst question: What's the overall aesthetic or style you're going for? Are you thinking modern & minimalist, classic & elegant, fun & whimsical, or something else entirely?`,
          timestamp: new Date(),
        };

        setMessages([initialMessage]);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [intakeAnswers]);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsWaiting(true);

    try {
      // Call AI API to get response
      // For now, use a simulated response
      // In production, this would call your AI³ backend
      const response = await generateAIResponse(
        inputValue,
        messages,
        intakeAnswers,
      );

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Extract any refined information from the response
      // This is a simple extraction - in production, you'd parse more thoroughly
      if (inputValue.toLowerCase().includes("color")) {
        setRefinedAnswers((prev) => ({
          ...prev,
          textureNotes: `${prev.textureNotes || ""} ${inputValue}`.trim(),
        }));
      }
    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content:
          "Sorry, I encountered an error. Could you repeat that? Or feel free to skip to the design studio.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsWaiting(false);
    }
  };

  const generateAIResponse = async (
    userInput: string,
    chatHistory: Message[],
    intakeData: IntakeAnswers,
  ): Promise<string> => {
    // Simulated AI responses based on user input
    // In production, this would call OpenAI or your AI³ service

    const responses = [
      "That sounds beautiful! Can you tell me more about the colors you're imagining?",
      "Wonderful choice! What kind of decorative elements would you like - fresh flowers, piping details, fondant work, or something else?",
      "I love that! For the cake shape and tiers, are you thinking a traditional stacked design, or would you prefer something more modern?",
      "Great! Will there be any text, numbers, or personalization on the cake?",
      "Perfect! How do you envision the texture - smooth and sleek, rustic and textured, or with specific piping patterns?",
      "That's a great detail! Anything else we should keep in mind for your design?",
    ];

    // Return a random response for now (simulated)
    return responses[Math.floor(Math.random() * responses.length)];
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-600 to-pink-600 text-white p-6 flex items-center gap-4 shadow-lg">
        <div className="text-3xl">✨</div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Refine Your Cake Design</h2>
          <p className="text-purple-100 text-sm">
            AI³-powered conversation to create your perfect cake
          </p>
        </div>
        <div className="text-4xl opacity-20">🤖</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-full gap-3">
            <Loader className="animate-spin text-purple-600" size={28} />
            <span className="text-gray-600 font-medium">
              Starting conversation...
            </span>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-sm lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-br-none"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-2 ${
                      message.role === "user"
                        ? "text-purple-100"
                        : "text-gray-500"
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
            {isWaiting && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 px-4 py-3 rounded-2xl rounded-bl-none border border-gray-200 shadow-sm">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-6 bg-white space-y-4 shadow-lg">
        <div className="flex gap-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Share your cake design ideas..."
            disabled={isWaiting}
            className="text-sm px-4 py-2.5 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <Button
            onClick={sendMessage}
            disabled={isWaiting || !inputValue.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg"
          >
            <Send size={18} />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            onClick={onSkip}
            variant="outline"
            className="text-sm px-6 py-2.5 rounded-lg"
          >
            Skip to Design Studio
          </Button>
          <Button
            onClick={() => onComplete(refinedAnswers)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm px-6 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition"
          >
            Finish & Go to Studio →
          </Button>
        </div>
      </div>
    </div>
  );
}
