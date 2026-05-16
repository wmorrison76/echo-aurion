// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import "./index.css";
import "./styles/theme-base.css";

// Optional: Echo WebSocket hook (won’t throw if not present)
import { installEchoHook } from "./echo/echoClient.js";

function boot() {
  try {
    const host = typeof location !== "undefined" ? location.hostname : "localhost";
    // Use your stub server if running (change port if needed)
    installEchoHook?.({ baseUrl: `ws://${host}:9091` });
  } catch (e) {
    console.warn("[Echo] websocket hook skipped:", e?.message || e);
  }

  const el = document.getElementById("root");
  const root = ReactDOM.createRoot(el);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
