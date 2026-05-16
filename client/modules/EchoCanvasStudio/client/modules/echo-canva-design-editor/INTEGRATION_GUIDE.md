# EchoCanva Design Editor - Integration Guide for Echo Recipe Pro

## Overview

The **EchoCanva Design Editor** is a professional-grade image and design editing module designed to work seamlessly within Echo Recipe Pro's panel system.

This module provides:

- 🎨 Full-featured image editing
- 🖼️ Layer management system
- 🤖 AI-powered editing tools
- 🎯 Advanced selection tools
- ✨ Filter and adjustment effects
- 📝 Text and shape tools
- 🔄 Real-time collaboration support
- 💾 Multiple export formats

## Installation Steps

### Step 1: Copy Module Files

Extract and place the module folder in your Echo Recipe Pro installation:

```
echo-recipe-pro/client/modules/echo-canva-design-editor/
├── index.tsx
├── luccca-module.json
└── INTEGRATION_GUIDE.md
```

### Step 2: Update Panel Registry

In your Echo Recipe Pro codebase, locate `client/lib/panel-registry.ts` and add the following:

#### 2a. Add to `PanelKey` Type

```typescript
export type PanelKey =
  | "dashboard"
  | "recipes"
  | "design-studio"
  // Add this line:
  | "echo-canva-design-editor";
// ... other panels
```

#### 2b. Add to `PANEL_REGISTRY` Object

```typescript
export const PANEL_REGISTRY: PanelRegistry = {
  dashboard: () => import("@/modules/Dashboard"),
  recipes: () => import("@/modules/Recipes"),
  "design-studio": () => import("@/modules/DesignStudio"),
  // Add this line:
  "echo-canva-design-editor": () =>
    import("@/modules/echo-canva-design-editor"),
  // ... other panel loaders
};
```

#### 2c. Add to `PANEL_METADATA` Object

```typescript
export const PANEL_METADATA: Record<PanelKey, PanelMetadata> = {
  "echo-canva-design-editor": {
    key: "echo-canva-design-editor",
    label: "Design Editor",
    description: "Professional image and design editor with AI tools",
    icon: "🎨",
    defaultWidth: 1400,
    defaultHeight: 900,
    minWidth: 800,
    minHeight: 600,
    category: "Designer",
    canFloat: true,
    canDock: true,
    resizable: true,
    maximizable: true,
  },
  // ... other panel metadata
};
```

### Step 3: Add Navigation Entry (Optional)

To add the module to your sidebar/navigation:

```typescript
// In your navigation config file (e.g., client/lib/navigation-config.ts)
export const NAVIGATION_ITEMS = [
  // ... existing items
  {
    id: "echo-canva-design-editor",
    label: "Design Editor",
    icon: "🎨",
    action: () => openPanel("echo-canva-design-editor"),
    category: "Designer",
  },
];
```

## Usage

### As a Panel

Launch the module as a floating/docked panel:

```typescript
import { openPanel } from "@/lib/panel-manager";

// Basic launch
openPanel("echo-canva-design-editor");

// With options
openPanel("echo-canva-design-editor", {
  floating: true,
  width: 1400,
  height: 900,
  docked: "right",
  onClose: () => console.log("Editor closed"),
});
```

### With Callbacks

```typescript
openPanel("echo-canva-design-editor", {
  props: {
    initialImage: "https://example.com/image.jpg",
    onSave: (imageData) => {
      console.log("Image saved:", imageData);
      // Save to database or server
    },
    onClose: () => {
      // Cleanup logic
    },
  },
});
```

### From Cake Order Module

Launch the Design Editor directly from the Cake Order module to refine cake designs:

```typescript
// In CakeOrderWorkflow or Design Studio
openPanel("echo-canva-design-editor", {
  props: {
    initialImage: cakeDesignImage,
    onSave: (refinedImage) => {
      updateCakeDesign(refinedImage);
    },
  },
});
```

### Sidebar Button Integration

Add a button to your sidebar:

```tsx
<button onClick={() => openPanel("echo-canva-design-editor")}>
  🎨 Design Editor
</button>
```

## Component Props

The module accepts the following props when launched as a panel:

```typescript
interface EchoCanvaDesignEditorProps {
  onClose?: () => void;
  isPanel?: boolean;
  panelProps?: Record<string, any>;
  initialImage?: string; // URL to load on startup
  onSave?: (imageData: any) => void; // Callback when user saves
}
```

## Features

### Core Editing

✅ Layer management with visibility/lock controls
✅ Non-destructive adjustments
✅ Blend modes and opacity control

### Selection & Drawing Tools

✅ Rectangle select
✅ Ellipse select
✅ Lasso selection
✅ Magic wand (AI-powered)
✅ Brush tool with customizable size
✅ Pencil tool
✅ Eraser with hardness control

### AI Tools

✅ Generative expand (extend image)
✅ Generative replace (smart object replacement)
✅ Generative fill (content-aware fill)
✅ Background removal
✅ Object removal with inpainting

### Effects & Adjustments

✅ Levels adjustment
✅ Curves adjustment
✅ Brightness/Contrast
✅ Hue/Saturation
✅ Color Balance
✅ Filters (blur, sharpen, etc.)

### Advanced Features

✅ Text tool with font selection
✅ Shape tools (rectangle, circle, line)
✅ Gradient tool
✅ Color picker (eyedropper)
✅ Ruler and guides
✅ Grid overlay
✅ Multiple export formats (PNG, JPG, PSD)

## Keyboard Shortcuts

The editor includes common Photoshop-style shortcuts:

```
Ctrl+Z      = Undo
Ctrl+Shift+Z = Redo
Ctrl+A      = Select All
Ctrl+C      = Copy
Ctrl+V      = Paste
Escape      = Deselect
V           = Move tool
R           = Rectangle select
E           = Eraser
B           = Brush
T           = Text tool
Z           = Zoom tool
H           = Hand tool
```

## Sidebar Styling

The module automatically adapts to Echo Recipe Pro's theme. To customize:

```typescript
openPanel("echo-canva-design-editor", {
  themeConfig: {
    accentColor: "#00f0ff",
    backgroundColor: "#0a0a0a",
    textColor: "#ffffff",
    panelBackground: "#1a1a1a",
  },
});
```

## Performance Considerations

- **Large Images**: The editor is optimized for images up to 4000x4000px
- **Layer Count**: Performance best with <50 layers
- **GPU Acceleration**: Uses WebGL for 3D/advanced effects
- **Memory**: Requires ~500MB RAM for typical operations

For best performance:

1. Use web-optimized images (under 10MB)
2. Flatten layers when not needed
3. Close unused dialogs
4. Run on modern browsers (Chrome, Firefox, Safari, Edge)

## Dependencies

The module requires these peer dependencies (must be installed in Echo Recipe Pro):

- `react@^18.3.1`
- `react-dom@^18.3.1`
- `three@^0.176.0` (for 3D preview)
- `@react-three/fiber@^8.18.0`
- `@react-three/drei@^9.122.0`
- `lucide-react` (for icons)
- `tailwindcss` (for styling)

**Note**: Do NOT add `node_modules/` when installing this module.

## API Integration

### Saving Designs

To automatically save designs to your backend:

```typescript
openPanel("echo-canva-design-editor", {
  props: {
    onSave: async (imageData) => {
      const response = await fetch("/api/designs/save", {
        method: "POST",
        body: JSON.stringify({
          name: imageData.name,
          image: imageData.data,
          metadata: imageData.metadata,
        }),
      });
      return response.json();
    },
  },
});
```

### Loading Designs

To load previously saved designs:

```typescript
openPanel("echo-canva-design-editor", {
  props: {
    initialImage: "/api/designs/123/image", // Load from server
  },
});
```

## Troubleshooting

### Panel won't open

1. Verify the module folder is in `client/modules/`
2. Check that `panel-registry.ts` is updated correctly
3. Ensure the import path matches your module location

### Slow performance

1. Try closing other panels
2. Reduce image size/resolution
3. Flatten unnecessary layers
4. Clear browser cache and restart

### Three.js errors

1. Ensure WebGL is enabled in your browser
2. Check browser compatibility (IE not supported)
3. Verify GPU drivers are up to date

### Import errors

If you see "Cannot find module", ensure:

- Relative import paths match your folder structure
- The `tsconfig.json` path aliases are set up correctly
- All dependencies are installed in the parent project
- Rebuild after adding module

## File Structure Reference

```
echo-canva-design-editor/
├── index.tsx                  # Main component wrapper (REQUIRED)
├── luccca-module.json        # Module manifest (REQUIRED)
└── INTEGRATION_GUIDE.md      # This file
```

The actual editor components are imported from the parent EchoCanva codebase.

## Uninstalling

To remove the module:

1. Delete the folder: `client/modules/echo-canva-design-editor/`
2. Remove the entries from `panel-registry.ts`
3. Remove any navigation buttons/links
4. Rebuild the application

## Support

For issues or feature requests, contact the EchoCanva team or check the main repository documentation.

---

**Version**: 1.0.0
**Last Updated**: 2025
