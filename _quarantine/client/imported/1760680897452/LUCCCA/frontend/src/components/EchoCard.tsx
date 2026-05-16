import React, { useEffect, useRef, useState } from "react";
import { echo } from "@/lib/echo";

export default function EchoCard() {
  const [online, setOnline] = useState(false);
  const [listening, setListening] = useState(false);
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // health poll
  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const h = await echo.health();
        if (mounted) setOnline(!!h?.ok);
      } catch {
        if (mounted) setOnline(false);
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  async function startRec() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    mr.ondataavailable = e => e.data.size && chunksRef.current.push(e.data);
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const text = await echo.stt(blob);
      setInput(text);
    };
    mediaRef.current = mr;
    mr.start();
    setListening(true);
  }
  function stopRec() {
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach(t => t.stop());
    mediaRef.current = null;
    setListening(false);
  }

  async function send() {
    if (!input.trim()) return;
    const r = await echo.chat(input.trim());
    setReply(r);
    try { await echo.tts(r); } catch {}
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1500] px-4 py-3 rounded-2xl border
                    bg-black/50 text-cyan-100 border-cyan-400/30 backdrop-blur-md w-[640px] max-w-[92vw]">
      <div className="flex items-start gap-3">
        <span className={`mt-1 inline-block w-3.5 h-3.5 rounded-full ${online ? "bg-emerald-400" : "bg-rose-400"}`} />
        <div className="flex-1">
          <div className="font-semibold">Echo • {online ? "Online" : "Offline"}</div>
          <div className="text-sm opacity-80">
            {listening ? "Listening…" : "I’m awake — say what you need."}
          </div>

          <div className="mt-2 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask for help with prep, covers, staffing, costs…"
              className="flex-1 rounded-lg px-3 py-2 bg-white/10 border border-cyan-400/25 text-cyan-50 focus:outline-none"
            />
            {!listening ? (
              <button onClick={startRec}
                className="px-3 py-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 hover:bg-cyan-500/20">
                🎙️
              </button>
            ) : (
              <button onClick={stopRec}
                className="px-3 py-2 rounded-lg border border-rose-400/40 bg-rose-500/10 hover:bg-rose-500/20">
                ⏹
              </button>
            )}
            <button onClick={send}
              className="px-4 py-2 rounded-lg border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30">
              Send
            </button>
          </div>

          {!!reply && (
            <div className="mt-2 text-sm text-cyan-50/90 bg-cyan-500/5 border border-cyan-400/20 rounded-lg p-2">
              {reply}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
