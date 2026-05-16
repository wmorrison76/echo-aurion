import React, { useState } from "react";
import { useChefNet } from "../state/chefnetStore";
import { scoreToxicity, getModerationMessage } from "../ai/toxicityGuard";
import { createPost } from "../api/apiClient";
import { sendCultureEventToEcho } from "../ai/echoHooks";

const EMOJIS = ["💬", "💡", "🎯", "🏆", "👍", "💪", "🌟", "✨", "🔥", "💝", "🎉", "😊"];

export default function ChefNetFeedPanel() {
  const [state, dispatch] = useChefNet();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [moderation, setModeration] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) return;

    const tox = scoreToxicity(trimmedBody);
    const message = getModerationMessage(tox);
    if (message) {
      setModeration(message);
      return;
    }

    setModeration(null);
    setSubmitting(true);
    try {
      const post = await createPost({
        title: trimmedTitle,
        body: trimmedBody,
        author: "Anonymous Chef",
        emoji,
      });
      dispatch({ type: "ADD_POST", post });
      sendCultureEventToEcho({ type: "post_created", length: trimmedBody.length });
      setTitle("");
      setBody("");
      setEmoji("💬");
    } catch (err) {
      dispatch({ type: "ERROR", error: err?.message || "Unable to post right now." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border border-blue-100 dark:border-blue-500/40 bg-blue-50/60 dark:bg-blue-950/50 rounded-xl p-3">
        <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-blue-700 dark:text-blue-200 mb-1">
          Open Forum • Moderated discussion space
        </div>
        <p className="text-xs text-blue-900/80 dark:text-blue-100/80">
          Share ideas, ask questions, celebrate wins, and learn from each other. All posts are moderated
          to keep this a safe, respectful space for the whole LUCCCA family.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/70 dark:bg-slate-900/70">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-400/60 mb-2"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-400/60"
          placeholder="Share your experience, question, or idea..."
        />
        {moderation && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
            {moderation}
          </p>
        )}
        <div className="mt-2 mb-2 flex items-center gap-2">
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
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-400 dark:text-slate-500">
            Your name appears as "Anonymous Chef" to encourage honest conversation.
          </span>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !body.trim()}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em] disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      <div className="mt-2 space-y-2 max-h-96 chefnet-scroll overflow-y-auto">
        {state.posts.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No posts yet. Be the first to start a conversation!
          </p>
        )}
        {state.posts.map((post) => (
          <article
            key={post.id}
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white/80 dark:bg-slate-900/80"
          >
            <div className="flex items-start gap-2 mb-1">
              <span className="text-2xl">{post.emoji || "💬"}</span>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {post.title}
              </h4>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-2">
              {post.body}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {post.author}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
