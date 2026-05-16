/**
 * Desktop Taskbar — Iter 6 (2026-05-11)
 *
 * Was: macOS-style dock with 9 dashboard quick-launches + status pill.
 * Now: dashboard quick-launches REMOVED per William's request — profile-switch
 * + sidebar cover navigation, so this surface only carries the live
 * operational status indicators (online/offline, sync queue, time/date,
 * keyboard shortcut hint).
 *
 * Restyled to match the gold-on-black brand chrome and repositioned to the
 * top-right corner just left of the avatar menu, so it sits in the same
 * "operator status" visual band as BRIEFING / NOTIF / AVATAR.
 *
 * NOTE: Kept as its own component (not merged into UserAvatarMenu) so the
 * online/sync logic stays isolated; if status pill needs to move again or
 * be feature-flagged off, it's one component to touch.
 */
import React, { useState, useEffect } from "react";

export function DesktopTaskbar() {
  const [time, setTime] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "QUEUE_SIZE") setSyncQueue(e.data.count || 0);
      if (e.data?.type === "SYNC_COMPLETE") setSyncQueue(e.data.remaining || 0);
      if (e.data?.type === "OFFLINE_QUEUED") setSyncQueue((prev) => prev + 1);
    };
    navigator.serviceWorker?.addEventListener("message", handleMessage);
    navigator.serviceWorker?.controller?.postMessage({ type: "GET_QUEUE_SIZE" });

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, []);

  const forceSyncNow = () => {
    navigator.serviceWorker?.controller?.postMessage({ type: "FORCE_SYNC" });
  };

  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  // Brand palette · gold-on-black to match UserAvatarMenu top-toolbar
  const GOLD = "#c8a97e";
  const CREAM = "#f5efe4";
  const DIM = "#8a8478";

  return (
    <div
      data-testid="desktop-taskbar"
      style={{
        // Sits just left of the UserAvatarMenu cluster (top-right band)
        position: "fixed",
        top: 14,
        right: 360,
        zIndex: 2147483646, // Just below UserAvatarMenu's MAX z-index so it
                            // stays in the same chrome layer (above panels).
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 14px",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(10px)",
        border: `1px solid rgba(200,169,126,0.35)`,
        borderRadius: 999,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: CREAM,
        pointerEvents: "auto",
      }}
    >
      {/* Online/Offline dot · click to force-sync when queued */}
      <div
        data-testid="taskbar-status-dot"
        title={online ? "Online" : `Offline (${syncQueue} queued)`}
        onClick={syncQueue > 0 ? forceSyncNow : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: syncQueue > 0 ? "pointer" : "default",
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: online ? "#7fb084" : "#c87065",
            boxShadow: `0 0 8px ${online ? "#7fb08470" : "#c8706570"}`,
          }}
        />
        {syncQueue > 0 && (
          <span
            data-testid="taskbar-sync-queue"
            style={{
              fontSize: 9,
              color: GOLD,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {syncQueue}
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: "rgba(200,169,126,0.25)" }} />

      {/* Time + date */}
      <div data-testid="taskbar-clock" style={{ textAlign: "right", lineHeight: 1 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: CREAM,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: 0.5,
          }}
        >
          {timeStr}
        </div>
        <div style={{ fontSize: 8, color: DIM, marginTop: 2, letterSpacing: 0.3 }}>
          {dateStr}
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: "rgba(200,169,126,0.25)" }} />

      {/* ⌘K shortcut hint · clickable to focus the Echo command palette */}
      <button
        data-testid="taskbar-cmdk-hint"
        onClick={() => {
          // Trigger ⌘K so the user can click instead of memorizing the shortcut
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
          );
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
          );
        }}
        title="Open Echo command palette"
        style={{
          background: "transparent",
          border: `1px solid rgba(200,169,126,0.35)`,
          color: GOLD,
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: 9,
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: 0.5,
          cursor: "pointer",
        }}
      >
        ⌘K
      </button>
    </div>
  );
}
