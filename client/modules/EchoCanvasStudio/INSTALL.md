# EchoCanva Modules - Installation Instructions

**For Echo Recipe Pro Integration**

---

## 📥 Installation (10 minutes)

### Step 1: Extract Package

```bash
unzip echocanva-modules.zip
cd echocanva-modules
```

### Step 2: Copy Module Folders

Copy both modules to your Echo Recipe Pro project:

```bash
cp -r echo-canva-cake-order/ ../echo-recipe-pro/client/modules/
cp -r echo-canva-design-editor/ ../echo-recipe-pro/client/modules/
```

**Verify folders are in place:**

```bash
ls ../echo-recipe-pro/client/modules/echo-canva-*
```

You should see both folders listed.

### Step 3: Update Panel Registry

Open this file in your editor:

```
echo-recipe-pro/client/lib/panel-registry.ts
```

#### Add Import (1/3)

Find the line that starts with `export type PanelKey`:

```typescript
export type PanelKey = "dashboard" | "recipes";
```

Add these two lines:

```typescript
export type PanelKey =
  | "dashboard"
  | "recipes"
  | "echo-canva-cake-order"
  | "echo-canva-design-editor";
```

#### Add Registry (2/3)

Find the `PANEL_REGISTRY` object:

```typescript
export const PANEL_REGISTRY: PanelRegistry = {
  dashboard: () => import("@/modules/Dashboard"),
  recipes: () => import("@/modules/Recipes"),
};
```

Add these inside (before the closing `}`):

```typescript
export const PANEL_REGISTRY: PanelRegistry = {
  dashboard: () => import("@/modules/Dashboard"),
  recipes: () => import("@/modules/Recipes"),
  "echo-canva-cake-order": () => import("@/modules/echo-canva-cake-order"),
  "echo-canva-design-editor": () =>
    import("@/modules/echo-canva-design-editor"),
};
```

#### Add Metadata (3/3)

Find the `PANEL_METADATA` object:

```typescript
export const PANEL_METADATA: Record<PanelKey, PanelMetadata> = {
  dashboard: {
    /* ... */
  },
  recipes: {
    /* ... */
  },
};
```

Add these two objects inside (before the closing `}`):

```typescript
"echo-canva-cake-order": {
  key: "echo-canva-cake-order",
  label: "Cake Order",
  description: "AI-powered cake order workflow",
  icon: "🎂",
  defaultWidth: 1000,
  defaultHeight: 800,
  canFloat: true,
  canDock: true,
  resizable: true,
},
"echo-canva-design-editor": {
  key: "echo-canva-design-editor",
  label: "Design Editor",
  description: "Professional image editor with AI tools",
  icon: "🎨",
  defaultWidth: 1400,
  defaultHeight: 900,
  canFloat: true,
  canDock: true,
  resizable: true,
  maximizable: true,
},
```

### Step 4: Build & Test

```bash
cd echo-recipe-pro
npm run build
```

**No errors?** ✅ Installation is complete!

### Step 5: Launch Modules

In any React component, add buttons to test:

```tsx
import { openPanel } from "@/lib/panel-manager";

export function TestButtons() {
  return (
    <div>
      <button onClick={() => openPanel("echo-canva-cake-order")}>
        🎂 Open Cake Order
      </button>
      <button onClick={() => openPanel("echo-canva-design-editor")}>
        🎨 Open Design Editor
      </button>
    </div>
  );
}
```

Click the buttons → Modules should open as floating panels!

---

## 🎯 Quick Checklist

- [ ] Extracted `echocanva-modules.zip`
- [ ] Copied both module folders to `client/modules/`
- [ ] Updated `panel-registry.ts` (all 3 sections)
- [ ] Ran `npm run build` with no errors
- [ ] Successfully opened modules with test buttons

---

## ❌ Troubleshooting

### Error: "Cannot find module"

```
Solution: Check panel-registry.ts paths are correct:
- "echo-canva-cake-order" (not "cake-order")
- "echo-canva-design-editor" (not "design-editor")
```

### Error: "Module is undefined"

```
Solution: Rebuild the project:
npm run build
```

### Styling looks wrong

```
Solution: Ensure dark mode is enabled in your HTML:
<html class="dark">
```

### Can't find openPanel function

```
Solution: Check that this exists in your project:
import { openPanel } from "@/lib/panel-manager";

If the path is different, adjust the import accordingly.
```

---

## 📁 File Structure After Installation

```
echo-recipe-pro/
├── client/
│   ├── lib/
│   │   └── panel-registry.ts          (MODIFIED)
│   └── modules/
│       ├── echo-canva-cake-order/     (NEW)
│       │   ├── index.tsx
│       │   └── luccca-module.json
│       └── echo-canva-design-editor/  (NEW)
│           ├── index.tsx
│           └── luccca-module.json
└── [... other files ...]
```

---

## 🎂 Cake Order Module

**What it does:**

- Step 1: Intake questionnaire (gather customer preferences)
- Step 2: Design studio (interactive cake design)
- Step 3: Summary & confirmation

**Launch:**

```typescript
openPanel("echo-canva-cake-order");
```

---

## 🎨 Design Editor Module

**What it does:**

- Professional image editing (50+ tools)
- Layer management
- AI-powered tools (generative fill, expand, remove)
- 30+ filters and effects
- Export to multiple formats

**Launch:**

```typescript
openPanel("echo-canva-design-editor");
```

---

## 🚀 Next Steps

1. **Add Sidebar Buttons** (optional)
   - Add test buttons to your navigation
   - Users can click to launch modules

2. **Customize Appearance** (optional)
   - Use theme configuration
   - See `QUICKSTART.md` for examples

3. **Add Event Handlers** (optional)
   - Handle order completion
   - Sync with your database
   - See `ECHOCANVA_MODULES_SETUP_GUIDE.md` for examples

4. **Production Deployment**
   - Test thoroughly before deploying
   - Consider performance on large images
   - Monitor browser console for errors

---

## 📞 Support

**Installation issues?**

1. Check this file first (troubleshooting section)
2. Verify all three `panel-registry.ts` changes
3. Look for TypeScript errors: `npm run build`

**Feature questions?**

- See `QUICKSTART.md`
- See `ECHOCANVA_MODULES_SETUP_GUIDE.md`
- See individual module `INTEGRATION_GUIDE.md` files

---

## 📦 What's Included

- ✅ `echo-canva-cake-order/` - Ready to use
- ✅ `echo-canva-design-editor/` - Ready to use
- ✅ `QUICKSTART.md` - 5-minute setup
- ✅ `ECHOCANVA_MODULES_SETUP_GUIDE.md` - Full documentation
- ✅ Individual `INTEGRATION_GUIDE.md` files
- ✅ `README_MODULES.md` - Feature overview

---

## ✨ You're Done!

Both modules are now installed and ready to use.

🎉 **Next:** Open modules with `openPanel()` and enjoy!

---

**Installation Time:** ~10 minutes  
**Rebuild Time:** ~2-5 minutes  
**Total:** ~15 minutes
