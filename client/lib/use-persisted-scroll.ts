import React from "react";

type ScrollPos = { top: number; left: number };

function safeRead(key: string): ScrollPos | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const top = Number(parsed?.top);
    const left = Number(parsed?.left);
    if (!Number.isFinite(top) || !Number.isFinite(left)) return null;
    return { top, left };
  } catch {
    return null;
  }
}

function safeWrite(key: string, pos: ScrollPos): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(pos));
  } catch {
    // ignore
  }
}

/**
 * Persist + restore scrollTop/scrollLeft for a scroll container.
 * - Uses sessionStorage so it survives refresh but not long-term.
 * - Safe for mobile/tablet; does not block scrolling.
 */
export function usePersistedScroll(options: {
  storageKey: string;
  enabled?: boolean;
}) {
  const enabled = options.enabled ?? true;
  const rafRef = React.useRef<number | null>(null);
  const elRef = React.useRef<HTMLElement | null>(null);

  const setRef = React.useCallback((el: HTMLElement | null) => {
    elRef.current = el;
  }, []);

  // Restore on mount/when key changes
  React.useLayoutEffect(() => {
    if (!enabled) return;
    const el = elRef.current;
    if (!el) return;
    const pos = safeRead(options.storageKey);
    if (!pos) return;
    // next frame so layout is ready (important for virtualized content)
    requestAnimationFrame(() => {
      try {
        el.scrollTop = pos.top;
        el.scrollLeft = pos.left;
      } catch {
        // ignore
      }
    });
  }, [enabled, options.storageKey]);

  // Persist on scroll (throttled to RAF)
  React.useEffect(() => {
    if (!enabled) return;
    const el = elRef.current;
    if (!el) return;

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        safeWrite(options.storageKey, {
          top: el.scrollTop,
          left: el.scrollLeft,
        });
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll as any);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, options.storageKey]);

  return { scrollRef: setRef };
}
