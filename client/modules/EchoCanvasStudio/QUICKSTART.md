# ⚡ EchoCanva Modules - 5-Minute Quick Start

**Get the modules running in 5 minutes. For detailed setup, see `ECHOCANVA_MODULES_SETUP_GUIDE.md`**

---

## 🎯 Your Goal

Add these to Echo Recipe Pro:

- 🎂 **Cake Order** - Order workflow with design studio
- 🎨 **Design Editor** - Professional image editor

Both launch as floating panels from your app.

---

## ⏱️ 5-Minute Steps

### Step 1: Copy Folders (1 minute)

Copy these folders to your Echo Recipe Pro project:

```bash
# From the extracted echocanva-modules package:
cp -r echo-canva-cake-order/ /path/to/echo-recipe-pro/client/modules/
cp -r echo-canva-design-editor/ /path/to/echo-recipe-pro/client/modules/
```

**Result**: You should now have:

```
echo-recipe-pro/client/modules/
├── echo-canva-cake-order/
└── echo-canva-design-editor/
```

### Step 2: Update Registry (3 minutes)

Open: `echo-recipe-pro/client/lib/panel-registry.ts`

**Find this line:**

```typescript
export type PanelKey = "dashboard" | "recipes";
```

**Add these lines:**

```typescript
export type PanelKey =
  | "dashboard"
  | "recipes"
  | "echo-canva-cake-order" // ADD THIS
  | "echo-canva-design-editor"; // ADD THIS
```

---

**Find this block:**

```typescript
export const PANEL_REGISTRY: PanelRegistry = {
  dashboard: () => import("@/modules/Dashboard"),
  recipes: () => import("@/modules/Recipes"),
};
```

**Add inside the object:**

```typescript
export const PANEL_REGISTRY: PanelRegistry = {
  dashboard: () => import("@/modules/Dashboard"),
  recipes: () => import("@/modules/Recipes"),
  "echo-canva-cake-order": () => import("@/modules/echo-canva-cake-order"), // ADD THIS
  "echo-canva-design-editor": () =>
    import("@/modules/echo-canva-design-editor"), // ADD THIS
};
```

---

**Find this block:**

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

**Add inside the object:**

```typescript
export const PANEL_METADATA: Record<PanelKey, PanelMetadata> = {
  dashboard: {
    /* ... */
  },
  recipes: {
    /* ... */
  },

  // ADD THIS:
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

  // ADD THIS:
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
};
```

### Step 3: Rebuild (1 minute)

```bash
cd echo-recipe-pro
npm run build
```

✅ **No errors? You're done!**

---

## 🧪 Test It

In any React component:

```typescript
import { openPanel } from "@/lib/panel-manager";

// Launch Cake Order
function TestButton1() {
  return (
    <button onClick={() => openPanel("echo-canva-cake-order")}>
      🎂 Test Cake Order
    </button>
  );
}

// Launch Design Editor
function TestButton2() {
  return (
    <button onClick={() => openPanel("echo-canva-design-editor")}>
      🎨 Test Design Editor
    </button>
  );
}
```

Click the buttons → Panels should open! 🎉

---

## ❌ If Something Goes Wrong

### "Module not found" error

1. Verify folders are in `client/modules/`:
   ```bash
   ls client/modules/echo-canva-*
   ```
2. Rebuild: `npm run build`

### "Cannot find panel-manager"

1. Check that `openPanel` function exists in your project
2. May need different import path depending on your setup
3. Ask your team for the correct import

### TypeScript errors in panel-registry.ts

1. Check for typos in the registry entries
2. Ensure JSON object syntax is correct (no missing commas)
3. Close and reopen your editor

### Styling looks broken

1. Ensure dark mode: `<html class="dark">`
2. Check Tailwind CSS is configured
3. Rebuild: `npm run build`

---

## 📚 Next Steps

**This quick start is done!** For more:

- 📖 **Full setup guide**: `ECHOCANVA_MODULES_SETUP_GUIDE.md`
- 🎂 **Cake Order details**: `echo-canva-cake-order/INTEGRATION_GUIDE.md`
- 🎨 **Design Editor details**: `echo-canva-design-editor/INTEGRATION_GUIDE.md`
- 📋 **Troubleshooting**: See main setup guide

---

## 💡 Pro Tips

### Add Sidebar Buttons

```tsx
<div>
  <button onClick={() => openPanel("echo-canva-cake-order")}>
    🎂 Cake Order
  </button>
  <button onClick={() => openPanel("echo-canva-design-editor")}>
    🎨 Design Editor
  </button>
</div>
```

### Handle Events

```typescript
openPanel("echo-canva-cake-order", {
  props: {
    onOrderComplete: (design, answers) => {
      console.log("Order complete!", design);
      // Save to database
    },
    onClose: () => {
      console.log("Panel closed");
    },
  },
});
```

### Custom Theme

```typescript
openPanel("echo-canva-cake-order", {
  themeConfig: {
    accentColor: "#00f0ff",
    backgroundColor: "#0a0a0a",
  },
});
```

---

## ✅ Checklist

- [ ] Copied both module folders to `client/modules/`
- [ ] Updated `panel-registry.ts` (added to type, registry, and metadata)
- [ ] Ran `npm run build` with no errors
- [ ] Tested opening modules with sidebar buttons or test components
- [ ] Both modules appear as floating panels

---

## 🎉 Success!

You now have:

- ✅ Cake Order module running
- ✅ Design Editor module running
- ✅ Both available as panels
- ✅ Ready for production use

---

## 📞 Help!

Got stuck? Check these in order:

1. **Did you copy the folders?** → Verify path: `client/modules/echo-canva-*`
2. **Did you update panel-registry.ts?** → Check all 3 sections (type, registry, metadata)
3. **Did you rebuild?** → Run: `npm run build`
4. **Still stuck?** → See `ECHOCANVA_MODULES_SETUP_GUIDE.md` → Troubleshooting

---

**Total Time**: ~5 minutes  
**Next Step**: Add sidebar buttons (see Pro Tips above)  
**Full Guide**: `ECHOCANVA_MODULES_SETUP_GUIDE.md`

🚀 **Ready!**
