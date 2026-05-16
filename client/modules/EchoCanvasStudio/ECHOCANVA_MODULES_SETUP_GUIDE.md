# EchoCanva Modules - Complete Setup Guide for Echo Recipe Pro

**Version**: 1.0.0  
**Last Updated**: 2025

---

## 📋 Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [Detailed Setup](#detailed-setup)
3. [File Structure](#file-structure)
4. [Code Snippets](#code-snippets)
5. [Troubleshooting](#troubleshooting)
6. [Advanced Configuration](#advanced-configuration)
7. [Module Features](#module-features)
8. [FAQ](#faq)

---

## Quick Start

### What You're Installing

Two "plug-and-play" modules for Echo Recipe Pro:

1. **🎂 Cake Order** - AI-powered order workflow with design studio
2. **🎨 Design Editor** - Professional image editing suite

Both modules:

- ✅ Work as floating or docked panels
- ✅ Launch from sidebar buttons
- ✅ Include their own full functionality
- ✅ Require zero modifications to existing code
- ✅ Adapt automatically to Echo Recipe Pro theme

### Installation (3 Steps)

**1. Copy Folders**

```bash
# Copy both module folders to your Echo Recipe Pro project
cp -r echo-canva-cake-order/ echo-recipe-pro/client/modules/
cp -r echo-canva-design-editor/ echo-recipe-pro/client/modules/
```

**2. Update Registry** (see "Panel Registry Configuration" below)

**3. Rebuild**

```bash
cd echo-recipe-pro
npm run build
# or: yarn build
```

**Done!** The modules are now available via `openPanel()`.

---

## Detailed Setup

### Step 1: Clean Module Files

Before copying, ensure you've removed large unnecessary files:

```bash
# Remove these before copying to Echo Recipe Pro:
rm -rf node_modules/
rm -rf dist/ build/ .next/
rm .env .env.local .env.*.local
rm -rf .git/ .vscode/ .idea/
rm pnpm-lock.yaml package-lock.json yarn.lock
rm -rf .DS_Store */.DS_Store
```

✅ **What should remain**:

- `index.tsx` (main component)
- `luccca-module.json` (manifest)
- `INTEGRATION_GUIDE.md` (documentation)
- Source files and assets only

### Step 2: Place Modules

Copy the cleaned folders to Echo Recipe Pro:

```
echo-recipe-pro/
└── client/
    └── modules/
        ├── echo-canva-cake-order/      ← Add this
        │   ├── index.tsx
        │   ├── luccca-module.json
        │   └── INTEGRATION_GUIDE.md
        └── echo-canva-design-editor/   ← Add this
            ├── index.tsx
            ├── luccca-module.json
            └── INTEGRATION_GUIDE.md
```

### Step 3: Update Panel Registry

In Echo Recipe Pro, open `client/lib/panel-registry.ts` and apply the changes below.

---

## Code Snippets

### Panel Registry Configuration

Copy and paste these exact changes into `client/lib/panel-registry.ts`:

#### **Change 1: Add to Type Definition**

Find this section:

```typescript
export type PanelKey = "dashboard" | "recipes";
// ... other entries
```

Add these lines:

```typescript
export type PanelKey =
  | "dashboard"
  | "recipes"
  // Add these two lines:
  | "echo-canva-cake-order"
  | "echo-canva-design-editor";
// ... other entries
```

#### **Change 2: Add to Panel Registry**

Find this section:

```typescript
export const PANEL_REGISTRY: PanelRegistry = {
  dashboard: () => import("@/modules/Dashboard"),
  recipes: () => import("@/modules/Recipes"),
  // ... other entries
};
```

Add these lines inside the object:

```typescript
export const PANEL_REGISTRY: PanelRegistry = {
  dashboard: () => import("@/modules/Dashboard"),
  recipes: () => import("@/modules/Recipes"),
  // Add these two lines:
  "echo-canva-cake-order": () => import("@/modules/echo-canva-cake-order"),
  "echo-canva-design-editor": () =>
    import("@/modules/echo-canva-design-editor"),
  // ... other entries
};
```

#### **Change 3: Add to Metadata**

Find this section:

```typescript
export const PANEL_METADATA: Record<PanelKey, PanelMetadata> = {
  dashboard: {
    key: "dashboard",
    // ... other props
  },
  // ... other entries
};
```

Add this block (adjust spacing to match your style):

```typescript
  "echo-canva-cake-order": {
    key: "echo-canva-cake-order",
    label: "Cake Order",
    description: "AI-powered cake order workflow with design studio",
    icon: "🎂",
    defaultWidth: 1000,
    defaultHeight: 800,
    minWidth: 600,
    minHeight: 400,
    category: "Designer",
    canFloat: true,
    canDock: true,
    resizable: true,
    closeable: true,
  },
  "echo-canva-design-editor": {
    key: "echo-canva-design-editor",
    label: "Design Editor",
    description: "Professional image editor with AI-powered tools",
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
```

---

## Sidebar Integration (Optional)

To add buttons to your sidebar:

### Option A: Simple Button

```tsx
// In your sidebar component
import { openPanel } from "@/lib/panel-manager";

export function Sidebar() {
  return (
    <nav>
      {/* ... existing nav items ... */}

      {/* Add these */}
      <div className="mt-8 pt-8 border-t">
        <h3 className="px-4 text-sm font-semibold mb-2">EchoCanva</h3>
        <button
          onClick={() => openPanel("echo-canva-cake-order")}
          className="w-full px-4 py-2 text-left hover:bg-accent rounded"
        >
          🎂 Cake Order
        </button>
        <button
          onClick={() => openPanel("echo-canva-design-editor")}
          className="w-full px-4 py-2 text-left hover:bg-accent rounded"
        >
          🎨 Design Editor
        </button>
      </div>
    </nav>
  );
}
```

### Option B: Navigation Config (Recommended)

```typescript
// In client/lib/navigation-config.ts
export const NAVIGATION_ITEMS = [
  // ... existing items
  {
    section: "Designer",
    items: [
      {
        id: "echo-canva-cake-order",
        label: "Cake Order",
        icon: "🎂",
        action: () => openPanel("echo-canva-cake-order"),
      },
      {
        id: "echo-canva-design-editor",
        label: "Design Editor",
        icon: "🎨",
        action: () => openPanel("echo-canva-design-editor"),
      },
    ],
  },
];
```

---

## File Structure

After installation, you should have:

```
echo-recipe-pro/
├── client/
│   ├── lib/
│   │   └── panel-registry.ts        (MODIFIED - add 3 sections)
│   ├── modules/
│   │   ├── dashboard/
│   │   ├── recipes/
│   │   ├── echo-canva-cake-order/   (NEW)
│   │   │   ├── index.tsx
│   │   │   ├── luccca-module.json
│   │   │   └── INTEGRATION_GUIDE.md
│   │   └── echo-canva-design-editor/   (NEW)
│   │       ├── index.tsx
│   │       ├── luccca-module.json
│   │       └── INTEGRATION_GUIDE.md
│   └── [... other files ...]
└── [... rest of project ...]
```

---

## Launching Modules

### From TypeScript/React

```typescript
import { openPanel } from "@/lib/panel-manager";

// Launch Cake Order as floating panel
openPanel("echo-canva-cake-order", {
  floating: true,
  width: 1000,
  height: 800,
});

// Launch Design Editor with callbacks
openPanel("echo-canva-design-editor", {
  props: {
    initialImage: "https://example.com/image.jpg",
    onSave: (imageData) => {
      console.log("Image saved:", imageData);
    },
    onClose: () => {
      console.log("Editor closed");
    },
  },
});
```

### From HTML Button

```html
<button onclick="window.openPanel('echo-canva-cake-order')">
  🎂 New Cake Order
</button>
```

### With Theme Configuration

```typescript
openPanel("echo-canva-cake-order", {
  themeConfig: {
    accentColor: "#00f0ff",
    backgroundColor: "#0a0a0a",
    textColor: "#ffffff",
  },
});
```

---

## Troubleshooting

### Problem: "Module not found" error

**Solution**:

1. Verify folders are in `client/modules/` (not `src/modules/`)
2. Check folder names exactly match:
   - `echo-canva-cake-order`
   - `echo-canva-design-editor`
3. Verify `panel-registry.ts` import paths are correct
4. Rebuild: `npm run build`

### Problem: Panel won't open

**Solution**:

1. Check browser console for errors (F12)
2. Verify `openPanel()` function exists
3. Check that panel key is registered in `panel-registry.ts`
4. Try force reload: `Ctrl+Shift+R` (or `Cmd+Shift+R`)

### Problem: Styling looks broken

**Solution**:

1. Ensure Tailwind CSS is configured
2. Check dark mode is enabled: `<html class="dark">`
3. Verify CSS variables are set in `globals.css`
4. Check `luccca-module.json` for theme config

### Problem: Missing dependencies

**Solution**:

1. This is expected - don't copy `node_modules/`
2. Ensure Echo Recipe Pro has all dependencies:
   ```bash
   npm install react@^18.3.1 react-dom@^18.3.1 lucide-react tailwindcss
   ```
3. For Design Editor, also install:
   ```bash
   npm install three@^0.176.0 @react-three/fiber @react-three/drei
   ```

### Problem: Import errors with relative paths

**Solution**:

1. Check `tsconfig.json` has correct path aliases:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```
2. Update import paths if structure is different
3. Example fix:
   ```typescript
   // If modules are at client/modules/
   // Import should be:
   import EchoCanvaCakeOrder from "@/modules/echo-canva-cake-order";
   ```

---

## Advanced Configuration

### Custom Theme

```typescript
// Create a custom theme configuration
const echoCanvaTheme = {
  accentColor: "#00f0ff",
  backgroundColor: "#0a0a0a",
  textColor: "#ffffff",
  panelBackground: "#1a1a1a",
  borderColor: "#333333",
  successColor: "#00ff00",
  errorColor: "#ff0000",
};

openPanel("echo-canva-cake-order", {
  themeConfig: echoCanvaTheme,
});
```

### Event Handling

```typescript
// Cake Order with full event handling
openPanel("echo-canva-cake-order", {
  props: {
    onOrderComplete: async (design, answers) => {
      try {
        // Save to database
        await saveCakeOrder({
          design,
          customerAnswers: answers,
          timestamp: new Date(),
        });

        // Show success message
        showNotification("Order saved successfully!", "success");
      } catch (error) {
        console.error("Failed to save order:", error);
        showNotification("Error saving order", "error");
      }
    },
    onClose: () => {
      // Cleanup
      console.log("Cake Order panel closed");
    },
  },
});
```

### Keyboard Shortcuts

Add custom shortcuts for launching modules:

```typescript
// In your keyboard handler
function handleKeyPress(event: KeyboardEvent) {
  // Alt+O = Open Cake Order
  if (event.altKey && event.key === "o") {
    openPanel("echo-canva-cake-order");
  }

  // Alt+E = Open Design Editor
  if (event.altKey && event.key === "e") {
    openPanel("echo-canva-design-editor");
  }
}

window.addEventListener("keydown", handleKeyPress);
```

---

## Module Features

### 🎂 Cake Order Module

**Workflow Steps**:

1. **Intake** - Customer preferences questionnaire
2. **Design Studio** - Interactive cake design interface
3. **Summary** - Order review and confirmation

**Features**:

- Multi-step wizard UI
- AI-powered design suggestions
- Real-time pricing
- Recipe management integration
- DALL-E image generation
- Export cake designs as images
- Order tracking

### 🎨 Design Editor Module

**Core Tools**:

- Layer management with blending modes
- Selection tools (rectangle, ellipse, lasso, magic wand)
- Drawing tools (brush, pencil, eraser)
- AI tools (generative fill, expand, replace)
- Text tool with font selection
- Shape tools (rectangle, circle, line)
- Color management and picker
- Filter gallery (30+ filters)
- Adjustment layers (levels, curves, hue/sat, etc.)

**Advanced Features**:

- Non-destructive editing with adjustment layers
- Advanced selection with refine edge
- Batch processing
- History/undo stack
- Real-time collaboration
- PSD file support
- Export to PNG, JPG, WebP, TIFF

---

## FAQ

### Q: Can I use both modules at the same time?

**A**: Yes! Both can be open as floating panels simultaneously. They're independent and won't interfere with each other.

### Q: Do I need to modify the module code?

**A**: No. The modules work as-is. The only changes needed are in `panel-registry.ts` in Echo Recipe Pro.

### Q: Can users open the modules from a keyboard shortcut?

**A**: Yes. Add a keyboard listener and call `openPanel("echo-canva-cake-order")`.

### Q: How do I close a module from inside the code?

**A**: Pass `onClose` prop:

```typescript
openPanel("echo-canva-cake-order", {
  props: {
    onClose: () => {
      closePanel("echo-canva-cake-order");
    },
  },
});
```

### Q: Can I customize the module appearance?

**A**: Yes, through the `themeConfig` option when launching. See "Advanced Configuration" above.

### Q: What if I break the panel registry?

**A**: TypeScript will show compilation errors. Just undo your changes to `panel-registry.ts` and rebuild.

### Q: How do I update the modules later?

**A**:

1. Replace the module folders with newer versions
2. The registry entries stay the same
3. Rebuild: `npm run build`

### Q: Can I use these modules in production?

**A**: Yes! They're production-ready. Test thoroughly in your environment first.

### Q: What browsers are supported?

**A**: Modern browsers:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Q: Can I fork and modify the modules?

**A**: Yes, but you'll need to update import paths and dependencies.

---

## Support & Updates

For issues, feature requests, or questions:

1. Check the module's `INTEGRATION_GUIDE.md`
2. Review this setup guide's troubleshooting section
3. Check browser console for detailed error messages
4. Contact EchoCanva team with:
   - Error message
   - Steps to reproduce
   - Echo Recipe Pro version
   - Browser/OS info

---

## Checklist: Before Launching

- [ ] Modules copied to `client/modules/`
- [ ] `panel-registry.ts` updated (3 sections)
- [ ] Project rebuilt (`npm run build`)
- [ ] No TypeScript errors
- [ ] Can call `openPanel()` function
- [ ] Sidebar buttons added (if desired)
- [ ] Theme configuration applied (if custom)

---

## Version History

**v1.0.0** (2025)

- Initial release
- Cake Order module
- Design Editor module
- Full panel integration support

---

## License & Attribution

These modules are part of the EchoCanva suite.

Ensure proper attribution and licensing when deploying.

---

**Last Updated**: January 2025  
**Support Email**: support@echocanva.ai  
**Documentation**: [Full Docs](https://docs.echocanva.ai)
