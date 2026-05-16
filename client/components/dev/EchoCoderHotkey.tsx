import { useEffect } from "react";

export default function EchoCoderHotkey() {
  useEffect(() => {
    console.log("🔥 EchoCoderHotkey mounted");

    const handler = () => {
      console.log("🚀 ANY KEY PRESSED");
      window.dispatchEvent(
        new CustomEvent("open-panel", {
          detail: { id: "echocoder" },
        })
      );
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return null;
}
