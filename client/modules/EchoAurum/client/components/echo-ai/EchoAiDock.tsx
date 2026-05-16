import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
type MessageRole = "user" | "assistant";
type AssistantPayload = {
  topic: string;
  headline: string;
  narrative: string;
  confidence: number;
  signals: {
    label: string;
    value: string;
    trend: "up" | "down" | "stable";
    horizon: string;
  }[];
  recommendations: { title: string; description: string }[];
  references: string[];
};
type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      payload: AssistantPayload;
    };
const suggestions = [
  "What is our cash position this quarter?",
  "Explain the biggest forecast variance today.",
  "Are AP invoices clear for payment?",
];
function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}
function trendBadge(trend: AssistantPayload["signals"][number]["trend"]) {
  switch (trend) {
    case "up":
      return "text-emerald-300";
    case "down":
      return "text-rose-300";
    default:
      return "text-sky-200";
  }
}
export function EchoAiDock() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content:
        "EchoAi³ ready. Ask about cash flow, variance, or accounts payable to receive live intelligence.",
      payload: {
        topic: "welcome",
        headline:
          "Operational graph live across EchoLedger², EchoStratus Ai³, and EchoSentinel.",
        narrative:
          "Signals stream from NetSuite, OPERA, Toast, and the LUCCCA vendor exchange—the same mesh LUCCCA runs in production. Use the console to trigger variance narratives, cash ladder checks, and AP automation actions.",
        confidence: 0.76,
        signals: [
          {
            label: "Ledger Consistency",
            value: "99.9%",
            trend: "stable",
            horizon: "Trailing 30",
          },
          {
            label: "Forecast Accuracy",
            value: "±1.8%",
            trend: "up",
            horizon: "Current period",
          },
        ],
        recommendations: [
          {
            title: "Check liquidity",
            description:
              "Ask about cash ladder health to validate treasury posture before morning stand-up.",
          },
          {
            title: "Diagnose variance",
            description:
              "Request the top forecast variance so EchoAi³ can surface the root cause automatically.",
          },
        ],
        references: ["EchoLedger²", "EchoStratus Ai³", "EchoSentinel"],
      },
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const canSend = useMemo(
    () => input.trim().length > 2 && !loading,
    [input, loading],
  );
  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }
    const id = crypto.randomUUID();
    const newUserMessage: ChatMessage = { id, role: "user", content: trimmed };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/echo-ai/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = (await response.json()) as { response: AssistantPayload };
      const assistantMessage: ChatMessage = {
        id: `${id}-assistant`,
        role: "assistant",
        content: data.response.headline,
        payload: data.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
      toast({
        title: "EchoAi³ unreachable",
        description:
          "Unable to retrieve an insight. Please retry in a few seconds.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }
  function handleSuggestionClick(value: string) {
    setInput(value);
  }
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-border/40 bg-gradient-to-br from-surface via-surface-variant/70 to-surface p-6 shadow-[0_45px_90px_-50px_rgba(15,20,34,0.8)]">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <p className="inline-flex items-center gap-2 rounded-full border border-aurum-300/50 bg-aurum-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
            {" "}
            <Sparkles className="h-3.5 w-3.5" /> Echo Ai³ console{" "}
          </p>{" "}
          <h3 className="mt-3 text-xl font-semibold text-foreground">
            {" "}
            Conversational intelligence with guardian-grade context.{" "}
          </h3>{" "}
        </div>{" "}
        <div className="text-right text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {" "}
          <p>Latency SLA &lt; 200ms</p> <p>Confidence streaming</p>{" "}
        </div>{" "}
      </div>{" "}
      <div className="rounded-2xl border border-border/40 bg-surface/80 p-4">
        {" "}
        <div className="scrollbar-thin max-h-[420px] space-y-4 overflow-y-auto pr-1">
          {" "}
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              {" "}
              <p
                className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground"
                aria-label={
                  message.role === "user" ? "User message" : "EchoAi³ response"
                }
              >
                {" "}
                {message.role === "user" ? "You" : "EchoAi³"}{" "}
              </p>{" "}
              {message.role === "user" ? (
                <div className="rounded-2xl border border-border/50 bg-surface px-4 py-3 text-sm text-foreground">
                  {" "}
                  {message.content}{" "}
                </div>
              ) : (
                <div className="space-y-4 rounded-2xl border border-border/50 bg-gradient-to-br from-[#101726] via-[#0c1320] to-[#080d15] px-4 py-4 text-sm text-slate-200 shadow-inner shadow-black/20">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-sm font-semibold text-white">
                      {" "}
                      {message.payload.headline}{" "}
                    </p>{" "}
                    <p className="mt-2 text-xs text-slate-300">
                      {" "}
                      {message.payload.narrative}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {" "}
                    {message.payload.signals.map((signal) => (
                      <div
                        key={`${message.id}-${signal.label}`}
                        className="rounded-xl border border-white/10 bg-background px-3 py-2"
                      >
                        {" "}
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300">
                          {" "}
                          {signal.label}{" "}
                        </p>{" "}
                        <p
                          className={`mt-2 text-base font-semibold ${trendBadge(signal.trend)}`}
                        >
                          {" "}
                          {signal.value}{" "}
                        </p>{" "}
                        <p className="text-[11px] text-slate-400">
                          {" "}
                          {signal.horizon}{" "}
                        </p>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                  <div className="grid gap-3">
                    {" "}
                    {message.payload.recommendations.map((step) => (
                      <div
                        key={`${message.id}-${step.title}`}
                        className="rounded-xl border border-white/10 bg-background px-3 py-3"
                      >
                        {" "}
                        <p className="text-xs font-semibold text-white">
                          {" "}
                          {step.title}{" "}
                        </p>{" "}
                        <p className="text-xs text-slate-300">
                          {" "}
                          {step.description}{" "}
                        </p>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    {" "}
                    <span>
                      {" "}
                      Confidence{" "}
                      {formatConfidence(message.payload.confidence)}{" "}
                    </span>{" "}
                    <span className="flex flex-wrap gap-2 text-[10px]">
                      {" "}
                      {message.payload.references.map((reference) => (
                        <span
                          key={`${message.id}-${reference}`}
                          className="rounded-full border border-white/10 px-2 py-1"
                        >
                          {" "}
                          {reference}{" "}
                        </span>
                      ))}{" "}
                    </span>{" "}
                  </div>{" "}
                </div>
              )}{" "}
            </div>
          ))}{" "}
        </div>{" "}
        <form onSubmit={sendMessage} className="mt-4 flex items-end gap-3">
          {" "}
          <div className="flex-1 rounded-2xl border border-border/60 bg-surface px-4 py-2">
            {" "}
            <label htmlFor="echo-ai-input" className="sr-only">
              {" "}
              Message EchoAi³{" "}
            </label>{" "}
            <textarea
              id="echo-ai-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask EchoAi³ anything about LUCCCA finance…"
              className="h-20 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              maxLength={500}
            />{" "}
          </div>{" "}
          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            className="h-12 w-12 rounded-2xl bg-aurum-500 text-surface-900 hover:bg-aurum-400"
          >
            {" "}
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}{" "}
          </Button>{" "}
        </form>{" "}
        <div className="mt-4 flex flex-wrap gap-2">
          {" "}
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="ghost"
              className="rounded-full border border-border/50 bg-surface-variant/50 px-3 py-1 text-xs"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {" "}
              {suggestion}{" "}
            </Button>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      <AnimatePresence>
        {" "}
        {loading ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex items-center gap-3 rounded-xl border border-border/40 bg-surface px-4 py-3 text-xs text-muted-foreground"
          >
            {" "}
            <Loader2 className="h-3.5 w-3.5 animate-spin text-aurum-300" />{" "}
            Streaming guardians: Zelda, Argus, Phoenix{" "}
          </motion.div>
        ) : null}{" "}
      </AnimatePresence>{" "}
    </div>
  );
}
