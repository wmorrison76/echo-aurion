import { useCallback, useEffect, useRef, useState } from "react";

import {
  getGuardIp,
  getGuardOfflineUntil,
  getGuardStatus,
  GUARD_RETRY_DELAY_MS,
} from "@/lib/guard-client";

type TestEventDetail = {
  message?: string;
  ip?: string;
  durationMs?: number;
};

export default function DefconOverlay() {
  const [alert, setAlert] = useState<"none" | "defcon1">("none");
  const [ip, setIp] = useState<string>("");
  const [detail, setDetail] = useState<string>("");
  const [overrideActive, setOverrideActive] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [guardUnavailable, setGuardUnavailable] = useState(false);
  const timerRef = useRef<number | null>(null);
  const cancelRef = useRef<() => void>(() => {});
  const styleRef = useRef<HTMLStyleElement | null>(null);

  const poll = useCallback(async () => {
    if (overrideActive || guardUnavailable) return;
    let result: Awaited<ReturnType<typeof getGuardStatus>>;
    try {
      result = await getGuardStatus();
    } catch {
      result = { data: null, offline: true };
    }
    if (result.offline) {
      setGuardUnavailable(true);
      setAlert("none");
      setDetail("");
      return;
    }
    if (!result.data) return;
    setGuardUnavailable(false);
    setAlert(result.data.alert ?? "none");
    setDetail(result.data.detail ?? "");
  }, [guardUnavailable, overrideActive]);

  const loadIp = useCallback(async () => {
    if (guardUnavailable) return;
    let result: Awaited<ReturnType<typeof getGuardIp>>;
    try {
      result = await getGuardIp();
    } catch {
      result = { data: null, offline: true };
    }
    if (result.offline) {
      setGuardUnavailable(true);
      setIp("");
      return;
    }
    setGuardUnavailable(false);
    setIp(result.data?.ip ?? "");
  }, [guardUnavailable]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (styleRef.current) return;

    const css = `
      @keyframes defconPulse {
        0% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.03); opacity: 0.9; }
        100% { transform: scale(1); opacity: 0.6; }
      }
      @keyframes defconFlash {
        0%, 49% { opacity: 0.2; }
        50%, 100% { opacity: 1; }
      }
      @keyframes defconBgScan {
        0% { background-position: 0 0, 0 0; }
        100% { background-position: 200px 200px, -200px 200px; }
      }
    `;
    const el = document.createElement("style");
    el.dataset.source = "defcon-overlay";
    el.textContent = css;
    document.head.appendChild(el);
    styleRef.current = el;
    return () => {
      const current = styleRef.current;
      if (current && current.parentNode) {
        current.parentNode.removeChild(current);
      }
      styleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!guardUnavailable) return;
    if (typeof window === "undefined") return;
    const offlineWindow = getGuardOfflineUntil() - Date.now();
    const waitMs = Math.max(GUARD_RETRY_DELAY_MS, offlineWindow > 0 ? offlineWindow : 0);
    const timeout = window.setTimeout(() => {
      setGuardUnavailable(false);
    }, waitMs);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [guardUnavailable]);

  useEffect(() => {
    if (typeof window === "undefined" || guardUnavailable) return;
    loadIp();
    poll();
    const id = window.setInterval(poll, 2000);
    return () => {
      window.clearInterval(id);
    };
  }, [guardUnavailable, loadIp, poll]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let keyHandler: ((event: KeyboardEvent) => void) | null = null;
    let clickHandler: (() => void) | null = null;

    const cleanupListeners = () => {
      if (keyHandler) {
        window.removeEventListener("keydown", keyHandler);
        keyHandler = null;
      }
      if (clickHandler) {
        window.removeEventListener("click", clickHandler);
        clickHandler = null;
      }
    };

    const cancel = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      cleanupListeners();
      setOverrideActive(false);
      setTestMode(false);
      setDetail("");
      setAlert("none");
      poll();
    };
    cancelRef.current = cancel;

    const handler = (event: Event) => {
      const custom = event as CustomEvent<TestEventDetail>;
      const message =
        custom.detail?.message ||
        "Red Phoenix diagnostic splash (test mode)";
      const duration = Math.max(
        2000,
        Number(custom.detail?.durationMs) || 4000,
      );
      const ipOverride = custom.detail?.ip;
      if (typeof ipOverride === "string" && ipOverride.trim()) {
        setIp(ipOverride.trim());
      }
      setOverrideActive(true);
      setTestMode(true);
      setAlert("defcon1");
      setDetail(message);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(cancel, duration);

      cleanupListeners();
      keyHandler = (ev) => {
        if (ev.key === "Escape") cancel();
      };
      clickHandler = () => cancel();
      window.addEventListener("keydown", keyHandler);
      window.addEventListener("click", clickHandler);
    };

    window.addEventListener(
      "guard:test-red-phoenix",
      handler as EventListener,
    );
    return () => {
      window.removeEventListener(
        "guard:test-red-phoenix",
        handler as EventListener,
      );
      cleanupListeners();
      if (timerRef.current) window.clearTimeout(timerRef.current);
      cancelRef.current = () => {};
    };
  }, [poll]);

  const handleTestDismiss = useCallback(() => {
    if (testMode) cancelRef.current();
  }, [testMode]);

  if (alert !== "defcon1") return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background:
          "radial-gradient(circle at 50% 30%, rgba(255,0,0,0.22), transparent 55%), rgba(0,0,0,0.92)",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        pointerEvents: "auto",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,0,0,0.08) 0, rgba(255,0,0,0.08) 10px, transparent 10px, transparent 20px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 10px, transparent 10px, transparent 20px)",
          animation: "defconBgScan 6s linear infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "8%",
          textTransform: "uppercase",
          letterSpacing: "0.8rem",
          fontWeight: 800,
          fontSize: "clamp(1rem, 3vw, 2.2rem)",
          color: "#ff4d4f",
          textShadow: "0 0 12px rgba(255,0,0,0.9)",
          animation: "defconFlash 0.6s steps(2, end) infinite",
        }}
      >
        Red Phoenix Warning
      </div>
      <div style={{ textAlign: "center", maxWidth: 720, padding: "0 24px" }}>
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2Fc10113b011c945c29625dbaff95d9364?format=webp&width=1600"
          alt="DEFCON 1"
          style={{
            width: "min(65vw, 420px)",
            margin: "0 auto 20px",
            filter: "drop-shadow(0 0 24px rgba(255,0,0,0.6))",
            animation: "defconPulse 1.4s ease-in-out infinite",
          }}
        />
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 4,
            color: "#ff8080",
            textTransform: "uppercase",
          }}
        >
          DEFCON 1
        </div>
        <div style={{ marginTop: 12, opacity: 0.95, fontSize: 18 }}>
          System locked by ZARO Guardian – all operations frozen.
        </div>
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.8 }}>
          IP: {ip || "unknown"}
        </div>
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85, lineHeight: 1.7 }}>{detail}</div>
        {testMode ? (
          <div style={{ marginTop: 24, display: "grid", gap: 12, justifyItems: "center" }}>
            <button
              type="button"
              onClick={handleTestDismiss}
              style={{
                padding: "12px 28px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.4)",
                background: "rgba(255,0,0,0.18)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: 1,
                cursor: "pointer",
                textTransform: "uppercase",
                boxShadow: "0 0 18px rgba(255,0,0,0.45)",
              }}
            >
              Dismiss diagnostic overlay
            </button>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Press Esc or click anywhere to close. This control only appears in test mode.
            </div>
          </div>
        ) : null}
      </div>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }} />
    </div>
  );
}
