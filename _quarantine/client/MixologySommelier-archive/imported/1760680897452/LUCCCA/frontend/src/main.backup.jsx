import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import "./components/EchoCore/EchoCoreGlobalStyles.css";
// Optional Echo WS hook (won't throw if not running)
import { installEchoHook } from "./echo/echoClient.js";

function boot() {
  try {
    const host = typeof location !== "undefined" ? location.hostname : "localhost";
    installEchoHook?.({ baseUrl: `ws://${host}:9091` });
  } catch (e) {
    console.warn("[Echo] websocket hook skipped:", e?.message || e);
  }

  const el = document.getElementById("root");
  const root = createRoot(el);
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
