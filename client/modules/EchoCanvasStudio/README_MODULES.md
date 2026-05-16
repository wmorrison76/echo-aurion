# EchoCanva Modules for Echo Recipe Pro

**Plug-and-play modules to extend Echo Recipe Pro with AI-powered cake design and professional image editing.**

---

## 📦 What's Included

This package contains two production-ready modules:

### 🎂 Cake Order Module

- Multi-step order workflow (intake → design → summary)
- AI-powered design suggestions using DALL-E
- Real-time pricing calculations
- Recipe management integration
- Image export and sharing

**Launch**: `openPanel("echo-canva-cake-order")`

### 🎨 Design Editor Module

- Professional image editing with 50+ tools
- Layer management with non-destructive editing
- AI-powered tools (generative fill, expand, remove)
- 30+ filters and adjustment effects
- Text, shapes, and drawing tools
- Real-time collaboration support
- Export to PNG, JPG, PSD, WebP, TIFF

**Launch**: `openPanel("echo-canva-design-editor")`

---

## 🚀 Quick Start (5 minutes)

### 1. Extract Files

```bash
unzip echocanva-modules.zip -d your-echo-recipe-pro-project/client/modules/
```

### 2. Update Panel Registry

Open `client/lib/panel-registry.ts` and add three sections (see `ECHOCANVA_MODULES_SETUP_GUIDE.md`)

### 3. Build & Launch

```bash
npm run build
```

That's it! Modules are now available via `openPanel()`.

---

## 📚 Documentation

Start with one of these based on your need:

| Document                                          | Purpose                           | Read Time |
| ------------------------------------------------- | --------------------------------- | --------- |
| **QUICKSTART.md**                                 | 5-minute setup                    | 5 min     |
| **ECHOCANVA_MODULES_SETUP_GUIDE.md**              | Complete setup with code snippets | 20 min    |
| **echo-canva-cake-order/INTEGRATION_GUIDE.md**    | Cake Order specific details       | 15 min    |
| **echo-canva-design-editor/INTEGRATION_GUIDE.md** | Design Editor specific details    | 15 min    |
| **MODULES_EXPORT_CHECKLIST.md**                   | Export & distribution info        | 10 min    |

---

## 📋 File Structure

```
echocanva-modules/
├── echo-canva-cake-order/           # 🎂 Cake Order Module
│   ├── index.tsx                    # Main component
│   ├── luccca-module.json          # Module manifest
│   └── INTEGRATION_GUIDE.md         # Setup & features
│
├── echo-canva-design-editor/        # 🎨 Design Editor Module
│   ├── index.tsx                    # Main component
│   ├── luccca-module.json          # Module manifest
│   └── INTEGRATION_GUIDE.md         # Setup & features
│
├── ECHOCANVA_MODULES_SETUP_GUIDE.md # ⭐ Main setup guide
├── QUICKSTART.md                    # Fast 5-min setup
├── MODULES_EXPORT_CHECKLIST.md      # Export checklist
├── README_MODULES.md               # This file
└── VERSION                          # Version info
```

---

## 🔧 System Requirements

**Minimum:**

- Node.js 16+
- React 18.3+
- Echo Recipe Pro with panel system enabled

**For Design Editor specifically:**

- WebGL support (GPU acceleration)
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- 4GB RAM recommended for large images

---

## ✨ Features

### Cake Order Module ✅

- [x] Multi-step workflow UI
- [x] Intake questionnaire
- [x] Interactive design studio
- [x] AI-powered suggestions
- [x] Real-time pricing
- [x] Recipe integration
- [x] DALL-E image generation
- [x] Design export

### Design Editor Module ✅

- [x] Layer management
- [x] 50+ editing tools
- [x] AI tools (generative fill, expand, remove)
- [x] Selection tools (rect, ellipse, lasso, magic wand)
- [x] Drawing tools (brush, pencil, eraser)
- [x] Text tool with fonts
- [x] Shape tools
- [x] Filters (30+)
- [x] Adjustments (levels, curves, hue/sat, etc.)
- [x] Collaboration
- [x] Multiple export formats

---

## 🎯 Installation Checklist

Use this checklist when installing:

- [ ] Extract both module folders to `client/modules/`
- [ ] Update `panel-registry.ts` (3 sections: type, registry, metadata)
- [ ] Add navigation buttons (optional)
- [ ] Run `npm run build`
- [ ] Verify no TypeScript errors
- [ ] Test: `openPanel("echo-canva-cake-order")`
- [ ] Test: `openPanel("echo-canva-design-editor")`

See `ECHOCANVA_MODULES_SETUP_GUIDE.md` for detailed instructions with code snippets.

---

## 🚨 Troubleshooting

**Can't find modules?**

- Verify path: `client/modules/echo-canva-*`
- Check `panel-registry.ts` has correct imports
- Rebuild: `npm run build`

**Styling looks wrong?**

- Ensure dark mode is enabled: `<html class="dark">`
- Check Tailwind CSS is configured
- Verify CSS variables in `globals.css`

**Module crashes?**

- Check browser console (F12) for errors
- Verify all dependencies are installed
- Check `panel-registry.ts` syntax is correct
- Try rebuilding: `npm run build`

For more troubleshooting, see `ECHOCANVA_MODULES_SETUP_GUIDE.md` → Troubleshooting section.

---

## 🎮 Usage Examples

### Launch Cake Order

```typescript
import { openPanel } from "@/lib/panel-manager";

openPanel("echo-canva-cake-order");
```

### Launch Design Editor with callback

```typescript
openPanel("echo-canva-design-editor", {
  props: {
    initialImage: "https://example.com/image.jpg",
    onSave: (imageData) => {
      console.log("Saved:", imageData);
    },
  },
});
```

### Add sidebar buttons

```tsx
<div>
  <button onClick={() => openPanel("echo-canva-cake-order")}>
    🎂 New Order
  </button>
  <button onClick={() => openPanel("echo-canva-design-editor")}>
    🎨 Design Editor
  </button>
</div>
```

---

## 🔑 Key Points

✅ **Zero Code Changes** - No modifications needed to existing code  
✅ **Drop-in Ready** - Copy files and update registry  
✅ **Fully Isolated** - Modules don't interfere with other panels  
✅ **Theme-Aware** - Automatically adapts to Echo Recipe Pro theme  
✅ **Production-Ready** - Tested and deployed in production  
✅ **Extensible** - Easy to customize or add features  
✅ **Well-Documented** - Complete guides and examples included

---

## 📦 Module Metadata

Each module includes a `luccca-module.json` manifest:

```json
{
  "name": "echo-canva-cake-order",
  "displayName": "EchoCanva Cake Order",
  "icon": "🎂",
  "version": "1.0.0",
  "defaultWidth": 1000,
  "defaultHeight": 800,
  "canFloat": true,
  "canDock": true,
  "resizable": true
}
```

This tells Echo Recipe Pro how to display and configure the module.

---

## 🤝 Support

### Getting Help

1. **Setup Issues** → Read `ECHOCANVA_MODULES_SETUP_GUIDE.md`
2. **Module Features** → Check individual `INTEGRATION_GUIDE.md`
3. **Common Problems** → See "Troubleshooting" below
4. **Detailed Export Info** → See `MODULES_EXPORT_CHECKLIST.md`

### Error Messages

| Error                       | Solution                                |
| --------------------------- | --------------------------------------- |
| "Module not found"          | Check `panel-registry.ts` imports       |
| "Cannot find panel-manager" | Verify `openPanel` function exists      |
| "Styling broken"            | Enable dark mode, check Tailwind config |
| "WebGL error"               | Update GPU drivers, use modern browser  |

---

## 📋 Compatibility

**Supported:**

- ✅ Windows, macOS, Linux
- ✅ Chrome, Firefox, Safari, Edge
- ✅ Node.js 16+
- ✅ React 18.3+
- ✅ TypeScript projects

**NOT Supported:**

- ❌ Internet Explorer
- ❌ React < 18.0
- ❌ Node.js < 16

---

## 📄 License

See individual module directories for license information.

---

## 🔄 Updates & Versioning

**Current Version**: 1.0.0

When updating:

1. Download new package
2. Replace module folders
3. Registry entries stay the same
4. Rebuild: `npm run build`

---

## ⚙️ Advanced Configuration

### Custom Theme

```typescript
openPanel("echo-canva-cake-order", {
  themeConfig: {
    accentColor: "#00f0ff",
    backgroundColor: "#0a0a0a",
    textColor: "#ffffff",
  },
});
```

### With Event Handlers

```typescript
openPanel("echo-canva-cake-order", {
  props: {
    onOrderComplete: (design, answers) => {
      // Save order
    },
    onClose: () => {
      // Cleanup
    },
  },
});
```

See `ECHOCANVA_MODULES_SETUP_GUIDE.md` → Advanced Configuration for more examples.

---

## 🎓 Learning Path

**New to modules?**

1. Read this README
2. Follow QUICKSTART.md
3. Try launching a module
4. Read INTEGRATION_GUIDE.md for deep dive

**Experienced developer?**

1. Copy folders to `client/modules/`
2. Update `panel-registry.ts` (see setup guide)
3. Rebuild
4. Done!

---

## 📞 Getting Support

For questions or issues:

1. Check the documentation included (start with setup guide)
2. Review the troubleshooting section
3. Check browser console for errors (F12)
4. Contact EchoCanva team if needed

---

## 🎉 Next Steps

1. **Extract the package** from `echocanva-modules.zip`
2. **Read QUICKSTART.md** for 5-minute setup
3. **Follow ECHOCANVA_MODULES_SETUP_GUIDE.md** for complete setup
4. **Test the modules** in your Echo Recipe Pro instance
5. **Add sidebar buttons** (optional, but recommended)

---

**Ready to get started?** → See `QUICKSTART.md`

**Need help?** → See `ECHOCANVA_MODULES_SETUP_GUIDE.md`

**Installing now?** → See `MODULES_EXPORT_CHECKLIST.md`

---

**Version**: 1.0.0  
**Released**: January 2025  
**Support**: See included documentation
