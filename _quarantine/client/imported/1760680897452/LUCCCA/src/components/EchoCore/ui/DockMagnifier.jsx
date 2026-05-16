// src/components/EchoCore/ui/DockMagnifier.jsx
// A magnifying dock component that scales items based on mouse position
// or keyboard focus, creating a dynamic zoom effect.
// This is useful for toolbars or docks where you want to highlight items
// when the user hovers over them or focuses on them with the keyboard.
// The component accepts children, maxScale, radius, disabled, and className props.

import React, { useMemo, useRef, useState, useLayoutEffect } from "react";

export default function DockMagnifier({
  children,
  maxScale = 1.8,   // 1.0 = no magnify; 1.8 ≈ Dock feel
  radius   = 120,   // px influence spread
  disabled = false,
  className = "",
}) {
  const containerRef = useRef(null);
  const itemRefs = useMemo(
    () => React.Children.map(children, () => React.createRef()),
    [children]
  );
  const [mouseX, setMouseX] = useState(null);

  // Recompute on mouse move
  function onMouseMove(e) {
    if (disabled) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouseX(e.clientX - rect.left);
  }
  function onMouseLeave() {
    setMouseX(null);
  }

  // For keyboard accessibility: focus magnifies the focused item
  function onItemFocus(i) {
    if (disabled) return;
    const rect = itemRefs[i].current?.getBoundingClientRect();
    const parentRect = containerRef.current?.getBoundingClientRect();
    if (rect && parentRect) setMouseX(rect.left - parentRect.left + rect.width / 2);
  }
  function onItemBlur() {
    if (disabled) return;
    setMouseX(null);
  }

  // Compute transforms
  const wrapped = React.Children.map(children, (child, i) => {
    const ref = itemRefs[i];
    let scale = 1;
    if (mouseX != null && ref.current) {
      const r = ref.current.getBoundingClientRect();
      const rect = containerRef.current.getBoundingClientRect();
      const center = r.left - rect.left + r.width / 2;
      const dist = Math.abs(mouseX - center);
      const influence = Math.max(0, (radius - dist) / radius); // 0..1
      scale = 1 + influence * (maxScale - 1);
    }

    return (
      <div
        ref={ref}
        className="dock-item-wrapper"
        style={{
          transform: `translateY(${mouseX != null ? -4 * (scale - 1) : 0}px) scale(${scale})`,
          transition: disabled ? undefined : "transform 90ms ease-out",
          willChange: "transform",
          zIndex: Math.round(scale * 100), // raise larger items
        }}
        onFocus={() => onItemFocus(i)}
        onBlur={onItemBlur}
      >
        {child}
      </div>
    );
  });

  return (
    <div
      ref={containerRef}
      className={`echo-dock ${className}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      role="toolbar"
      aria-label="Echo toolbar"
    >
      {wrapped}
    </div>
  );
}
