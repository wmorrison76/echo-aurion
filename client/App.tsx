import React, { Suspense, useEffect, useMemo, useState, lazy } from "react";
import { initializeTheme } from "@/lib/theme-manager";

function setBootStatus(status: string) {
  try {
    (window as any).__APP_BOOT_STATUS__ = status;
  } catch {
    // ignore
  }

  try {
    (window as any).__APP_BOOT__?.setStatus?.(status);
  } catch {
    // ignore
  }
}

class BootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: unknown }
> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    setBootStatus("app-full-error");
    console.error("[APP] Uncaught error while loading full app", error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const message =
      this.state.error instanceof Error
        ? this.state.error.message
        : typeof this.state.error === "object" && this.state.error
          ? (() => {
              try {
                return JSON.stringify(this.state.error);
              } catch {
                try {
                  return String(this.state.error);
                } catch {
                  return "[Object cannot be converted to string]";
                }
              }
            })()
          : String(this.state.error);

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          color: "#0f172a",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "min(720px, 100%)",
            border: "1px solid #fecaca",
            borderRadius: 14,
            padding: 20,
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, color: "#b91c1c" }}>
            Full app failed to load
          </div>
          <div style={{ marginTop: 10, fontSize: 14, color: "#475569" }}>
            {message}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: "#94a3b8" }}>
            <details style={{ cursor: "pointer" }}>
              <summary style={{ fontWeight: 600 }}>Troubleshooting steps</summary>
              <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 1.6 }}>
                <li>Try refreshing the page</li>
                <li>Clear browser cache if the error persists</li>
                <li>
                  Use safe mode by adding <code>?app=safe</code> to the URL
                </li>
                <li>Open the browser console (F12) for detailed errors</li>
              </ul>
            </details>
          </div>
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "#2563eb",
                color: "#fff",
                border: 0,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Reload
            </button>
            <a
              href="/?app=safe"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "#f1f5f9",
                color: "#0f172a",
                border: "1px solid #e2e8f0",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Open safe mode
            </a>
          </div>
        </div>
      </div>
    );
  }
}

function CenterMessage({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#334155",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 520, padding: 24 }}>
        <div
          style={{
            margin: "0 auto 12px",
            width: 40,
            height: 40,
            borderRadius: 9999,
            border: "4px solid #e2e8f0",
            borderTopColor: "#2563eb",
            animation: "spin 1s linear infinite",
          }}
        />
        <div style={{ fontSize: 14 }}>{title}</div>
        {subtitle ? (
          <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
            {subtitle}
          </div>
        ) : null}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

const LazyAppFull = React.lazy(async () => {
  // IMPORTANT: keep statuses in the "app-*" namespace so the HTML watchdog never
  // overwrites the already-rendered app shell.
  setBootStatus("app-full-loading");
  try {
    console.log("[APP] Starting dynamic import of AppFull module...");
    const mod = await import("./AppFull");
    console.log("[APP] AppFull module imported successfully");

    setBootStatus("app-full-module-loaded");
    if (!mod.default) {
      throw new Error("AppFull module has no default export");
    }
    console.log("[APP] AppFull module has valid default export");
    return { default: mod.default };
  } catch (error) {
    setBootStatus("app-full-error");

    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error
          ? (() => {
              try {
                return JSON.stringify(error);
              } catch {
                try {
                  return String(error);
                } catch {
                  return "[Object cannot be converted to string]";
                }
              }
            })()
          : String(error);

    const stack = error instanceof Error ? error.stack : "";

    console.error("[APP] Failed to load AppFull module:", {
      message,
      stack,
      error,
    });

    let detailedMessage = message;
    if (message.includes("404")) {
      detailedMessage =
        "AppFull module file not found (404). This may be a build or deployment issue.";
    } else if (message.includes("network") || message.includes("fetch")) {
      detailedMessage =
        "Network error loading AppFull module. Check your internet connection or try again.";
    } else if (message.includes("SyntaxError")) {
      detailedMessage =
        "AppFull module has a syntax error. This may be a build configuration problem.";
    } else if (message.includes("undefined") || message.includes("cannot read")) {
      detailedMessage =
        "AppFull module has a runtime error. One of its dependencies may be missing or incompatible.";
    }

    throw new Error(
      `Failed to load AppFull module: ${detailedMessage}. ` +
        "Try refreshing the page, using safe mode (?app=safe), or checking the browser console for details.",
    );
  }
});

function shouldAutoLoadFullApp() {
  try {
    const url = new URL(window.location.href);

    // Safe mode is opt-in.
    if (url.searchParams.get("app") === "safe") return false;

    // Force full app if explicitly requested.
    if (url.searchParams.get("app") === "full") return true;

    // Default to full app.
    return true;
  } catch {
    return true;
  }
}

function SafeModeSplash({ onLoadApp }: { onLoadApp: () => void }) {
  const [status, setStatus] = useState<string>(() =>
    String((window as any).__APP_BOOT_STATUS__ || "starting"),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setStatus(String((window as any).__APP_BOOT_STATUS__ || "starting"));
    }, 250);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#334155",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(720px, 100%)",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 20,
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 9999,
              background: "#10b981",
              flex: "0 0 auto",
            }}
          />
          <div style={{ fontWeight: 700, fontSize: 16 }}>Welcome to LUCCCA</div>
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 14,
            color: "#475569",
            lineHeight: 1.5,
          }}
        >
          The app is running in safe startup mode to prevent blank screens. You
          can load the full interface when you’re ready.
        </div>

        <div style={{ marginTop: 14, fontSize: 12, color: "#94a3b8" }}>
          Boot status: <span style={{ color: "#64748b" }}>{status}</span>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onLoadApp}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "#2563eb",
              color: "#fff",
              border: 0,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Load full app
          </button>

          <a
            href="/?app=full"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "#f1f5f9",
              color: "#0f172a",
              border: "1px solid #e2e8f0",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Open full app link
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [showFullApp, setShowFullApp] = useState(() => shouldAutoLoadFullApp());

  useEffect(() => {
    setBootStatus("app-shell-rendered");
    // iter176 fix · restore theme preferences on mount (was only in old .bak files)
    try { initializeTheme(); } catch (e) { console.debug("theme init error:", e); }
  }, []);

  // Guest Ordering Platform — standalone route for QR code access
  const isGuestOrder = window.location.pathname.startsWith("/guest-order");
  const LazyGuestOrdering = useMemo(() => lazy(() => import("@/modules/GuestOrdering")), []);

  // Pastry Standalone — public landing + Stripe checkout for bakery subscribers
  const isPastry = window.location.pathname.startsWith("/pastry");
  const LazyPastry = useMemo(() => lazy(() => import("@/modules/PastryStandalone")), []);

  // Eng Ops — internal notifications, dismissal audit, Stratus plans
  const isEngOps = window.location.pathname.startsWith("/eng-ops");
  const LazyEngOps = useMemo(() => lazy(() => import("@/modules/EngOps")), []);

  // BEO Standalone — public landing + Stripe checkout for venues/catering
  const isBEO = window.location.pathname.startsWith("/beo");
  const LazyBEO = useMemo(() => lazy(() => import("@/modules/BEOStandalone")), []);

  // Golden Seed Admin — spawn custom OS platforms from the EchoAi³ framework
  const isSeed = window.location.pathname.startsWith("/seed");
  const isSeedPlant = window.location.pathname.startsWith("/seed/plant");
  const LazySeed = useMemo(() => lazy(() => import("@/modules/GoldenSeed/GoldenSeedAdmin")), []);
  const LazySeedPlant = useMemo(() => lazy(() => import("@/modules/GoldenSeed/SeedPlantStudio")), []);

  if (isGuestOrder) {
    return (
      <Suspense fallback={<CenterMessage title="Loading menu…" subtitle="" />}>
        <LazyGuestOrdering />
      </Suspense>
    );
  }

  if (isPastry) {
    return (
      <Suspense fallback={<CenterMessage title="Loading EchoAi³ Pastry…" subtitle="" />}>
        <LazyPastry />
      </Suspense>
    );
  }

  if (isEngOps) {
    return (
      <Suspense fallback={<CenterMessage title="Loading Eng Ops…" subtitle="" />}>
        <LazyEngOps />
      </Suspense>
    );
  }

  if (isBEO) {
    return (
      <Suspense fallback={<CenterMessage title="Loading BEO…" subtitle="" />}>
        <LazyBEO />
      </Suspense>
    );
  }

  if (isSeedPlant) {
    return (
      <Suspense fallback={<CenterMessage title="Loading Co-Build Studio…" subtitle="" />}>
        <LazySeedPlant />
      </Suspense>
    );
  }

  if (isSeed) {
    return (
      <Suspense fallback={<CenterMessage title="Loading Golden Seed…" subtitle="" />}>
        <LazySeed />
      </Suspense>
    );
  }

  // Lazy Echo Command Bar — mounts on top of every route (except standalone pages)
  const LazyEchoCmd = useMemo(() => lazy(() => import("@/components/echo/EchoCommandBar")), []);
  const LazySolveBar = useMemo(() => lazy(() => import("@/components/echo/SolveBar")), []);
  // iter204 · Pending-Action human-gate banner
  const LazyPendingBanner = useMemo(() => lazy(() => import("@/components/echo/PendingActionBanner")), []);

  const content = useMemo(() => {
    if (!showFullApp) {
      return <SafeModeSplash onLoadApp={() => setShowFullApp(true)} />;
    }

    return (
      <BootErrorBoundary>
        <Suspense fallback={null}>
          <LazyPendingBanner />
        </Suspense>
        <Suspense
          fallback={
            <CenterMessage
              title="Loading full app…"
              subtitle="This may take a moment on first load."
            />
          }
        >
          <LazyAppFull />
        </Suspense>
        <Suspense fallback={null}>
          <LazyEchoCmd />
        </Suspense>
        <Suspense fallback={null}>
          <LazySolveBar />
        </Suspense>
      </BootErrorBoundary>
    );
  }, [showFullApp]);

  return content;
}
