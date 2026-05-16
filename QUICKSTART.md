# 🚀 EchoCanva Modules - Quick Start (5 minutes)

## What You're Getting

- **Cake Order & Builder**: Design cakes with 3D preview + order forms
- **Design Editor**: Professional image editing with 50+ tools
- **Recipe Bridge**: Automatic recipe data syncing
- **Pop-out**: Open as separate floating panels

---

## Installation (Copy-Paste Ready)

### 1️⃣ Extract
```bash
unzip echocanva-modules.zip
```

### 2️⃣ Copy Files
```bash
cp -r echo-canva-* your-project/client/modules/
cp recipe-data-bridge.ts your-project/client/lib/
```

### 3️⃣ Update `client/lib/panel-registry.ts`

**Add 2 lines to PanelKey type:**
```typescript
| "echo-canva-cake-order"
| "echo-canva-design-editor";
```

**Add 2 lines to PANEL_REGISTRY:**
```typescript
"echo-canva-cake-order": () => import("@/modules/echo-canva-cake-order"),
"echo-canva-design-editor": () => import("@/modules/echo-canva-design-editor"),
```

**Add 2 blocks to PANEL_METADATA:**
```typescript
"echo-canva-cake-order": {
  key: "echo-canva-cake-order",
  label: "Cake Order & Builder",
  description: "AI-powered cake design and order workflow",
  icon: "🎂",
  defaultWidth: 1200,
  defaultHeight: 800,
},
"echo-canva-design-editor": {
  key: "echo-canva-design-editor",
  label: "Design Editor",
  description: "Professional image editing with AI tools",
  icon: "🎨",
  defaultWidth: 1400,
  defaultHeight: 900,
},
```

### 4️⃣ Build & Run
```bash
npm install && npm run build && npm run dev
```

---

## ✅ Done!

Open your app → Look for modules in sidebar → Click to launch

---

## Common Issues

| Problem | Solution |
|---------|----------|
| **Modules not in sidebar** | Add them to Sidebar.tsx NAV_ITEMS |
| **Import error** | Verify panel-registry.ts entries |
| **Blank screen** | Check browser console for errors |
| **Slow first load** | Normal (3-5s) - lazy loading |

---

## Features

✨ **Cake Order**
- 3D cake preview
- AI suggestions
- Order forms
- Allergen mgmt
- Recipe sync

✨ **Design Editor**
- 50+ tools
- AI features
- Filters & effects
- Export options
- Full undo/redo

---

## Pop-Out (Bonus!)

Hover over module in sidebar → Click ⬆️ → Opens as separate panel

---

## More Info

- **Full setup**: See `INSTALL.md`
- **Advanced**: See `ECHOCANVA_MODULES_EXPORT_GUIDE.md`
- **Troubleshooting**: Check browser console

**That's it!** 🎉
