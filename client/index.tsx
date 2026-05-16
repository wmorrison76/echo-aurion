// CRITICAL: Initialize error suppression and Sentry FIRST (before any fetch calls)
// CRITICAL: Install browser polyfills FIRST, before anything else
// This ensures fetch error suppression is in place before any network calls
import "./lib/browser-polyfills";

import "./lib/react-shim";
import "./lib/os-bus-runtime";

import { createRoot } from "react-dom/client";
import { initializeSentry } from "./sentry-init";

// Initialize Sentry error tracking BEFORE anything else
// This sets up error suppression and fetch wrappers BEFORE auth-fetch-interceptor
// Wrap in try-catch to prevent errors from blocking app load
try {
  initializeSentry();
} catch (err) {
  console.warn("[INDEX] Sentry initialization failed (non-critical):", err);
}

// NOW import auth-fetch-interceptor AFTER Sentry is initialized
// This ensures our fetch wrapper is outermost
import "./lib/auth-fetch-interceptor";

import App from "./App";

// Bootstrap React application to the DOM
const container = document.getElementById("root");

if (!container) {
  console.error("[INDEX] Root container not found!");
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: system-ui;">
      <h1>Error: Root element not found</h1>
      <p>Make sure index.html has &lt;div id="root"&gt;&lt;/div&gt;</p>
    </div>
  `;
  throw new Error(
    'Failed to find root element. Make sure index.html has <div id="root"></div>',
  );
}

// Initialize root with error handling
let root;
try {
  root = createRoot(container);
  
  // Render the main App component with all providers
  // Wrap in try-catch to catch render errors
  root.render(<App />);
  
  console.log("[INDEX] App rendered successfully");
} catch (error) {
  console.error("[INDEX] Failed to render app:", error);
  // Show error message in DOM (plain HTML, not JSX)
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error && error.stack ? error.stack : String(error);
  container.innerHTML = `
    <div style="padding: 20px; font-family: system-ui; color: #333;">
      <h1 style="color: #dc2626;">Failed to Load Application</h1>
      <p style="margin: 10px 0;"><strong>Error:</strong> ${errorMessage}</p>
      <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
      <details style="margin-top: 20px;">
        <summary style="cursor: pointer; color: #666;">Error Details</summary>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto; margin-top: 10px; font-size: 12px;">${errorStack}</pre>
      </details>
      <p style="margin-top: 20px; color: #666; font-size: 14px;">Check the browser console (F12) for more details.</p>
    </div>
  `;
}

// Hot Module Replacement for Vite
if (import.meta.hot) {
  import.meta.hot.accept("./App", (mod) => {
    if (mod?.default) {
      root.render(<mod.default />);
    } else {
      console.warn(
        "[HMR] ⚠ App module update received but mod.default is undefined.",
        "This usually means a syntax error in App.tsx or a broken import.",
        "The previous version of the app is still rendered.",
        "Fix the error and save again, or refresh the page.",
        { mod }
      );
    }
  });
}

// Dev-only: expose deep panel diagnostic via window.runPanelDiagnostic()
if (import.meta.env.DEV) {
  import("./lib/run-deep-panel-diagnostic").then(({ runDeepPanelDiagnostic }) => {
    (window as unknown as { runPanelDiagnostic?: () => void }).runPanelDiagnostic =
      runDeepPanelDiagnostic;
    console.log(
      "%c[Dev] Deep panel diagnostic available: call window.runPanelDiagnostic() in console",
      "color:#94a3b8;font-size:11px"
    );
  });
}

// PWA Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(
      (reg) => console.log("[PWA] Service worker registered:", reg.scope),
      (err) => console.warn("[PWA] Service worker registration failed:", err)
    );
  });
}


// Export for testing
export { root };
