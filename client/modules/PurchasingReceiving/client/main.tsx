import "./global.css";
import { createRoot } from "react-dom/client";
import App from "./App"; // Polyfill for requestIdleCallback if not available
if (typeof window !== "undefined" && !window.requestIdleCallback) {
  (window as any).requestIdleCallback = (callback: IdleRequestCallback) => {
    const start = Date.now();
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      } as IdleDeadline);
    }, 1);
  };
}
if (typeof window !== "undefined" && !window.cancelIdleCallback) {
  (window as any).cancelIdleCallback = (id: number) => {
    clearTimeout(id);
  };
}
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
