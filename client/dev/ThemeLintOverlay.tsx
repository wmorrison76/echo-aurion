/**
 * ThemeLintOverlay (dev-only)
 * Runtime overlay that flags token violations on screen (hardcoded colors, non-token values).
 * CI: hardcoded color scan is separate (e.g. theme-hardcoded-color-check.mjs).
 */

import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DEV = import.meta.env?.DEV ?? true;
const HARDCODED_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b|rgba?\s*\(.*?\)|hsla?\s*\(.*?\)/;

/**
 * Checks if a color value is actually hardcoded in the element's style attribute or similar.
 * getComputedStyle always returns resolved values, so we can't reliably detect violations
 * on elements that use CSS variables unless we check the source CSS (which is too slow).
 * Instead, we flag values that are likely not from the theme tokens or are inline styles.
 */
function isViolation(el: Element, value: string): boolean {
  if (!HARDCODED_COLOR_PATTERN.test(value)) return false;

  // If it's an inline style, it's definitely a violation if it's a hardcoded color
  const inlineStyle = el.getAttribute("style");
  if (inlineStyle && HARDCODED_COLOR_PATTERN.test(inlineStyle)) return true;

  // For other cases, we can check if it's one of our known "bad" hardcoded colors
  // But for now, let's just be less aggressive and only check inline styles or specific patterns
  return false;
}

export interface ThemeLintOverlayProps {
  enabled?: boolean;
  onDismiss?: () => void;
}

export default function ThemeLintOverlay({ enabled = false, onDismiss }: ThemeLintOverlayProps) {
  const [violations, setViolations] = useState<Array<{ selector: string; value: string }>>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!DEV || !enabled || typeof document === "undefined") return;
    const run = () => {
      const found: Array<{ selector: string; value: string }> = [];
      try {
        const all = document.querySelectorAll("*");
        for (const el of all) {
          if (shouldSkipElement(el)) continue;

          const style = window.getComputedStyle(el);
          const props = ["color", "backgroundColor", "borderColor", "fill"] as const;

          for (const prop of props) {
            const value = style.getPropertyValue(prop.replace(/([A-Z])/g, "-$1").toLowerCase()) || (style as any)[prop];

            // Only flag if it's an inline style violation for now to reduce noise
            if (value && isViolation(el, value)) {
              const sel = el.id ? `#${el.id}` : el.className ? `.${String(el.className).split(" ")[0]}` : el.tagName;
              found.push({ selector: sel, value: String(value).slice(0, 30) });
              if (found.length >= 20) break;
            }
          }
          if (found.length >= 20) break;
        }
      } catch {
        // ignore
      }
      setViolations(found);
      setVisible(found.length > 0);
    };
    const t = setTimeout(run, 1500); // Wait longer before scanning
    return () => clearTimeout(t);
  }, [enabled]);

  if (!DEV || !enabled || !visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[9999] max-w-sm rounded-lg border border-amber-500 bg-amber-500/10 p-3 shadow-lg",
        "text-amber-800 dark:text-amber-200"
      )}
      role="status"
      aria-label="Theme lint violations"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="flex items-center gap-1 font-medium text-sm">
          <AlertTriangle className="h-4 w-4" />
          Theme token violations (dev)
        </span>
        {onDismiss && (
          <button type="button" onClick={() => { setVisible(false); onDismiss(); }} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <ul className="text-xs space-y-1 max-h-32 overflow-auto">
        {violations.slice(0, 10).map((v, i) => (
          <li key={i}>
            <code className="bg-black/10 px-1 rounded">{v.selector}</code>: {v.value}
          </li>
        ))}
      </ul>
      {violations.length > 10 && <p className="text-xs mt-1">+{violations.length - 10} more</p>}
    </div>
  );
}
