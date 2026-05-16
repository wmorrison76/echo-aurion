import React from "react";
import { canUseEchoCoder } from "@/shared/echocoderGuard";

export async function openEchoCoder() {
  if (!canUseEchoCoder()) {
    console.warn("[EchoCoder] Access denied (locked or expired)");
    return;
  }

  const mod = await import("@/client/developer/EchoCoder");
  const EchoCoder = mod.default;

  window.dispatchEvent(
    new CustomEvent("open-panel", {
      detail: {
        id: "echocoder-dev",
        component: <EchoCoder />,
        floating: true,
        width: 1100,
        height: 700,
      },
    })
  );
}
