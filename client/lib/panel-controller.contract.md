# Panel Controller Contract

First-class component/contract for dock bar actions and panel management.

## Inputs

- **DockAction**: Union `"close-all" | "stack-grid" | "stack-cascade" | "minimize-all" | "echo-ai-toggle"`.
- **open-panel**: `panelId` (string) — must be a key from the panel registry.
- **dock-action**: Optional `payload?: Record<string, unknown>` in event detail.

## Outputs

No return value. Side effects only:

- **dock-action**: `window.dispatchEvent(new CustomEvent("dock-action", { detail: { action: DockAction, payload? } }))`.
- **open-panel**: `window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: string } }))`.

## Layout helpers

- **calculateGridLayout(panelIds, containerWidth, containerHeight, panelWidths, panelHeights)**: Returns `PanelLayout` with `type: "grid"`, `positions: Record<string, PanelPosition>`, and optional `sizes`. Positions are within container bounds (sidebar 256px, titleBar 48px, padding 12px).
- **calculateCascadeLayout(panelIds, containerWidth, containerHeight)**: Returns `PanelLayout` with `type: "cascade"`, positions diagonally offset (cascadeOffset 28px). Min panel dimensions 350×250; positions clamped to maxX/maxY.

## Types

- **PanelPosition**: `{ x: number; y: number }`.
- **PanelLayout**: `{ type: "grid" | "cascade"; positions: Record<string, PanelPosition>; sizes?: Record<string, { width: number; height: number }> }`.

## applyPanelLayout

`applyPanelLayout(layout, callback)`: Invokes `callback(panelId, position)` for each entry in `layout.positions`.
