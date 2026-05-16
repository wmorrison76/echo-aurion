import React, { useState, useEffect, useRef } from "react";
import { useChefNet } from "../state/chefnetStore";
import { createRecognition } from "../api/apiClient";
import { sendRecognitionEvent, sendBadgeAchievementEvent } from "../ai/echoHooks";
import { triggerFireworks } from "../utils/fireworks";

const EMOJIS = ["💬", "💡", "🎯", "🏆", "👍", "💪", "🌟", "✨", "🔥", "💝", "🎉", "😊"];

export default function RecognitionPanel() {
  const [state, dispatch] = useChefNet();
  const [recipientName, setRecipientName] = useState("");
  const [category, setCategory] = useState("teamwork");
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const prevRecCountRef = useRef(0);

  useEffect(() => {
    if (state.recognitions.length > prevRecCountRef.current) {
      triggerFireworks();
      prevRecCountRef.current = state.recognitions.length;
    }
  }, [state.recognitions.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = recipientName.trim();
    const trimmedMsg = message.trim();
    if (!trimmedName || !trimmedMsg) return;

    setSubmitting(true);
    try {
      const recognition = await createRecognition({
        recipientName: trimmedName,
        category,
        message: trimmedMsg,
        from: "Grateful Colleague",
        emoji,
      });
      dispatch({ type: "ADD_RECOGNITION", recognition });

      // Dispatch event to refresh dashboard across the app
      window.dispatchEvent(new CustomEvent("recognition-created", { detail: recognition }));

      // Track recognition event with Echo
      sendRecognitionEvent({
        category,
        messageLength: trimmedMsg.length,
        recipientName: trimmedName,
      });

      // Track badge achievement
      sendBadgeAchievementEvent({
        category: "gratitude",
        points: 3,
        level: "spark",
        triggerType: "recognition_sent",
      });

      triggerFireworks();
      setRecipientName("");
      setMessage("");
      setCategory("teamwork");
    } catch (err) {
      dispatch({ type: "ERROR", error: err?.message || "Unable to send recognition right now." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border border-amber-100 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/50 rounded-xl p-3">
        <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-amber-700 dark:text-amber-200 mb-1">
          Recognition Wall • Celebrate your teammates
        </div>
        <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
          A simple way to say "thank you" and highlight the things that matter. Every recognition
          reinforces the culture we're building together.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Who do you want to recognize?"
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/60"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/60"
          >
            <option value="teamwork">Great teamwork</option>
            <option value="kindness">Kindness & support</option>
            <option value="excellence">Excellence & skill</option>
            <option value="leadership">Leadership moment</option>
            <option value="innovation">Creative thinking</option>
            <option value="safety">Safety champion</option>
            <option value="culture">Culture builder</option>
          </select>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/60 mb-2"
          placeholder="What did they do? How did it make a difference?"
        />
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs text-slate-600 dark:text-slate-400">Pick a vibe:</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-2xl hover:scale-110 transition-transform"
            >
              {emoji}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full mt-1 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 grid grid-cols-6 gap-1 z-10">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setEmoji(e);
                      setShowEmojiPicker(false);
                    }}
                    className="text-xl hover:scale-125 transition-transform"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 text-[11px]">
          <button
            type="submit"
            disabled={submitting || !recipientName.trim() || !message.trim()}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em] disabled:opacity-50 disabled:cursor-not-allowed bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400"
          >
            {submitting ? "Sending…" : "Send Cheers"}
          </button>
        </div>
      </form>

      <div className="mt-2 space-y-2 max-h-96 chefnet-scroll overflow-y-auto">
        {state.recognitions.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No recognitions yet. Start the culture shift by celebrating someone today!
          </p>
        )}
        {state.recognitions.map((rec) => (
          <article
            key={rec.id}
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white/80 dark:bg-slate-900/80"
            onMouseEnter={() => triggerFireworks()}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{rec.emoji || "✨"}</span>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {rec.recipientName}
                  </h4>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  for {rec.category}
                </p>
              </div>
              <span className="chefnet-badge bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-200 border-amber-200 dark:border-amber-500/60 text-[10px]">
                ✨ Cheer
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
              {rec.message}
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>From {rec.from}</span>
              <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
