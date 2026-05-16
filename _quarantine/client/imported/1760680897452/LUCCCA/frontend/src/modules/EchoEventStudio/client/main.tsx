import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Install Echo hook (works even if WS server is down)
try {
  // Try alias first, then a safe relative fallback
  import("@core/echo/echoClient.js")
    .catch(() => import("../../../echo/echoClient.js"))
    .then((m: any) => {
      m?.installEchoHook?.({ baseUrl: `ws://${location.hostname}:9091` });
    });
} catch (e) {
  console.warn("[Echo] hook skipped:", (e as Error)?.message || e);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
