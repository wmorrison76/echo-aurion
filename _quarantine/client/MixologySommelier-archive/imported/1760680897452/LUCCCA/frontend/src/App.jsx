// frontend/src/App.jsx
import React, { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { setupThemeBoot } from "./lib/theme";

// base tokens/utilities (keep only the ones that exist)
import "./styles/themeTokens.css";
import "@/styles/utilities.css";

// Echo
import { installEchoHook } from "./echo/echoClient.js";
import { setupEchoShortcuts } from "./framework/echo";
import { registerAdapter } from "./framework/widgets";
import { localStorageAdapter } from "./framework/widgets/adapters";

// Shell & framework
import Sidebar from "./components/Sidebar.jsx";
import Board from "./board/Board.jsx";
import { CommandPalette } from "./framework/command/CommandPalette";
import { PresenceProvider, MultiCursorOverlay } from "./framework/presence/PresenceProvider";
import { TelemetryOverlay } from "./framework/telemetry/TelemetryOverlay";
import { RescueShell } from "./framework/errors/RescueShell";

// Optional routes (lazy)
const Culinary      = lazy(() => import("./components/KitchenLibraryTabs.jsx"));
const BakingPastry  = lazy(() => import("./components/PastryLibrary/PastryLibrary.jsx"));
const Mixology      = lazy(() => import("./components/MixologyTabs.jsx"));
// 🔧 fixed path to where your file actually is:
const Scheduling    = lazy(() => import("./modules/scheduling/client/App.tsx"));
const EchoBuilder   = lazy(() => import("./modules/EchoBuilder/EchoBuilder.jsx"));

const REAL_DASHBOARD_PATH = "/whiteboard";
const BOARD_ALIASES = ["/dashboard"];

// ---------- theme helpers ----------
const THEME_VARS_KEY  = "lu:theme:vars:v1";
const THEME_FLAGS_KEY = "lu:theme:flags:v1";
const AVATAR_KEY      = "lu:avatar:v1";

function applyThemeVars(vars = {}) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => {
    if (k.startsWith("--")) root.style.setProperty(k, String(v));
  });
}
function applyThemeFlags(flags = {}) {
  const root = document.documentElement;
  if (typeof flags.dark === "boolean") root.classList.toggle("dark", !!flags.dark);
  if (typeof flags.highContrast === "boolean") root.classList.toggle("hc", !!flags.highContrast);
  if (typeof flags.colorblindSafe === "boolean") root.classList.toggle("cb-safe", !!flags.colorblindSafe);
}
function saveTheme(vars, flags) {
  try {
    localStorage.setItem(THEME_VARS_KEY, JSON.stringify(vars || {}));
    localStorage.setItem(THEME_FLAGS_KEY, JSON.stringify(flags || {}));
  } catch {}
}
function loadTheme() {
  try {
    const vars  = JSON.parse(localStorage.getItem(THEME_VARS_KEY)  || "{}");
    const flags = JSON.parse(localStorage.getItem(THEME_FLAGS_KEY) || "{}");
    return { vars, flags };
  } catch { return { vars: {}, flags: {} }; }
}

export default function App() {
  const [isOpen, setIsOpen] = useState(true);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  // one-time adapters / hooks
  useEffect(() => { setupThemeBoot(); }, []);

  useEffect(() => {
    // If you want HTTP stub instead of WS, change baseUrl here
    installEchoHook({ baseUrl: "" }); // e.g., "http://localhost:5175" for HTTP stub
    setupEchoShortcuts();
    registerAdapter(localStorageAdapter);
  }, []);

  // boot: apply persisted theme + avatar
  useEffect(() => {
    const { vars, flags } = loadTheme();
    applyThemeVars(vars);
    applyThemeFlags(flags);
    if (typeof flags.dark === "boolean") setIsDark(!!flags.dark);

    const savedAvatar = localStorage.getItem(AVATAR_KEY);
    if (savedAvatar) {
      document.documentElement.style.setProperty("--avatar-url", `url("${savedAvatar}")`);
      window.dispatchEvent(new CustomEvent("lu:avatar:applied", { detail: { url: savedAvatar } }));
    }
  }, []);

  // global settings bus
  useEffect(() => {
    const onApply = (e) => {
      const { vars = {}, flags = {}, avatar } = e?.detail || {};
      if (vars && Object.keys(vars).length) applyThemeVars(vars);
      if (flags && Object.keys(flags).length) {
        applyThemeFlags(flags);
        if (typeof flags.dark === "boolean") setIsDark(!!flags.dark);
      }
      saveTheme(vars, flags);

      if (avatar?.url) {
        try { localStorage.setItem(AVATAR_KEY, avatar.url); } catch {}
        document.documentElement.style.setProperty("--avatar-url", `url("${avatar.url}")`);
        window.dispatchEvent(new CustomEvent("lu:avatar:applied", { detail: { url: avatar.url, id: avatar.id } }));
      }
    };

    const onAvatar = (e) => {
      const { url, id } = e?.detail || {};
      if (!url) return;
      try { localStorage.setItem(AVATAR_KEY, url); } catch {}
      document.documentElement.style.setProperty("--avatar-url", `url("${url}")`);
      window.dispatchEvent(new CustomEvent("lu:avatar:applied", { detail: { url, id } }));
    };

    window.addEventListener("lu:settings:apply", onApply);
    window.addEventListener("lu:avatar:update", onAvatar);
    return () => {
      window.removeEventListener("lu:settings:apply", onApply);
      window.removeEventListener("lu:avatar:update", onAvatar);
    };
  }, []);

  const toggleSidebar = useCallback(() => setIsOpen(v => !v), []);
  const toggleDark    = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    applyThemeFlags({ dark: next });
    const saved = loadTheme().flags || {};
    saveTheme(loadTheme().vars, { ...saved, dark: next });
  }, [isDark]);

  const fallback = <div className="p-6 text-sm text-gray-500">Loading…</div>;

  return (
    <PresenceProvider>
      <CommandPalette />
      <RescueShell>
        <div className={`flex h-screen w-screen ${isDark ? "dark bg-slate-900 text-slate-100" : "bg-white text-slate-900"}`}>
          <aside className="shrink-0">
            <Sidebar
              isOpen={isOpen}
              toggleSidebar={toggleSidebar}
              isDarkMode={isDark}
              toggleDarkMode={toggleDark}
            />
          </aside>

          <main className="flex-1 overflow-hidden">
            <Suspense fallback={fallback}>
              <Routes>
                <Route path="/" element={<Navigate to={REAL_DASHBOARD_PATH} replace />} />
                <Route path={REAL_DASHBOARD_PATH} element={<Board />} />
                <Route path="/kitchen-library" element={<Culinary />} />
                <Route path="/baking-pastry"   element={<BakingPastry />} />
                <Route path="/mixology"        element={<Mixology />} />
                <Route path="/schedules"       element={<Scheduling />} />
                <Route path="/builder"         element={<EchoBuilder />} />
                {BOARD_ALIASES.map(p => (
                  <Route key={p} path={p} element={<Navigate to={REAL_DASHBOARD_PATH} replace />} />
                ))}
                <Route path="*" element={<Navigate to={REAL_DASHBOARD_PATH} replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>

        <TelemetryOverlay />
      </RescueShell>
      <MultiCursorOverlay />
    </PresenceProvider>
  );
}
