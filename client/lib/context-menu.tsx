import React, { useState, useEffect, useRef, useCallback } from "react";

/* ── Shared Right-Click Context Menu ── */
/* Used across all operational modules to reduce click-depth */

interface ContextMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  color?: string;
  disabled?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  /** data-testid for the context menu trigger */
  testId?: string;
}

const MENU_STYLE: React.CSSProperties = {
  position: "fixed", zIndex: 9999,
  background: "#1e293b", border: "1px solid #334155",
  borderRadius: 8, padding: "4px 0",
  boxShadow: "0 8px 30px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)",
  minWidth: 180, maxWidth: 260,
  fontFamily: "'Inter', -apple-system, sans-serif",
  backdropFilter: "blur(12px)",
};

export function RightClickMenu({ items, children, testId }: ContextMenuProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Position menu, ensuring it stays within viewport
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - (items.length * 32 + 20));
    setPos({ x, y });
    setVisible(true);
  }, [items.length]);

  useEffect(() => {
    if (!visible) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setVisible(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setVisible(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [visible]);

  return (
    <>
      {React.cloneElement(React.Children.only(children) as React.ReactElement, {
        onContextMenu: handleContext,
        ...(testId ? { "data-testid": testId } : {}),
      })}
      {visible && (
        <div ref={menuRef} data-testid="context-menu" style={{ ...MENU_STYLE, left: pos.x, top: pos.y }}>
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {item.divider && <div style={{ height: 1, background: "#334155", margin: "4px 8px" }} />}
              <button
                data-testid={`ctx-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                disabled={item.disabled}
                onClick={() => { item.action(); setVisible(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 14px", border: "none", background: "transparent",
                  color: item.disabled ? "#475569" : (item.color || "#e2e8f0"),
                  fontSize: 12, fontWeight: 500, cursor: item.disabled ? "default" : "pointer",
                  textAlign: "left", fontFamily: "inherit",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!item.disabled) (e.target as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent"; }}
              >
                {item.icon && <span style={{ fontSize: 13, width: 18, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>}
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </>
  );
}
