/**
 * PWA Install Prompt — Shows a native-feeling "Install App" banner
 * Captures the beforeinstallprompt event and provides a UI to trigger it.
 */
import React, { useState, useEffect, useRef } from "react";
import { Download, X, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }
    // Check if previously dismissed
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / 86400000;
      if (daysSince < 7) { setDismissed(true); return; }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => { setInstalled(true); setShowBanner(false); };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  };

  if (installed || dismissed || !showBanner) return null;

  return (
    <div
      data-testid="pwa-install-banner"
      style={{
        position: "fixed", top: 12, right: 12, zIndex: 99999,
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 16px",
        background: "linear-gradient(135deg, #0b1628 0%, #1a2744 100%)",
        border: "1px solid rgba(200,169,126,0.3)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(200,169,126,0.1)",
        fontFamily: "'Inter', -apple-system, sans-serif",
        backdropFilter: "blur(12px)",
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <Monitor size={20} color="#c8a97e" strokeWidth={1.5} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.02em" }}>
          Install Echo AURION
        </div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
          Run as a desktop app — no browser needed
        </div>
      </div>
      <button
        data-testid="pwa-install-btn"
        onClick={handleInstall}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 8,
          border: "1px solid rgba(200,169,126,0.4)",
          background: "rgba(200,169,126,0.12)",
          color: "#c8a97e", fontSize: 11, fontWeight: 700,
          cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(200,169,126,0.25)"; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.background = "rgba(200,169,126,0.12)"; }}
      >
        <Download size={12} /> Install
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 4,
          color: "#475569", display: "flex", alignItems: "center",
        }}
      >
        <X size={14} />
      </button>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
