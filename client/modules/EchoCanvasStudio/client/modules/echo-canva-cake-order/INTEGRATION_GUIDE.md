# EchoCanva Cake Order - Integration Guide for Echo Recipe Pro

## Overview

The **EchoCanva Cake Order** module is a self-contained, "plug-and-play" module designed to integrate seamlessly into Echo Recipe Pro's panel system.

This module provides:

- 📋 Intelligent intake forms for cake orders
- 🎨 Design studio with AI assistance
- 💰 Automatic pricing calculations
- 📖 Recipe management integration
- 🖼️ Image generation with DALL-E

## Installation Steps

### Step 1: Copy Module Files

Extract and place the module folder in your Echo Recipe Pro installation:

```
echo-recipe-pro/client/modules/echo-canva-cake-order/
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
  | "echo-canva-cake-order";
// ... other panels
```

#### 2b. Add to `PANEL_REGISTRY` Object

```typescript
export const PANEL_REGISTRY: PanelRegistry = {
  dashboard: () => import("@/modules/Dashboard"),
  recipes: () => import("@/modules/Recipes"),
  "design-studio": () => import("@/modules/DesignStudio"),
  // Add this line:
  "echo-canva-cake-order": () => import("@/modules/echo-canva-cake-order"),
  // ... other panel loaders
};
```

#### 2c. Add to `PANEL_METADATA` Object

```typescript
export const PANEL_METADATA: Record<PanelKey, PanelMetadata> = {
  "echo-canva-cake-order": {
    key: "echo-canva-cake-order",
    label: "Cake Order",
    description: "AI-powered cake order workflow",
    icon: "🎂",
    defaultWidth: 1000,
    defaultHeight: 800,
    category: "Designer",
    canFloat: true,
    canDock: true,
    resizable: true,
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
    id: "echo-canva-cake-order",
    label: "Cake Order",
    icon: "🎂",
    action: () => openPanel("echo-canva-cake-order"),
    category: "Designer",
  },
];
```

## Usage

### As a Panel

Launch the module as a floating/docked panel:

```typescript
import { openPanel } from "@/lib/panel-manager";

// From anywhere in your app
openPanel("echo-canva-cake-order", {
  floating: true,
  onClose: () => console.log("Panel closed"),
});
```

### With Event Callbacks

```typescript
openPanel("echo-canva-cake-order", {
  props: {
    onOrderComplete: (design, answers) => {
      console.log("Order completed:", { design, answers });
      // Handle completed order
    },
    onClose: () => {
      // Cleanup logic
    },
  },
});
```

### Sidebar Button Integration

Add a button to your sidebar:

```tsx
<button onClick={() => openPanel("echo-canva-cake-order")}>
  🎂 Cake Order
</button>
```

## Component Props

The module accepts the following props when launched as a panel:

```typescript
interface EchoCanvaCakeOrderProps {
  onOrderComplete?: (design: DesignData, answers: IntakeAnswers) => void;
  onClose?: () => void;
  isPanel?: boolean;
  panelProps?: Record<string, any>;
}
```

## Features

✅ **Intake Forms** - Multi-step questionnaire for cake requirements
✅ **Design Studio** - Interactive cake design interface
✅ **Pricing** - Real-time price calculations
✅ **Recipe Integration** - Links to recipe management
✅ **AI Assistance** - Powered by OpenAI's DALL-E
✅ **Image Export** - Export cake designs as images

## Sidebar Styling

The module automatically adapts to Echo Recipe Pro's theme system. To customize colors/styling, you can pass theme configuration:

```typescript
openPanel("echo-canva-cake-order", {
  themeConfig: {
    accentColor: "#00f0ff",
    backgroundColor: "#0a0a0a",
    textColor: "#ffffff",
  },
});
```

## Dependencies

The module requires these peer dependencies (already included in Echo Recipe Pro):

- `react@^18.3.1`
- `react-dom@^18.3.1`
- `lucide-react` (for icons)
- `tailwindcss` (for styling)

**Note**: Do NOT add `node_modules/` when installing this module.

## Troubleshooting

### Panel won't open

1. Verify the module folder is in `client/modules/`
2. Check that `panel-registry.ts` is updated correctly
3. Ensure the import path matches your module location

### Styling issues

1. Make sure Tailwind CSS is configured in Echo Recipe Pro
2. Check that dark mode classes are available
3. Verify the theme variables in `globals.css`

### Import errors

If you see "Cannot find module", ensure:

- Relative import paths match your folder structure
- The `tsconfig.json` path aliases are set up correctly
- All dependencies are installed in the parent project

## File Structure Reference

```
echo-canva-cake-order/
├── index.tsx                  # Main component (REQUIRED)
├── luccca-module.json        # Module manifest (REQUIRED)
└── INTEGRATION_GUIDE.md      # This file
```

## Uninstalling

To remove the module:

1. Delete the folder: `client/modules/echo-canva-cake-order/`
2. Remove the entries from `panel-registry.ts`
3. Remove any navigation buttons/links
4. Rebuild the application

## Support

For issues or feature requests, contact the EchoCanva team or check the main repository documentation.

---

**Version**: 1.0.0
**Last Updated**: 2025
