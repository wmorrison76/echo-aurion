/**
 * useDesktop — iter265 P1 enhancement.
 *
 * React hook that exposes the Electron IPC bridge (`window.__LUCCCA_NATIVE__`)
 * to the rest of the app. When running in the browser the hook returns
 * `isDesktop: false` and every method is a no-op so feature code can call
 * `desktop.print(...)` unconditionally without branching everywhere.
 *
 * Methods proxied:
 *   - notify({title, body, urgency})       → native OS notification
 *   - print(html, opts)                    → native print dialog
 *   - openFile(path)                       → reveal file in OS file manager
 *   - showSaveDialog(opts)                 → native save dialog
 *   - registerHotkey(accel, callback)      → OS-level global hotkey
 *   - watchFolder(path, callback)          → folder watcher for OCR drop
 *   - getDisplays()                        → multi-monitor info
 *   - detachPanel(panelId, opts)           → existing D14 panel pop-out
 *
 * IMPORTANT: corresponding handlers must exist in /app/electron/main.js
 * and be exposed via /app/electron/preload.js. This hook gracefully
 * falls back when those handlers are missing (older Electron build).
 */
import { useEffect, useMemo, useState } from "react";

interface DesktopBridge {
  isDesktop: boolean;
  platform: string | null;
  notify: (opts: { title: string; body: string; urgency?: "low" | "normal" | "critical" }) => Promise<void>;
  print: (html: string, opts?: { silent?: boolean; copies?: number }) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  showSaveDialog: (opts: { defaultPath?: string; filters?: any[] }) => Promise<string | null>;
  registerHotkey: (accelerator: string, callback: () => void) => () => void;
  watchFolder: (path: string, callback: (filePath: string) => void) => () => void;
  getDisplays: () => Promise<any[]>;
  detachPanel: (panelId: string, opts?: any) => Promise<void>;
  brand: any | null;
}

const NOOP = async () => undefined;

function makeNoopBridge(): DesktopBridge {
  return {
    isDesktop: false,
    platform: null,
    brand: null,
    notify: NOOP as any,
    print: NOOP as any,
    openFile: NOOP as any,
    showSaveDialog: async () => null,
    registerHotkey: () => () => undefined,
    watchFolder: () => () => undefined,
    getDisplays: async () => [],
    detachPanel: NOOP as any,
  };
}

declare global {
  interface Window {
    __LUCCCA_NATIVE__?: any;
  }
}

export function useDesktop(): DesktopBridge {
  const [native] = useState(() =>
    typeof window !== "undefined" ? window.__LUCCCA_NATIVE__ : undefined,
  );

  const bridge = useMemo<DesktopBridge>(() => {
    if (!native?.isElectron) return makeNoopBridge();

    return {
      isDesktop: true,
      platform: native.platform ?? null,
      brand: native.brand ?? null,

      notify: async (opts) => {
        if (typeof native.notify === "function") return native.notify(opts);
        // Fallback: use web Notification API while running in browser-like contexts
        try {
          if ("Notification" in window) {
            if (Notification.permission === "default") {
              await Notification.requestPermission();
            }
            if (Notification.permission === "granted") {
              new Notification(opts.title, { body: opts.body });
            }
          }
        } catch {
          /* swallow */
        }
      },

      print: async (html, opts) => {
        if (typeof native.print === "function") return native.print(html, opts);
        // Fallback: open print dialog in a hidden iframe
        try {
          const iframe = document.createElement("iframe");
          iframe.style.position = "fixed";
          iframe.style.right = "-9999px";
          document.body.appendChild(iframe);
          const doc = iframe.contentDocument!;
          doc.open();
          doc.write(html);
          doc.close();
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        } catch {
          /* swallow */
        }
      },

      openFile: async (path) => {
        if (typeof native.openFile === "function") return native.openFile(path);
      },

      showSaveDialog: async (opts) => {
        if (typeof native.showSaveDialog === "function") {
          return native.showSaveDialog(opts);
        }
        return null;
      },

      registerHotkey: (accelerator, callback) => {
        if (typeof native.registerHotkey === "function") {
          return native.registerHotkey(accelerator, callback);
        }
        return () => undefined;
      },

      watchFolder: (path, callback) => {
        if (typeof native.watchFolder === "function") {
          return native.watchFolder(path, callback);
        }
        return () => undefined;
      },

      getDisplays: async () => {
        if (typeof native.getDisplays === "function") return native.getDisplays();
        return [];
      },

      detachPanel: async (panelId, opts) => {
        if (typeof native.detachPanel === "function") {
          return native.detachPanel(panelId, opts);
        }
      },
    };
  }, [native]);

  return bridge;
}

/**
 * useNativeNotification — opinionated wrapper around useDesktop.notify
 * that respects the browser Notification permission flow when not running
 * in Electron.
 */
export function useNativeNotification() {
  const desktop = useDesktop();
  useEffect(() => {
    if (!desktop.isDesktop && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        // Don't auto-prompt — let caller request when they need it.
      }
    }
  }, [desktop.isDesktop]);
  return desktop.notify;
}
