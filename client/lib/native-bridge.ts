/**
 * D14 · Native bridge — typed contract for `window.__LUCCCA_NATIVE__`.
 *
 * The bridge is exposed by `electron/preload.js` when the app runs
 * inside the Electron desktop shell. In a browser / PWA the property
 * is undefined and callers must fall back (see `FloatingPanel.tsx`'s
 * `handlePopOut` for the canonical pattern).
 */

export interface NativeBrand {
  brand: string;
  productName: string;
  primaryColor?: string;
}

export interface NativeDisplay {
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  primary: boolean;
}

export interface DetachOptions {
  /** Initial window width in CSS pixels. Clamped 400–4000 by main.js. */
  width?: number;
  /** Initial window height in CSS pixels. Clamped 300–3000 by main.js. */
  height?: number;
  /** OS window title; defaults to "LUCCCA · <panelId>". */
  title?: string;
  /** Spawn the window centered on a specific display id (from `getDisplays()`). */
  displayId?: number;
}

export interface NativeBridge {
  brand: NativeBrand;
  isElectron: true;
  platform: NodeJS.Platform;
  /** Spawn a native OS window that loads the app with ?detach=<panelId>. */
  detachPanel(panelId: string, opts?: DetachOptions):
    Promise<{ ok: boolean; panelId: string; reused?: boolean; error?: string }>;
  /** Enumerate connected displays for "send to second monitor" UIs. */
  getDisplays(): Promise<NativeDisplay[]>;
  /** Close the *current* detached window (no-op in the main window). */
  closeDetached(): Promise<{ ok: boolean; error?: string }>;
}

declare global {
  interface Window {
    __LUCCCA_NATIVE__?: NativeBridge;
  }
}

/** Convenience: are we running inside the Electron shell? */
export function isElectron(): boolean {
  return typeof window !== "undefined" && window.__LUCCCA_NATIVE__?.isElectron === true;
}

/** Convenience: this window was opened as a detached panel — read its id. */
export function detachedPanelId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = new URL(window.location.href).searchParams.get("detach");
    return id || null;
  } catch {
    return null;
  }
}
