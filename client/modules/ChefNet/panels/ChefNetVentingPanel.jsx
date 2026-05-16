import React, { useState } from "react";
import { useChefNet } from "../state/chefnetStore";
import { scoreToxicity, getModerationMessage } from "../ai/toxicityGuard";
import { createVent } from "../api/apiClient";
import { sendAnonymousVentingSignal } from "../ai/echoHooks";

const MOOD_EMOJIS = ["😔", "😤", "😟", "😞", "🥲", "😌", "😊", "😩"];

export default function ChefNetVentingPanel() {
  const [state, dispatch] = useChefNet();
  const [text, setText] = useState("");
  const [mood, setMood] = useState("😔");
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [moderation, setModeration] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const tox = scoreToxicity(trimmed);
    const message = getModerationMessage(tox);
    if (message) {
      setModeration(message);
      return;
    }

    setModeration(null);
    setSubmitting(true);
    try {
      const vent = await createVent({
        text: trimmed,
        mood,
        anonymousId: "anon-" + Date.now(),
      });
      dispatch({ type: "ADD_VENT", message: vent });
      sendAnonymousVentingSignal({ length: trimmed.length, mood });
      setText("");
      setMood("😔");
    } catch (err) {
      dispatch({ type: "ERROR", error: err?.message || "Unable to vent right now." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border border-rose-100 dark:border-rose-500/40 bg-rose-50/60 dark:bg-rose-950/50 rounded-xl p-3">
        <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-rose-700 dark:text-rose-200 mb-1">
          Anonymous Vent Wall • Zero names, zero screenshots, zero blame.
        </div>
        <p className="text-xs text-rose-900/80 dark:text-rose-100/80">
          This space is for feelings, not facts or accusations. No names, no departments, no identifying details.
          Everything is anonymized and only used to spot burnout and stress trends.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/70 dark:bg-slate-900/70">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-2 text-sm outline-none focus:ring-2 focus:ring-rose-400/60"
          placeholder="Let it out. How are you really doing today?"
        />
        {moderation && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
            {moderation}
          </p>
        )}
        <div className="mt-2 mb-2 flex items-center gap-2">
          <span className="text-xs text-slate-600 dark:text-slate-400">How are you feeling?</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoodPicker(!showMoodPicker)}
              className="text-2xl hover:scale-110 transition-transform"
            >
              {mood}
            </button>
            {showMoodPicker && (
              <div className="absolute top-full mt-1 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 grid grid-cols-4 gap-1 z-10">
                {MOOD_EMOJIS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMood(m);
                      setShowMoodPicker(false);
                    }}
                    className="text-xl hover:scale-125 transition-transform"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-400 dark:text-slate-500">
            No usernames are stored. Only the message and a timestamp.
          </span>
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em] disabled:opacity-50 disabled:cursor-not-allowed bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400"
          >
            {submitting ? "Sending…" : "Send"}
          </button>
        </div>
      </form>

      <div className="mt-2 space-y-1 max-h-72 chefnet-scroll overflow-y-auto">
        {state.ventingMessages.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Nothing here yet. When your teams begin to use this, Echo can watch aggregate stress over time.
          </p>
        )}
        {state.ventingMessages.map((m) => (
          <article
            key={m.id}
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 bg-white/80 dark:bg-slate-900/80 text-xs text-slate-700 dark:text-slate-100 whitespace-pre-wrap flex gap-2"
          >
            <span className="text-lg flex-shrink-0">{m.mood || "😔"}</span>
            <span>{m.body || m.text}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
