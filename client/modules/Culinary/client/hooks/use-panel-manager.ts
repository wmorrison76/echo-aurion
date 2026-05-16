import { useCallback } from "react";

type PanelIdentifier = string;

type PanelOpenOptions = {
  /** Optional contextual payload for telemetry or future integrations */
  context?: unknown;
  /** Provide the surface or workspace area that initiated the open */
  area?: string;
};

type PanelManager = {
  open: (panel: PanelIdentifier, options?: PanelOpenOptions) => void;
  minimize: (panel: PanelIdentifier) => void;
  dock: (panel: PanelIdentifier) => void;
};

type TelemetryEvent = {
  type: "open" | "minimize" | "dock";
  panel: PanelIdentifier;
  timestamp: number;
  payload?: PanelOpenOptions;
};

const recordEvent = (event: TelemetryEvent) => {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console -- surfaced only for developer ergonomics inside Builder dev
    console.info(`[PanelManager:${event.type}]`, event.panel, event.payload ?? null);
  }
  window.dispatchEvent(
    new CustomEvent("luccca:panel", {
      detail: event,
    }),
  );
};

export function usePanelManager(): PanelManager {
  const open = useCallback((panel: PanelIdentifier, options?: PanelOpenOptions) => {
    recordEvent({ type: "open", panel, payload: options, timestamp: Date.now() });
  }, []);

  const minimize = useCallback((panel: PanelIdentifier) => {
    recordEvent({ type: "minimize", panel, timestamp: Date.now() });
  }, []);

  const dock = useCallback((panel: PanelIdentifier, options?: PanelOpenOptions) => {
    recordEvent({ type: "dock", panel, payload: options, timestamp: Date.now() });
  }, []);

  return {
    open,
    minimize,
    dock,
  };
}
