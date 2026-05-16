// EchoBubble.jsx
import React, { useEffect, useRef, useState } from "react";
import { Bot, X, Send } from "lucide-react";

const fakeReply = async (text) => {
  await new Promise(r => setTimeout(r, 450));
  return `Echo: ${text}`;
};

export default function EchoBubble({ open, setOpen, initialDraft = "" }) {
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState("");
  const idle = useRef(null);

  // hydrate draft coming from Board (e.g., Backboard alarm)
  useEffect(() => {
    if (initialDraft) {
      setDraft(initialDraft);
    }
  }, [initialDraft]);

  const send = async (text) => {
    if (!text.trim()) return;
    setMsgs((m)=>[...m,{role:"user", text}]);
    setDraft("");
    const reply = await (window.askEcho?.(text) ?? fakeReply(text));
    setMsgs((m)=>[...m,{role:"user", text}, {role:"assistant", text: reply}]);
  };

  // auto-send after pause
  useEffect(() => {
    if (!open) return;
    clearTimeout(idle.current);
    if (!draft) return;
    idle.current = setTimeout(() => send(draft), 900);
    return () => clearTimeout(idle.current);
  }, [draft, open]);

  if (!open) {
    return (
      <button
        className="fixed right-5 bottom-5 z-[1600] w-12 h-12 rounded-full bg-cyan-600 text-white shadow-lg grid place-items-center"
        title="Ask Echo"
        onClick={()=>setOpen(true)}
      >
        <Bot className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed right-5 bottom-5 z-[1700] w-[360px] h-[430px] rounded-2xl bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden echo-overlay">
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/10 dark:border-white/10">
        <div className="font-semibold">Echo</div>
        <button onClick={()=>setOpen(false)} title="Close"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-3 space-y-2 overflow-auto h-[calc(100%-88px)]">
        {msgs.length===0 && (
          <div className="text-sm text-slate-500">
            Start typing — Echo will reply when you pause.
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} className={`max-w-[80%] px-3 py-2 rounded-xl ${m.role==="user"?"bg-slate-100 ml-auto":"bg-cyan-50 text-slate-900"}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e)=>setDraft(e.target.value)}
            placeholder="Type… (auto-send on pause)"
            className="flex-1 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 outline-none"
            onKeyDown={(e)=>{
              if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(draft); }
            }}
          />
          <button className="px-3 py-2 rounded-xl bg-cyan-600 text-white" onClick={()=>send(draft)}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
