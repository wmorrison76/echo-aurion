# Panel System Implementation Guide

This guide explains how the panel system works in this application and how to create and integrate new modules.

## Overview

The panel system is a modular architecture that allows applications to be loaded as "plug-and-play" panels within a larger framework. Each panel is a self-contained React component that can be opened, minimized, and closed independently.

### Key Components

1. **PanelFrame** - The UI wrapper that provides consistent chrome (title bar, minimize, close buttons)
2. **panel-registry.tsx** - Central registry for all available panels
3. **Module Entry Points** - index.tsx files that export panels as default components

## Panel System Architecture

### PanelFrame Component

The `PanelFrame` component wraps your panel content and provides:

- Title bar with icon
- Minimize/maximize functionality
- Close button
- Consistent styling and theming

```tsx
import { PanelFrame } from "@/components/echo/PanelFrame";

export default function MyPanel(props: any) {
  return (
    <PanelFrame
      title="My Panel"
      icon="🚀"
      onClose={() => console.log("Closed")}
      onMinimize={() => console.log("Minimized")}
      {...props}
    >
      <div className="p-4">{/* Your content here */}</div>
    </PanelFrame>
  );
}
```

### Panel Registry

The `panel-registry.tsx` file maintains three key exports:

#### 1. PanelKey Type

```typescript
export type PanelKey = "dashboard" | "aurum" | "apWorkflow" | "automation";
// ... more panels
```

#### 2. PANEL_REGISTRY

Maps panel keys to lazy-loaded modules:

```typescript
export const PANEL_REGISTRY: PanelRegistry = {
  dashboard: () => import("@/modules/Dashboard"),
  aurum: () => import("@/modules/aurum"),
  apWorkflow: () => import("@/modules/apWorkflow"),
  // ... more registrations
};
```

#### 3. PANEL_METADATA

Stores metadata about each panel:

```typescript
export const PANEL_METADATA: Record<PanelKey, PanelMetadata> = {
  aurum: {
    key: "aurum",
    label: "EchoAurum",
    description: "Accounting and auditing suite",
    icon: "📖",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  // ... more metadata
};
```

## Creating a New Module

### Step 1: Module Structure

Create your module directory with the following structure:

```
client/modules/MyModule/
├── index.tsx           (Entry point - REQUIRED)
├── components/
│   ├── index.ts
│   └── MyComponent.tsx
├── hooks/
│   └── useMyHook.ts
├── data/
│   └── types.ts
└── luccca-module.json  (Optional - for external modules)
```

### Step 2: Create Module Entry Point

Create `client/modules/MyModule/index.tsx`:

```tsx
import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { MyComponent } from "./components/MyComponent";

export default function MyModulePanel(props: any) {
  return (
    <PanelFrame title="My Module" icon="🚀" {...props}>
      <div className="h-full overflow-auto">
        <MyComponent />
      </div>
    </PanelFrame>
  );
}
```

**Important:** The root component MUST be the default export.

### Step 3: Register in Panel Registry

Update `client/lib/panel-registry.tsx` in three places:

#### Add to PanelKey Type:

```typescript
export type PanelKey =
  | "dashboard"
  | "my-module" // Add this
  | "aurum";
// ...
```

#### Add to PANEL_REGISTRY:

```typescript
export const PANEL_REGISTRY: PanelRegistry = {
  dashboard: () => import("@/modules/Dashboard"),
  "my-module": () => import("@/modules/MyModule"), // Add this
  aurum: () => import("@/modules/aurum"),
  // ...
};
```

#### Add to PANEL_METADATA:

```typescript
export const PANEL_METADATA: Record<PanelKey, PanelMetadata> = {
  "my-module": {
    key: "my-module",
    label: "My Module",
    description: "Description of what this module does",
    icon: "🚀",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  // ...
};
```

## Using the Panel System

### Loading a Panel Dynamically

```typescript
import { loadPanel } from "@/lib/panel-registry";

async function openMyPanel() {
  const PanelComponent = await loadPanel("my-module");
  // Render the component
}
```

### Getting Panel Metadata

```typescript
import { getPanelMetadata, getAllPanels } from "@/lib/panel-registry";

// Get metadata for a specific panel
const metadata = getPanelMetadata("aurum");

// Get all available panels
const allPanels = getAllPanels();
```

## File Filtering for Transfer

When preparing a module for transfer to another instance, exclude these files/folders:

### CRITICAL EXCLUSIONS:

- `node_modules/` - Dependencies are managed by the host
- `.git/` - Version control metadata
- `.env` and `.env.*` - Secrets and local configurations
- `dist/`, `build/`, `.next/` - Compiled artifacts
- `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock` - Lock files
- `.vscode/`, `.idea/`, `.DS_Store` - Editor/system files

## Module Manifest File (luccca-module.json)

For external modules, include a manifest file in the module root:

```json
{
  "name": "MyNewModule",
  "label": "My New Module",
  "description": "A brief description of what this module does.",
  "version": "1.0.0",
  "icon": "🚀",
  "defaultWidth": 800,
  "defaultHeight": 600
}
```

This manifest allows other instances to understand the module's configuration without parsing code.

## Best Practices

1. **Single Responsibility**: Each module should have a clear, focused purpose
2. **Lazy Loading**: Use dynamic imports for panel components to reduce initial bundle size
3. **Default Export**: Always export the main component as default from index.tsx
4. **Props Forwarding**: Forward all props to PanelFrame: `{...props}`
5. **Error Boundaries**: Consider wrapping module content in error boundaries
6. **Styling**: Use Tailwind CSS classes for consistent styling with PanelFrame
7. **Responsive Design**: Ensure panels work at various sizes (defaultWidth/defaultHeight are suggestions)

## Advanced: Panel Context

For modules that need to communicate with the panel system, you can access panel props:

```tsx
export default function MyPanel({
  onClose,
  onMinimize,
  isMinimized,
  ...props
}: any) {
  return (
    <PanelFrame
      title="My Panel"
      icon="🚀"
      onClose={onClose}
      onMinimize={onMinimize}
    >
      {/* Content */}
    </PanelFrame>
  );
}
```

## Troubleshooting

### Panel Not Loading

- Check that the module path in PANEL_REGISTRY matches the actual file location
- Verify the index.tsx file has a `default export`
- Check browser console for import errors

### Styling Issues

- Ensure parent container has appropriate height constraints (e.g., `h-full`)
- Use `overflow-auto` or `overflow-hidden` on content wrapper as needed
- PanelFrame provides base styling; additional styles should respect the theme

### Module-to-Module Communication

- Use React Context or a state management solution (Redux, Zustand, etc.)
- Pass callbacks through props when launching panels
- Consider using URL parameters for deep linking between panels

## Migration from Freestanding Apps

To convert an existing application into a panel:

1. Identify the main entry component
2. Wrap it with PanelFrame
3. Create an index.tsx that exports it as default
4. Register it in panel-registry.tsx
5. Test in the panel context (responsive behavior, prop handling)
6. Create luccca-module.json manifest if needed for external transfer
