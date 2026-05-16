/**
 * Echo AI Component with Hybrid Knowledge Base Integration
 * Demonstrates how to integrate the knowledge base retrieval system with Echo
 */

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useEchoAI, useEchoStats } from "@/hooks/use-echo-knowledge-retrieval";
import { cn } from "@/lib/utils";
import { Loader2, BookOpen, Brain, Zap, TrendingUp } from "lucide-react";

interface EchoKnowledgeAIProps {
  /** Optional initial question */
  initialQuestion?: string;
  /** Callback when answer is retrieved */
  onAnswer?: (answer: string, source: string) => void;
  /** Show stats panel */
  showStats?: boolean;
  /** Custom className */
  className?: string;
}

export function EchoKnowledgeAI({
  initialQuestion = "",
  onAnswer,
  showStats = true,
  className,
}: EchoKnowledgeAIProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { ask, trainingStatus, getAnswerSource, canAnswerFromKnowledgeBase } = useEchoAI();
  const stats = useEchoStats();

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setAnswer(null);
    setSource(null);
    const startTime = performance.now();

    try {
      const result = await ask(question);
      const endTime = performance.now();

      setAnswer(result.answer);
      setSource(result.source);
      setResponseTime(Math.round(endTime - startTime));

      onAnswer?.(result.answer, result.source);
    } catch (error) {
      setAnswer(
        `Error: ${error instanceof Error ? error.message : "Failed to retrieve answer"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    setQuestion(q);
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        "space-y-4 rounded-lg border border-[#c8a97e]/80 bg-gradient-to-br from-amber-50 to-blue-50 p-4 dark:border-[#c8a97e]/30 dark:from-neutral-950 dark:to-blue-950",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-[#c8a97e] dark:text-[#c8a97e]" />
        <h3 className="font-semibold text-foreground">Echo AI with Knowledge Base</h3>
        {trainingStatus.isTrained && (
          <span className="ml-auto text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-2 py-1 rounded">
            📚 Trained ({trainingStatus.totalRecipes} recipes)
          </span>
        )}
      </div>

      {/* Status */}
      {!trainingStatus.isTrained && (
        <div className="rounded-md bg-yellow-100 dark:bg-yellow-950 p-2 text-xs text-yellow-800 dark:text-yellow-100">
          📖 <strong>Knowledge base not yet trained.</strong> Import cookbooks to enable fast recipe recall
          without API calls.
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleAsk} className="space-y-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask Echo a question... (e.g., 'How do I make tart dough?')"
            className="flex-1 rounded-md border border-[#c8a97e] bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#c8a97e] dark:border-[#b8976c] dark:bg-neutral-950/20"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="bg-[#c8a97e] hover:bg-[#b8976c] dark:bg-[#b8976c] dark:hover:bg-[#c8a97e]-600"
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Zap className="mr-1 h-4 w-4" />
                Ask
              </>
            )}
          </Button>
        </div>

        {/* Quick questions */}
        {trainingStatus.isTrained && !answer && (
          <div className="flex flex-wrap gap-1">
            {[
              "How do I make shortcrust pastry?",
              "What's the difference between baking and roasting?",
              "How do I temper chocolate?",
            ].map((q) => (
              <Button
                key={q}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handleQuickQuestion(q)}
                disabled={isLoading}
              >
                {q}
              </Button>
            ))}
          </div>
        )}
      </form>

      {/* Answer Display */}
      {answer && (
        <div className="space-y-2 rounded-md border border-[#c8a97e] bg-white dark:border-[#b8976c] dark:bg-neutral-950/30 p-3">
          {/* Source Badge */}
          {source && (
            <div className="flex items-center gap-2 text-xs">
              {source === "knowledge-base" && (
                <span className="flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-blue-800 dark:text-blue-100">
                  <BookOpen className="h-3 w-3" />
                  From Imported Books
                </span>
              )}
              {source === "openai" && (
                <span className="flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-950 px-2 py-0.5 text-purple-800 dark:text-purple-100">
                  <Brain className="h-3 w-3" />
                  From AI Model
                </span>
              )}
              {source === "hybrid" && (
                <span className="flex items-center gap-1 rounded-full bg-white/80 dark:bg-[#c8a97e]/30 px-2 py-0.5 text-[#c8a97e]/40 dark:text-white/80">
                  <Zap className="h-3 w-3" />
                  Hybrid (Books + AI)
                </span>
              )}
              {responseTime && (
                <span className="ml-auto text-muted-foreground">
                  {responseTime}ms
                </span>
              )}
            </div>
          )}

          {/* Answer Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm whitespace-pre-wrap text-foreground">
            {answer}
          </div>

          {/* New Question */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              setQuestion("");
              setAnswer(null);
              inputRef.current?.focus();
            }}
          >
            Ask another question
          </Button>
        </div>
      )}

      {/* Stats */}
      {showStats && trainingStatus.isTrained && (
        <div className="border-t border-[#c8a97e]/80 dark:border-[#c8a97e]/30 pt-3">
          <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-blue-100/50 dark:bg-blue-950/50 p-2">
              <div className="font-semibold text-blue-900 dark:text-blue-100">
                {stats.kbHitRate}%
              </div>
              <div className="text-blue-700 dark:text-blue-300">KB Hit Rate</div>
            </div>
            <div className="rounded-md bg-green-100/50 dark:bg-green-950/50 p-2">
              <div className="font-semibold text-green-900 dark:text-green-100">
                {stats.costSavings}%
              </div>
              <div className="text-green-700 dark:text-green-300">Cost Savings</div>
            </div>
            <div className="rounded-md bg-purple-100/50 dark:bg-purple-950/50 p-2">
              <div className="font-semibold text-purple-900 dark:text-purple-100">
                {stats.totalQuestions}
              </div>
              <div className="text-purple-700 dark:text-purple-300">
                Questions Answered
              </div>
            </div>
            <div className="rounded-md bg-white/50 dark:bg-neutral-950/50 p-2">
              <div className="font-semibold text-[#c8a97e]/30 dark:text-white/80">
                {stats.averageResponseTimeMs}ms
              </div>
              <div className="text-[#b8976c] dark:text-[#c8a97e]">Avg Response</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simplified version for embedding in other components
 */
export function EchoKnowledgeAICompact() {
  const [question, setQuestion] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { ask, trainingStatus } = useEchoAI();
  const stats = useEchoStats();

  if (!trainingStatus.isTrained) {
    return (
      <div className="text-xs text-muted-foreground">
        📚 Knowledge base not trained. Import cookbooks to enable fast recipe recall.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-foreground">
        🧠 Echo AI ({stats.kbHitRate}% from knowledge base)
      </div>
      <div className="flex gap-1 text-xs">
        <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-1">
          {stats.totalQuestions} questions
        </span>
        <span className="rounded-full bg-green-100 dark:bg-green-900 px-2 py-1">
          Save {stats.costSavings}% API cost
        </span>
      </div>
    </div>
  );
}
