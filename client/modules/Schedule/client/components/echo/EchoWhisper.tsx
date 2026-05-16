/** * Echo Whisper Component * Floating conversational AI assistant */ import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
interface Message {
  id: string;
  role: "user" | "echo";
  text: string;
  timestamp: Date;
}
interface EchoWhisperProps {
  org_id?: string;
  dept_id?: string;
  lang?: "en" | "fr" | "it" | "de" | "pt" | "es";
  onClose?: () => void;
}
export const EchoWhisper: React.FC<EchoWhisperProps> = ({
  org_id,
  dept_id,
  lang = "en",
  onClose,
}) => {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "init",
      role: "echo",
      text: `Hello! I'm Echo Whisper, your AI assistant. Ask me anything about labor optimization, scheduling, or compliance.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      text: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/echo/whisper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          lang,
          context: { org_id, dept_id },
        }),
      });
      if (!res.ok) throw new Error("Echo request failed");
      const data = await res.json();
      const echoMessage: Message = {
        id: `msg-${Date.now()}-reply`,
        role: "echo",
        text: data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, echoMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "echo",
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  return (
    <AnimatePresence>
      {" "}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        className={`fixed bottom-4 right-4 z-50 shadow-2xl rounded-2xl border border-cyan-500/20 overflow-hidden ${minimized ? "w-16 h-16 bg-gradient-to-br from-cyan-600 to-blue-600" : "w-96 bg-black/80 backdrop-blur-md"}`}
      >
        {" "}
        {/* Header */}{" "}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-3 flex items-center justify-between text-white">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <div className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse" />{" "}
            <span className="text-sm font-semibold">Echo Whisper</span>{" "}
          </div>{" "}
          <div className="flex items-center gap-1">
            {" "}
            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1 hover:bg-background rounded transition"
            >
              {" "}
              {minimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}{" "}
            </button>{" "}
            <button
              onClick={onClose}
              className="p-1 hover:bg-background rounded transition"
            >
              {" "}
              <X className="h-4 w-4" />{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
        {!minimized && (
          <>
            {" "}
            {/* Messages */}{" "}
            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {" "}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {" "}
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg text-sm ${msg.role === "user" ? "bg-cyan-600 text-white" : "bg-slate-700 text-cyan-100"}`}
                  >
                    {" "}
                    {msg.text}{" "}
                  </div>{" "}
                </motion.div>
              ))}{" "}
              {loading && (
                <div className="flex gap-1 p-2">
                  {" "}
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />{" "}
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100" />{" "}
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200" />{" "}
                </div>
              )}{" "}
              <div ref={messagesEndRef} />{" "}
            </div>{" "}
            {/* Input */}{" "}
            <div className="border-t border-border p-3 space-y-2">
              {" "}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={loading}
                className="w-full p-2 bg-slate-800 text-white border border-border rounded text-sm focus:outline-none focus:border-cyan-500 resize-none"
                rows={2}
              />{" "}
              <Button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="w-full bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center gap-2"
              >
                {" "}
                <Send className="h-4 w-4" /> Send{" "}
              </Button>{" "}
            </div>{" "}
          </>
        )}{" "}
      </motion.div>{" "}
    </AnimatePresence>
  );
};
export default EchoWhisper;
