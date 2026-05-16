/** * EchoAdvisor – floating assistant panel with conversational UI. */
import React from "react";
import { useEchoAI } from "../../hooks/useEchoAI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Send, Loader } from "lucide-react";
import { findReportMatch } from "../reports/ReportCatalog";
export const EchoAdvisor: React.FC = () => {
  const { ask, response, loading, error, clear } = useEchoAI();
  const [isOpen, setIsOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const [history, setHistory] = React.useState<
    Array<{ role: "user" | "assistant"; text: string }>
  >([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    const userMessage = prompt;
    setPrompt("");
    setHistory((prev) => [...prev, { role: "user", text: userMessage }]);

    const reportMatch = findReportMatch(userMessage);
    if (reportMatch) {
      window.dispatchEvent(
        new CustomEvent("shiftflow:open-reports", {
          detail: { query: userMessage },
        }),
      );
      setHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Opening the Reports hub for ${reportMatch.title}.`,
        },
      ]);
      return;
    }

    const result = await ask(userMessage);
    if (result) {
      setHistory((prev) => [...prev, { role: "assistant", text: result.text }]);
    }
  };
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:opacity-90 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-all"
        title="Open Echo Advisor"
      >
        {" "}
        <span className="text-2xl">🔮</span>{" "}
      </button>
    );
  }
  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl flex flex-col z-50">
      {" "}
      {/* Header */}{" "}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center rounded-t-lg">
        {" "}
        <div className="flex items-center gap-2">
          {" "}
          <span className="text-xl">🔮</span>{" "}
          <div>
            {" "}
            <h3 className="font-semibold">Echo Advisor</h3>{" "}
            <p className="text-xs text-blue-100">
              Hospitality AI Assistant
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <button
          onClick={() => {
            setIsOpen(false);
            clear();
            setHistory([]);
          }}
          className="text-white hover:bg-blue-800 p-1 rounded"
        >
          {" "}
          <X size={20} />{" "}
        </button>{" "}
      </div>{" "}
      {/* Messages */}{" "}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50"
      >
        {" "}
        {history.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {" "}
            <p className="mb-2">👋 Hi! I'm Echo</p>{" "}
            <p className="text-sm mb-4">Ask me about:</p>{" "}
            <ul className="text-xs space-y-1 text-left ml-4">
              {" "}
              <li>• Labor scheduling & optimization</li>{" "}
              <li>• Tip pool fairness analysis</li>{" "}
              <li>• Revenue forecasting</li> <li>• Event workload balancing</li>{" "}
              <li>• Compliance & scheduling risks</li>{" "}
            </ul>{" "}
          </div>
        ) : (
          history.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {" "}
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${msg.role === "user" ? "bg-primary text-white" : "bg-background border border-gray-200"}`}
              >
                {" "}
                {msg.text}{" "}
              </div>{" "}
            </div>
          ))
        )}{" "}
        {loading && (
          <div className="flex justify-start">
            {" "}
            <div className="bg-background border border-gray-200 px-3 py-2 rounded-lg flex items-center gap-2">
              {" "}
              <Loader size={16} className="animate-spin" />{" "}
              <span className="text-sm">Thinking...</span>{" "}
            </div>{" "}
          </div>
        )}{" "}
        {error && (
          <div className="flex justify-start">
            {" "}
            <div className="bg-red-50 border border-red-200 px-3 py-2 rounded-lg text-sm text-red-700">
              {" "}
              Error: {error}{" "}
            </div>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Input */}{" "}
      <form
        onSubmit={handleSubmit}
        className="border-t p-3 bg-background rounded-b-lg flex gap-2"
      >
        {" "}
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask Echo..."
          disabled={loading}
          className="text-sm"
        />{" "}
        <Button type="submit" size="icon" disabled={loading || !prompt.trim()}>
          {" "}
          <Send size={18} />{" "}
        </Button>{" "}
      </form>{" "}
    </Card>
  );
};
