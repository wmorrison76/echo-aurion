import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Send,
  Loader2,
  BookOpen,
  AlertCircle,
  Sparkles,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import {
  searchProcedures,
  getProceduresByCategory,
} from "@/lib/echo-procedures-service";
import { useMasterDictionary } from "@/hooks/use-master-dictionary";
import type { ProcedureSearchResult } from "@/lib/echo-procedures-service";
import { fuzzySearchTerms, fuzzySearchMultiple } from "@/lib/fuzzy-search";
import { filterContent, getFilterMessage } from "@/lib/content-safety-filter";

interface Message {
  role: "user" | "echo";
  content: string;
  procedures?: ProcedureSearchResult[];
  isDictionaryResult?: boolean;
}

export default function AskEchoPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "echo",
      content:
        "Hello! I'm Echo, your culinary knowledge assistant. Ask me about cooking techniques, meat fabrication, pastry methods, or any culinary procedure. What would you like to learn?",
    },
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { searchTerm, searchAllKnowledge } = useMasterDictionary();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * Extract culinary term from natural language question
   */
  const extractTermFromQuestion = (question: string): string => {
    const q = question.toLowerCase().trim();

    // Patterns: "what does X mean?", "what is X?", "define X", "X is what?"
    const patterns = [
      /what\s+(?:does|is)\s+([a-z\s\-]+?)\s+mean\??/i,
      /what\s+(?:does|is)\s+([a-z\s\-]+?)\s*\??$/i,
      /define\s+([a-z\s\-]+?)\s*\??$/i,
      /(?:tell me about|explain|describe)\s+([a-z\s\-]+?)\s*\??$/i,
      /^([a-z\s\-]+?)\s+is\s+what\??$/i,
      /how\s+(?:do you|do we|do i)\s+([a-z\s\-]+?)\s*\??$/i,
    ];

    for (const pattern of patterns) {
      const match = q.match(pattern);
      if (match && match[1]) {
        let term = match[1]
          .trim()
          .replace(/\s+/g, "-") // Replace spaces with hyphens for compound terms
          .replace(/[^a-z\-]/g, ""); // Remove any non-alphanumeric except hyphens

        if (term.length > 1) {
          return term;
        }
      }
    }

    // Fallback: if no pattern matches, use first 1-2 words as term
    const words = q
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 2 &&
          ![
            "what",
            "does",
            "mean",
            "is",
            "the",
            "a",
            "an",
            "define",
            "explain",
            "tell",
            "about",
            "describe",
            "how",
            "do",
            "you",
            "we",
            "this",
            "that",
          ].includes(w),
      );
    if (words.length > 0) {
      return words[0].replace(/[?.,!]/g, "");
    }

    return question.trim(); // Last resort: return original
  };

  const handleAsk = async () => {
    if (!query.trim()) return;

    const userMessage = query.trim();
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      // Check if content is appropriate
      const safetyCheck = filterContent(userMessage);
      if (!safetyCheck.isSafe) {
        setMessages((prev) => [
          ...prev,
          {
            role: "echo",
            content: `${getFilterMessage(safetyCheck)}\n\n💡 Try asking about cooking techniques, ingredients, recipes, kitchen management, food safety, or restaurant operations instead.`,
          },
        ]);
        setLoading(false);
        return;
      }

      // Extract the actual culinary term from the question
      const extractedTerm = extractTermFromQuestion(userMessage);

      // Use the new search-and-learn endpoint
      // This will check the knowledge base first, and if not found, query external LLMs
      let searchResponse;
      try {
        const response = await fetch(
          "/api/echo/hungry-learning/search-and-learn",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ term: extractedTerm }),
          },
        );

        if (response.ok) {
          try {
            searchResponse = await response.json();
          } catch (parseErr) {
            console.error(
              "[Echo] Error parsing search-and-learn response:",
              parseErr,
            );
            // Fall back to traditional search
            const dictionaryResult = await searchTerm(extractedTerm);
            if (dictionaryResult?.entry?.term) {
              searchResponse = {
                status: "success",
                entry: dictionaryResult.entry,
                message: dictionaryResult.entry.term,
              };
            }
          }
        } else {
          // If search-and-learn returns error status, fall back to traditional search
          console.log(
            `[Echo] Search-and-learn returned error status ${response.status}, falling back to traditional search`,
          );
          try {
            const dictionaryResult = await searchTerm(extractedTerm);
            if (dictionaryResult?.entry?.term) {
              searchResponse = {
                status: "success",
                entry: dictionaryResult.entry,
                message: dictionaryResult.entry.term,
              };
            }
          } catch (fallbackErr) {
            console.error("[Echo] Fallback search also failed:", fallbackErr);
          }
        }
      } catch (err) {
        console.error("[Echo] Error calling search-and-learn:", err);
        // Fall back to traditional search
        try {
          const dictionaryResult = await searchTerm(extractedTerm);
          if (dictionaryResult?.entry?.term) {
            searchResponse = {
              status: "success",
              entry: dictionaryResult.entry,
              message: dictionaryResult.entry.term,
            };
          }
        } catch (fallbackErr) {
          console.error("[Echo] Fallback search also failed:", fallbackErr);
        }
      }

      // If we have a result from search-and-learn or traditional search
      let dictionaryResult = searchResponse;

      if (
        dictionaryResult &&
        dictionaryResult.status === "success" &&
        dictionaryResult.entry
      ) {
        const source = dictionaryResult.source || "master-dictionary";
        const entry = dictionaryResult.entry;
        let response = "";

        if (
          source === "pinecone-pdf-library" ||
          source === "internal-pdf-library"
        ) {
          // Format Pinecone/Internal PDF result
          response = `📖 **${extractedTerm}**\n\n`;
          response += `**Found in your knowledge library:**\n`;
          const sourceFile =
            entry.sourceFile || entry.source || "Unknown Source";
          response += `Source: ${sourceFile}\n`;
          const similarity =
            entry.similarity !== undefined ? entry.similarity : 0;
          response += `Match: ${(similarity * 100).toFixed(0)}%\n\n`;
          response += `**Definition:** ${entry.definition || entry.content || "Information found in your knowledge"}\n\n`;

          if (
            entry.allResults &&
            Array.isArray(entry.allResults) &&
            entry.allResults.length > 1
          ) {
            response += `**Related information:**\n`;
            entry.allResults.slice(1).forEach((result: any, idx: number) => {
              if (result && result.definition) {
                const relatedSim =
                  result.similarity !== undefined ? result.similarity : 0;
                response += `${idx + 1}. (${(relatedSim * 100).toFixed(0)}% match) ${(result.definition || "").substring(0, 100)}...\n`;
              }
            });
          }
        } else if (source === "external-llm-learning") {
          // Format externally learned result
          const term = entry.term;
          if (term && typeof term === "object") {
            response = `🌐 **${term.term || extractedTerm}**\n\n`;
            response += `**Definition:** ${term.definition || "Definition pending"}\n\n`;
            response += `**Source:** Learned from external knowledge (OpenAI)\n`;
            const confidence = term.confidence || 0.85;
            response += `**Confidence:** ${(confidence * 100).toFixed(0)}%\n`;
          } else {
            response = `🌐 **${extractedTerm}**\n\n`;
            response += `**Definition:** ${entry.definition || "Information found"}\n\n`;
            response += `**Source:** Learned from external knowledge\n`;
          }
        } else {
          // Format master dictionary result
          const term = entry.term;

          // Safety check - ensure term is an object
          if (term && typeof term === "object") {
            response = `📚 **${term.term || extractedTerm}**\n\n`;
            response += `**Definition:** ${term.definition || "No definition available"}\n\n`;

            if (term.usage && term.usage.primary) {
              response += `**Usage:** ${term.usage.primary}`;
              if (term.usage.secondary && term.usage.secondary.length > 0) {
                response += `\n- Also used for: ${term.usage.secondary.join(", ")}`;
              }
              response += `\n\n`;
            }

            if (term.etymology && term.etymology.origin) {
              response += `**Etymology:** From ${term.etymology.origin}`;
              if (term.etymology.originalWord) {
                response += ` - "${term.etymology.originalWord}"`;
              }
              if (term.etymology.meaning) {
                response += ` meaning "${term.etymology.meaning}"`;
              }
              response += `\n\n`;
            }

            if (term.applications && term.applications.primary) {
              response += `**Applications:** ${term.applications.primary}\n`;
              if (
                term.applications.examples &&
                term.applications.examples.length > 0
              ) {
                response += `- Examples: ${term.applications.examples.join(", ")}\n`;
              }
              if (
                term.applications.dishes &&
                term.applications.dishes.length > 0
              ) {
                response += `- Used in: ${term.applications.dishes.join(", ")}\n`;
              }
              response += "\n";
            }

            if (term.relatedTerms && term.relatedTerms.length > 0) {
              response += `**Related terms:** ${term.relatedTerms.join(", ")}\n`;
            }

            const masteryLevel = term.masteryLevel || "intermediate";
            const confidence = term.confidence || 0.85;
            response += `\n✨ **Mastery Level:** ${masteryLevel} | **Confidence:** ${(confidence * 100).toFixed(0)}%`;
          } else {
            // Fallback if term structure is unexpected
            response = `📚 **${extractedTerm}**\n\n`;
            response += `**Definition:** ${entry.definition || "Information found"}\n\n`;
            if (entry.content) {
              response += `**Content:** ${entry.content}\n`;
            }
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "echo",
            content: response,
            isDictionaryResult: true,
          },
        ]);
      } else {
        // Not found in master dictionary, try searching all knowledge first
        let allKnowledgeResults;
        try {
          allKnowledgeResults = await searchAllKnowledge(extractedTerm);
        } catch (err) {
          console.error("[Echo] Error calling searchAllKnowledge:", err);
          allKnowledgeResults = null;
        }

        // If found in other knowledge sources, use that
        if (
          allKnowledgeResults &&
          allKnowledgeResults.results &&
          (allKnowledgeResults.results.masterDictionary?.length > 0 ||
            allKnowledgeResults.results.terminology?.length > 0 ||
            allKnowledgeResults.results.hospitality?.length > 0)
        ) {
          let response = `✨ I was able to research and find information about **${extractedTerm}**:\n\n`;

          if (allKnowledgeResults.results.masterDictionary?.length > 0) {
            const term = allKnowledgeResults.results.masterDictionary[0];
            response += `📚 **Definition:** ${term.definition || "A culinary technique or ingredient"}\n\n`;
            if (term.usage) {
              response += `**Usage:** ${term.usage}\n\n`;
            }
          }

          if (allKnowledgeResults.results.terminology?.length > 0) {
            const term = allKnowledgeResults.results.terminology[0];
            response += `📖 **From Terminology:** ${term.definition || ""}\n\n`;
          }

          if (allKnowledgeResults.results.hospitality?.length > 0) {
            const item = allKnowledgeResults.results.hospitality[0];
            response += `🏨 **From Hospitality Knowledge:** ${item.description || ""}\n\n`;
          }

          response += `💡 Tip: Ask me "How do I use ${extractedTerm}?" or "Tell me more about ${extractedTerm}" for additional details.`;

          setMessages((prev) => [
            ...prev,
            {
              role: "echo",
              content: response,
              isDictionaryResult: true,
            },
          ]);
        } else {
          // Not found in knowledge, try procedures with original message
          let results;
          try {
            results = await searchProcedures(userMessage, 3);
          } catch (err) {
            console.error("[Echo] Error calling searchProcedures:", err);
            results = [];
          }

          if (results.length === 0) {
            const termHint =
              extractedTerm !== userMessage
                ? `\n\n💡 I searched for "${extractedTerm}" but didn't find it in my knowledge base yet.`
                : "";

            setMessages((prev) => [
              ...prev,
              {
                role: "echo",
                content: `I couldn't find information about "${extractedTerm || userMessage}".${termHint}

Available terms I know: sauce, sauté, simmer, boil, roast, braise, poach, mise-en-place, brunoise, julienne, mirepoix, beurre-blanc, umami

Try asking: "What does sauce mean?" or "What is braising?" or "Define mise-en-place"`,
                procedures: [],
              },
            ]);
          } else {
            // Build response from procedures
            let response = `I found ${results.length} relevant procedure(s) for "${userMessage}":\n\n`;

            results.forEach((result, index) => {
              response += `**${index + 1}. ${result.procedure.title}** (${result.procedure.category})`;
              if (result.procedure.time_estimate) {
                response += ` - ${result.procedure.time_estimate}`;
              }
              if (result.procedure.difficulty) {
                response += ` - ${result.procedure.difficulty} level`;
              }
              response += `\n\n`;

              // Add steps
              response += `Steps:\n`;
              result.procedure.steps.forEach((step) => {
                response += `${step.number}. ${step.instruction}\n`;
                if (step.tips) {
                  response += `   💡 Tip: ${step.tips}\n`;
                }
              });

              // Add tools if available
              if (result.procedure.tools && result.procedure.tools.length > 0) {
                response += `\nTools needed: ${result.procedure.tools.join(", ")}\n`;
              }

              // Add materials if available
              if (
                result.procedure.materials &&
                result.procedure.materials.length > 0
              ) {
                response += `Materials: ${result.procedure.materials.join(", ")}\n`;
              }

              response += "\n---\n\n";
            });

            setMessages((prev) => [
              ...prev,
              {
                role: "echo",
                content: response,
                procedures: results,
              },
            ]);
          }
        }
      }
    } catch (error) {
      console.error("Error searching knowledge:", error);
      toast.error("Failed to search culinary knowledge");
      setMessages((prev) => [
        ...prev,
        {
          role: "echo",
          content:
            "I encountered an error while searching for knowledge. Please try again with a different question.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <div>
            <CardTitle>Ask Echo</CardTitle>
            <CardDescription>
              Master culinary knowledge assistant with 10,000+ terms
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col p-4">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap break-words">
                  {msg.content.split("\n").map((line, i) => {
                    // Bold text between **
                    if (line.includes("**")) {
                      return (
                        <div key={i}>
                          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => (
                            <span
                              key={j}
                              className={
                                part.startsWith("**") ? "font-bold" : ""
                              }
                            >
                              {part.replace(/\*\*/g, "")}
                            </span>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={i}
                        className={line.startsWith("💡") ? "mt-1 italic" : ""}
                      >
                        {line}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-4 py-2 border border-slate-200 dark:border-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t pt-4 space-y-2">
          {messages.filter((m) => m.role === "echo").length === 1 && (
            <div className="text-xs text-slate-600 dark:text-slate-400 flex gap-1">
              <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>
                Import textbooks first in the RECIPES tab to populate knowledge
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="How do I break down a lamb rack? Ask me anything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="text-sm"
            />
            <Button
              onClick={handleAsk}
              disabled={loading || !query.trim()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
