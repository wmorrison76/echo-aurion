import React, { useState } from "react";

interface EchoAiUsageBannerProps {
  storageKey: string;
  checklist?: string[];
  title?: string;
  className?: string;
}

export default function EchoAiUsageBanner({
  storageKey,
  checklist = [],
  title = "Echo AI Checklist",
  className = "",
}: EchoAiUsageBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "dismissed";
    } catch {
      return false;
    }
  });

  if (dismissed || checklist.length === 0) return null;

  return (
    <div
      className={`rounded-lg border border-[#c8a97e]/25 bg-neutral-950/40 p-3 text-xs text-[#c8a97e]/80 ${className}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold text-[#c8a97e]">{title}</span>
        <button
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(storageKey, "dismissed");
            } catch {}
          }}
          className="text-[#c8a97e] hover:text-[#c8a97e]/80 text-[10px] uppercase tracking-wider"
        >
          Dismiss
        </button>
      </div>
      <ul className="space-y-1">
        {checklist.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-[#c8a97e] mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
