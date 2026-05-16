/**
 * HOC: track module mount/unmount and emit module.invisible when mounted but not visible.
 */

import React, { useEffect, useRef } from "react";
import { diag } from "./diagnostic-core";

function getCSSSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) selector += `#${current.id}`;
    if (current.className && typeof current.className === "string") {
      selector += "." + current.className.trim().split(/\s+/).slice(0, 2).join(".");
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  return parts.join(" > ");
}

export function withDiagTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  moduleId: string
): React.ComponentType<P> {
  const TrackedComponent = (props: P) => {
    const renderCount = useRef(0);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      diag.moduleMount(moduleId);

      const el = rootRef.current;
      if (el && typeof window !== "undefined") {
        const check = (): void => {
          const styles = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const reasons: string[] = [];
          if (styles.display === "none") reasons.push("display:none");
          if (styles.visibility === "hidden") reasons.push("visibility:hidden");
          if (styles.opacity === "0") reasons.push("opacity:0");
          if (rect.width === 0) reasons.push("width:0");
          if (rect.height === 0) reasons.push("height:0");
          if (reasons.length > 0) {
            diag.emit(
              "module.invisible",
              { reasons, selector: getCSSSelector(el) },
              moduleId
            );
          }
        };
        const t = setTimeout(check, 100);
        return () => {
          clearTimeout(t);
          diag.moduleUnmount(moduleId);
        };
      }
      return () => diag.moduleUnmount(moduleId);
    }, [moduleId]);

    renderCount.current += 1;

    return (
      <div
        ref={rootRef}
        data-module-root={moduleId}
        data-diag-render-count={renderCount.current}
        style={{ width: "100%", height: "100%", minHeight: 0 }}
      >
        <WrappedComponent {...props} />
      </div>
    );
  };

  TrackedComponent.displayName = `DiagTracked(${moduleId})`;
  return TrackedComponent;
}
