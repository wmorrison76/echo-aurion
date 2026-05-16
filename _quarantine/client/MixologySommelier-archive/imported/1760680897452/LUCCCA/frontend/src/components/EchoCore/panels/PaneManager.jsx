// src/components/EchoCore/PaneManager.jsx
/**
 * LUCCCA | PaneManager
 * - Draggable/resizable panels using react-rnd
 * - Click/drag brings a panel to front (z-index stacking)
 * - Positions are kept in local component state
 */
import React, { useMemo, useRef, useState, useCallback } from "react";
import { Rnd } from "react-rnd";
import PanelHeader from "./PanelHeader"; // if you use it; otherwise comment out

// Minimal starter set if none provided
const DEFAULT_PANES = [
  {
    id: "cost-forecast",
    title: "Cost Forecast",
    x: 80,
    y: 80,
    width: 420,
    height: 320,
    z: 1,
    content: <div className="p-3">CostForecast<br/>Mock data panel</div>,
  },
  {
    id: "labor-forecast",
    title: "Labor Forecast",
    x: 540,
    y: 120,
    width: 420,
    height: 320,
    z: 2,
    content: <div className="p-3">LaborForecast<br/>Mock data panel</div>,
  },
];

export default function PaneManager({ initialPanes = DEFAULT_PANES }) {
  // Sort incoming panes so later ones sit on top initially
  const seeded = useMemo(
    () =>
      initialPanes.map((p, i) => ({
        ...p,
        z: typeof p.z === "number" ? p.z : i + 1,
      })),
    [initialPanes]
  );

  const [panes, setPanes] = useState(seeded);

  // Tracks the next z-index to assign when a panel is focused
  const zCounter = useRef(
    Math.max(...seeded.map((p) => p.z || 1), 1) + 1
  );

  const focusPane = useCallback((id) => {
    setPanes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, z: zCounter.current++ } : p))
    );
  }, []);

  const updateBounds = useCallback((id, next) => {
    setPanes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...next } : p))
    );
  }, []);

  return (
    <div className="pane-layer">
      {panes.map((pane) => (
        <Rnd
          key={pane.id}
          default={{
            x: pane.x,
            y: pane.y,
            width: pane.width,
            height: pane.height,
          }}
          position={{ x: pane.x, y: pane.y }}
          size={{ width: pane.width, height: pane.height }}
          onDragStart={() => focusPane(pane.id)}
          onResizeStart={() => focusPane(pane.id)}
          onMouseDown={() => focusPane(pane.id)}
          onDragStop={(_, d) =>
            updateBounds(pane.id, { x: d.x, y: d.y })
          }
          onResizeStop={(_, __, ref, delta, pos) =>
            updateBounds(pane.id, {
              width: Math.round(ref.offsetWidth),
              height: Math.round(ref.offsetHeight),
              ...pos,
            })
          }
          bounds="parent"
          dragHandleClassName="panel-header"          // drag from header
          cancel=".panel-body, textarea, input, button, [data-cancel-drag]"
          enableUserSelectHack={false}                // Safari sel
