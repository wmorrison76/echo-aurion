# EchoLayout SaaS UX Foundation

This directory contains Builder.io models and guidelines for building a polished, professional SaaS interface for the EchoLayout immersive designer.

## Overview

The SaaS UX foundation provides:

- **Collapsible Panels**: Panels can be collapsed to focus on the 3D scene
- **Dockable Layouts**: Panels can dock to sides (left, right, bottom)
- **Toolbar Shortcuts**: Quick access to common operations
- **Snap Preferences**: Grid, angle, and object snapping controls
- **BEO Export**: Integrated PDF export with Builder defaults
- **Builder Integration**: All settings flow through `useEchoBuilderConfig` hook

## Models

### EchoPanelLayout

Defines which panels open by default and how they dock:

```json
{
  "defaultOpenPanels": [
    { "id": "outliner", "label": "Scene Hierarchy", "icon": "list" },
    { "id": "variants", "label": "Layout Variants", "icon": "layout" },
    { "id": "eventstudio", "label": "Event Management", "icon": "calendar" }
  ],
  "dockPosition": "left",
  "allowDrag": true,
  "allowCollapse": true,
  "toolbarShortcuts": [
    { "label": "Scene", "panelId": "outliner", "icon": "list" },
    { "label": "Variants", "panelId": "variants", "icon": "layout" }
  ]
}
```

### EchoToolbar

Main toolbar configuration:

```json
{
  "items": [
    { "label": "Scene", "action": "open-panel", "panelId": "outliner" },
    { "label": "Variants", "action": "open-panel", "panelId": "variants" },
    { "label": "Events", "action": "open-panel", "panelId": "eventstudio" },
    { "label": "Export", "action": "export-beo" },
    { "label": "AI Generate", "action": "generate-ai" }
  ],
  "densityMode": "comfortable"
}
```

### EchoSnapPreferences

Snap grid and alignment settings:

```json
{
  "gridSize": 0.25,
  "angleIncrement": 15,
  "objectTolerance": 0.2,
  "enableGridSnap": true,
  "enableAngleSnap": true,
  "enableObjectSnap": false
}
```

### EchoBEOSettings

BEO export and labor rate defaults:

```json
{
  "includeConsumables": true,
  "notes": "Custom event notes",
  "laborRate": 18,
  "fuelCostPerUnit": 1.2
}
```

## Design System Guidelines

### Spacing

- **Gutters**: 8px, 12px, 16px, 24px
- **Component padding**: 8px (compact) / 12px (comfortable)
- **Card margin**: 8px between stacked components

### Typography

- **Titles**: 12-14px, font-medium
- **Body**: 11-12px, regular
- **Captions**: 10px, muted color
- **Emphasis**: Strong contrast on selection/hover

### Colors

- **Background**: Slightly transparent dark (opacity 0.6-0.8)
- **Selection**: Bright cyan (#00bcd4) or accent color
- **Positive**: Green for compliance/success
- **Warning**: Amber for cautions
- **Destructive**: Red for errors or locked states

### Interaction

- **Buttons**: 28-32px height, clear labels
- **Inputs**: Single-line, 28px height
- **Panels**: 2-way drag (interior content + title bar)
- **Collapse**: Smooth animation, keyboard accessible
- **Tooltips**: Fade in on hover, 200ms delay

## Integration Points

### useEchoBuilderConfig Hook

All settings are fetched via the Builder.io config hook:

```tsx
const config = useEchoBuilderConfig(session);
// config.EchoPanelLayout, config.EchoToolbar, config.EchoSnapPreferences, etc.
```

Changes in Builder.io automatically flow to the UI components.

### Panel Manager

Panels are opened/closed by the ToolkitLauncher component:

```tsx
<ToolkitLauncher
  addPanel={(cfg) => {
    // cfg = { id: "outliner", label: "Scene Hierarchy" }
    // Open panel dynamically
  }}
/>
```

### Snap Store

Snap preferences are stored in Zustand and synced with Builder:

```tsx
const { gridSize, angleInc, objectTol } = useSnapStore();
```

Update via store setter or Builder config change.

## Quick Start

1. **In Builder.io**, create an instance of `EchoPanelLayout` model
2. **Configure** default open panels, dock position, toolbar shortcuts
3. **Set** snap preferences, BEO export defaults, labor rates
4. **Deploy**: Changes take effect immediately via `useEchoBuilderConfig` hook
5. **Iterate**: Adjust spacing, colors, and panel order in Builder without touching code

## Best Practices

1. **Keep Panels Minimal**: Show only necessary controls; use collapsible sections
2. **Provide Density Toggle**: Offer "comfortable" vs. "compact" layouts in settings
3. **Keyboard Shortcuts**: Include G (move), R (rotate), S (scale) guides in tooltips
4. **Accessibility**: Ensure panels are keyboard navigable and have proper ARIA labels
5. **Performance**: Limit re-renders by memoizing panel content
6. **Responsiveness**: Test panel layouts on various screen sizes; allow resizing
7. **Visual Feedback**: Highlight selected objects, provide clear focus states

## Extending

To add a new panel:

1. Create the component (e.g., `client/panels/MyCustomPanel.tsx`)
2. Add an entry to `defaultOpenPanels` in Builder
3. Update the switch in `ToolkitLauncher` to handle the new panel ID
4. Ensure it accepts an `onClose` callback for cleanup

To add a new toolbar action:

1. Define the action enum value in `EchoToolbar` model
2. Handle the action in the button click handler
3. Update the toolbar rendering logic to dispatch the action

## Examples

### Custom Panel with Builder Config

```tsx
import { useEchoBuilderConfig } from "@/hooks/useEchoBuilderConfig";

export function MyPanel() {
  const config = useEchoBuilderConfig("session");
  const mySettings = config?.MyCustomModel || {};

  return (
    <div>
      {/* Use mySettings to configure the panel */}
    </div>
  );
}
```

### Snap to Grid

```tsx
import { useSnapStore } from "@/store/snapStore";

const { gridSize } = useSnapStore();
const snappedX = Math.round(x / gridSize) * gridSize;
```

### Open Panel Programmatically

```tsx
import { ToolkitLauncher } from "@/components/ToolkitLauncher";

<ToolkitLauncher
  addPanel={(cfg) => {
    // Dynamically open a panel
    setOpenPanel(cfg.id);
  }}
/>
```

## Troubleshooting

**Panels not showing**: Verify `defaultOpenPanels` array is not empty in Builder config.

**Snap not working**: Check `useSnapStore().gridSize > 0` and apply snapping logic in drag handlers.

**BEO export fails**: Ensure `/api/beo/export` endpoint exists and responds with PDF blob.

**Builder config not updating**: Clear browser cache; verify Builder.io model is published.

## Next Steps

- Integrate with analytics to track panel usage
- Add custom panel templates for specific roles (planner, presenter, client)
- Implement undo/redo for layout changes
- Add real-time collaboration features
- Build mobile-optimized panel layouts
