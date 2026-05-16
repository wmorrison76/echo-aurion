# MenuStudio Help Guide 🎨

## Overview

MenuStudio is a professional menu design tool for creating stunning restaurant menus with powerful typography, color management, and export capabilities. This guide covers all features and workflows.

---

## Getting Started

### 1. Opening MenuStudio
1. Click on **"MENU DESIGN STUDIO"** in the left sidebar
2. You'll see the canvas in the center with layers on the left and properties on the right

### 2. The Interface

```
┌─────────────────────────────────────────┐
│         Top Toolbar (File, Edit, View)  │
├──────────┬───────────────┬──────────────┤
│  Layers  │   CANVAS      │  Inspector   │
│ (w-56)   │ (flexible)    │   (w-80)     │
│          │               │              │
└──────────┴───────────────┴──────────────┘
```

- **Left Panel (Layers)**: Shows all elements on your canvas in a hierarchical list
- **Center (Canvas)**: Your design workspace where you drag and edit elements
- **Right Panel (Inspector)**: Element properties, colors, typography, and templates

---

## Working with Elements

### Adding Elements

1. Click the **"+"** button in the toolbar or use the **Insert** menu
2. Choose an element type:
   - **Text**: Headlines, subheadings, body text
   - **Heading**: Large title text
   - **Shape**: Rectangles, dividers, decorative elements
   - **Image**: Photos and graphics
   - **Menu Item**: Name + description + price bundle

### Selecting Elements

- **Single Click**: Click any element to select it (shows blue outline and resize handles)
- **Layers Panel**: Click element name to select from the list
- **Deselect**: Click empty canvas area

**Note:** Selection persists - you can move or edit without reselecting!

### Moving Elements

1. Select the element (click once)
2. Click and drag to move it anywhere on canvas
3. Use **X/Y** coordinates in Inspector for precise positioning

### Resizing Elements

1. Select the element
2. Drag the resize handles (small squares at corners and edges)
3. Or use **Width/Height** inputs in Inspector for exact dimensions

### Rotating Elements

**Method 1: Using Slider (Recommended)**
1. Select the element
2. In Inspector → **Position & Size** → **Rotation**
3. Drag the slider (0°-360°) or click the number display
4. Real-time preview shows rotation angle

**Method 2: Using Number Input**
1. Select the element
2. In Inspector → **Rotation** field
3. Type a value (0-360) and press Enter
4. Values wrap automatically (e.g., 370° = 10°)

---

## Layers Panel Features

### Understanding Layers

The layers panel shows all elements in reverse order (top layer first). 

**Icons indicate element type:**
- `H` = Heading
- `T` = Text
- `■` = Shape
- `—` = Divider
- `🖼️` = Image
- `🍽️` = Menu Item

### Layer Actions

**Click on a layer name** to:
- Select that element
- See it highlighted on canvas
- Edit properties in Inspector

**Double-click layer name** to rename it (useful for organization)

**Hover over layer** to reveal action buttons:

| Button | Action |
|--------|--------|
| 👁️ | Toggle visibility (show/hide) |
| 🔒 | Lock/unlock element (prevents accidental moves) |
| 🗑️ | Delete the element |

### Managing Visibility

- Click the **eye icon** to hide an element from the canvas
- Hidden elements still exist but won't print/export
- Locked elements can't be moved or resized (but can be edited)

---

## Inspector Panel

### Properties Tab

#### Position & Size Section
- **X, Y**: Horizontal and vertical position on canvas
- **Width, Height**: Dimensions in pixels
- **Rotation**: Angle from 0-360°, with live slider
- **Opacity**: 0-100% transparency

#### Appearance Section
Varies by element type:

**For Text:**
- **Color**: Text color (click swatch or enter hex code)

**For Shapes:**
- **Fill**: Background color
- **Outline Color**: Border color
- **Outline Thickness**: Border width (0-10px with slider)
- **Border Radius**: Corner rounding

#### Typography Section (Text Elements Only)
- **Font Size**: Font size in pixels
- **Font Weight**: 100-900 (light to black)
- **Line Height**: Spacing between lines (1.0-3.0)

---

## Working with Text

### Editing Text

1. Select a text element
2. **Double-click** it on canvas OR click **Edit** button
3. Cursor appears in text - type to edit
4. Click elsewhere to finish editing

### Text Properties

In Inspector → **Typography** section:

- **Font Size**: Adjust with slider or number input
- **Font Weight**: Light (300) → Bold (700) → Black (900)
- **Line Height**: Control vertical spacing
- **Color**: Text color selector

### Text Alignment

In Inspector, use alignment buttons:
- **Left** (`←`)
- **Center** (`↔`)
- **Right** (`→`)

---

## Working with Shapes

### Shape Types

When adding a shape, choose from:
- **Rectangle**: Solid box
- **Circle**: Round shape
- **Line**: Horizontal or diagonal
- **Divider**: Decorative separator

### Shape Properties

In Inspector → **Appearance**:

1. **Fill Color**: Interior background
2. **Outline Color**: Border/stroke color
3. **Outline Thickness**: Border width slider (0-10px)
   - 0px = No border
   - 0.5px = Subtle outline
   - 2px+ = Bold border
4. **Border Radius**: Round corners (0 = sharp, higher = rounder)

### Shape Rotation

Shapes support full 360° rotation with the rotation slider:
1. Select shape
2. Inspector → **Rotation** slider
3. Drag to rotate or type angle

---

## Colors Tab

### Color Palette Manager

Create and manage color palettes for consistency:

1. Go to **Colors** tab in Inspector
2. Create a new palette with **+ Add Palette**
3. Add colors to palette (add swatches)
4. Name each color (e.g., "Brand Red", "Accent Gold")

### Quick Color Selection

- Click any color swatch in palette
- Click a shape/text element
- Color applies instantly

### Color Reference Grid

Bottom of Colors tab shows a quick reference of all palette colors - click any to apply.

---

## Typography Tab

### Font Families

MenuStudio includes 100+ professional fonts including:
- **Serif**: Elegant, traditional (Georgia, Garamond)
- **Sans-Serif**: Clean, modern (Inter, Helvetica)
- **Display**: Bold, decorative (Poppins, Playfair)
- **Monospace**: Code-style (Courier, IBM Plex Mono)

### Font Presets

Browse typography presets organized by style:
- Headings
- Body text
- Captions
- Menu items

**Apply a preset:**
1. Click a preset card
2. It applies to selected text element
3. Modify further in Inspector

### Font Pairing Recommendations

AI-powered font pairing suggestions:
1. Select a text element
2. Go to **Typography** tab
3. View recommended pairings
4. One-click apply

---

## Templates Tab

### Using Templates

Pre-designed templates for common menu layouts:

1. Go to **Templates** tab
2. Browse by category (Fine Dining, Casual, Desserts, etc.)
3. Click a template to preview
4. Click **Apply** to load onto canvas

**Note:** Templates replace current design - save first if you want to keep current work!

### Template Categories

- **Fine Dining**: Elegant, classic layouts
- **Casual**: Friendly, approachable designs
- **Bistro**: European café style
- **Bakery**: Pastries and desserts
- **Beverages**: Drinks-focused layouts
- **Seasonal**: Holiday/seasonal themes

---

## Design Tools

### Alignment Helpers

When positioning multiple elements:

1. Hold `Shift` while clicking to select multiple elements
2. **Align Tools** appear:
   - Align Left, Center, Right (horizontal)
   - Align Top, Middle, Bottom (vertical)
   - Distribute Spacing

### Guides & Rulers

**Show/Hide Rulers:**
1. Go to **View** menu
2. Toggle **Show Rulers** (top and left edges)

**Show/Hide Guidelines:**
1. View menu → **Show Guidelines**
2. Drag guidelines from ruler to canvas
3. Elements snap to guidelines when moved

**Grid & Margins:**
1. View menu → **Show Grid** (background pattern)
2. Adjust grid size in View settings
3. Show margins with checkbox

### Snap to Grid

When **Show Grid** is enabled:
- Elements automatically snap to grid
- Ensures alignment
- Prevents accidental misplacement

---

## Colors & Visual Effects

### Element Outlines

All elements have a **0.5px outline** by default:
- Subtle visual definition
- Shows element boundaries clearly
- Professional appearance

### Drop Shadows

All elements include a **soft drop shadow**:
- 2px blur
- Subtle elevation effect
- Professional depth

Shadows are added automatically - no configuration needed!

---

## Saving & Exporting

### Saving Work

**Auto-Save:**
- Design saves every 30 seconds automatically
- No manual action needed

**Manual Save:**
1. Press `Cmd+S` (Mac) or `Ctrl+S` (Windows)
2. Or click **File** → **Save**

### Exporting Menus

**Export Formats:**
1. **PDF**: Print-ready, shows on most devices
2. **PNG**: Raster image for digital use (email, web)
3. **SVG**: Vector format, editable in other design tools
4. **PSD**: Adobe Photoshop format with layers
5. **AI**: Adobe Illustrator format

**How to Export:**
1. Click **Export** button in toolbar (download icon)
2. Choose format
3. Configure options (see below)
4. Click **Export**

### Export Options

**PDF/Print Options:**
- **Resolution**: 300 DPI (default, for print) or 72 DPI (screen)
- **Color Space**: 
  - CMYK for professional printing
  - RGB for digital
- **Include Bleeds**: Add 0.125" bleed area for print
- **Include Marks**: Add registration marks and color bars

**Digital Export (PNG):**
- **DPI**: 150 (default, high quality)
- **Color Space**: RGB
- **Compression**: Automatic

**Professional Printer Export:**
1. Click **Export**
2. Select **Export for Printer**
3. Enter printer company name (optional)
4. All marks and bleeds automatically included
5. CMYK color space, 300 DPI

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+S` / `Ctrl+S` | Save |
| `Cmd+Z` / `Ctrl+Z` | Undo |
| `Cmd+Shift+Z` / `Ctrl+Shift+Z` | Redo |
| `Cmd+D` / `Ctrl+D` | Duplicate |
| `Delete` | Delete selected element |
| `Double-click` | Edit text / Enter edit mode |
| `Escape` | Exit text editing |
| `Arrow Keys` | Move selected element (hold Shift for larger steps) |

---

## AI Assistance

### Ask Echo for Help

The **Echo AI button** (bottom-right, floating button) understands MenuStudio:

**Example questions:**
- "How do I rotate text?"
- "How do I change the outline color of a shape?"
- "What's the best font pairing for a fine dining menu?"
- "How do I export for a professional printer?"
- "How do I add margins and guides?"

The AI has full knowledge of MenuStudio and will provide context-aware answers!

### AI Suggestions Panel

Right side **AI³ tab** provides:
- **Color Palette Suggestions**: AI recommends palettes based on your design
- **Layout Suggestions**: Composition and alignment recommendations
- **Typography Analysis**: Font choices and readability
- **Content Enhancements**: AI-generated menu item descriptions

---

## Common Workflows

### Creating a Menu from Scratch

1. **Start**: Open MenuStudio
2. **Set up**: Adjust canvas size (Letter, A4, Custom)
3. **Add elements**: 
   - Title (large heading)
   - Categories (subheadings)
   - Menu items (name, description, price)
   - Decorative shapes
4. **Style**:
   - Choose fonts (use Pairing suggestions)
   - Apply colors
   - Adjust layouts
5. **Review**: Check on different devices
6. **Export**: PDF for print, PNG for digital

### Building from a Template

1. Go to **Templates** tab
2. Choose category and template
3. Click **Apply**
4. Customize text and colors
5. Adjust layout as needed
6. Export

### Fine-Tuning Typography

1. Select text element
2. Go to **Typography** tab
3. Browse presets for style inspiration
4. Or manually adjust in Inspector:
   - Font Size: Slider or number
   - Font Weight: Light/Normal/Bold
   - Line Height: for spacing
5. Use **AI³ tab** for pairing suggestions

### Exporting for Print

1. Click **Export** button
2. Select **Export for Printer**
3. Choose options:
   - Bleeds: ON (default)
   - Color Marks: ON (for professional alignment)
   - CMYK Color Space: ON (for print accuracy)
   - Resolution: 300 DPI
4. Enter printer company name (optional)
5. Click Export

---

## Troubleshooting

### Element Won't Move

**Solution:**
1. Check if element is **locked** (lock icon in Layers)
2. Click lock icon to unlock
3. Try moving again

### Text Seems Too Small/Large

**Solution:**
1. Select text element
2. Go to Inspector → **Typography**
3. Adjust **Font Size** slider
4. Or manually enter size in pixels

### Can't Select an Element

**Solution:**
1. Try selecting from **Layers panel** instead of canvas
2. Click element name in Layers
3. Check if element is hidden (eye icon off)
4. If hidden, click eye icon to show

### Export Won't Start

**Solution:**
1. Check internet connection
2. Ensure element is selected (for element export)
3. Wait a few seconds - export takes time
4. Try a different export format
5. Ask Echo AI for help

### Colors Look Wrong in Export

**Solution:**
1. Check **Color Space** setting:
   - Screen viewing? Use RGB
   - Printing? Use CMYK
2. Display colors may differ from print
3. Ask printer for color profile

---

## Best Practices

### Design Tips

1. **Start with hierarchy**: Headlines > Subheadings > Body text
2. **Use font pairing**: Heading font + Body font (use AI suggestions!)
3. **Limit colors**: 3-5 colors maximum for professional look
4. **Whitespace matters**: Don't overcrowd - negative space is good
5. **Test readability**: Zoom out to check from a distance

### Organization

1. **Rename layers**: Use descriptive names ("Header", "Title", "Price", etc.)
2. **Group elements**: Menu items together in Layers
3. **Lock backgrounds**: Prevent accidental moves
4. **Use templates**: Save time on common designs

### Exporting

1. **Always use correct DPI**: 
   - 300 DPI for print
   - 150 DPI for digital is fine
2. **Proof before export**: Review one more time
3. **Save design file**: Keep editable version
4. **Export multiple formats**: PDF for print, PNG for email
5. **Request color profile**: Ask printer for their profile for CMYK

---

## Need More Help?

### AI Assistant (Recommended)

Click the **Echo AI button** (bottom-right) and ask any question about:
- How to do something specific
- Design recommendations
- Troubleshooting issues
- Best practices

The AI has full MenuStudio knowledge!

### Quick Reference

- **Keyboard Shortcuts**: See table above
- **Menu Bar**: File, Edit, View, Insert, Format
- **Toolbar**: Quick access to tools and exports
- **Inspector Tabs**: Properties, Colors, Typography, Templates

---

## Keyboard Shortcut Cheat Sheet

```
GENERAL
Cmd+S / Ctrl+S ......... Save
Cmd+Z / Ctrl+Z ......... Undo
Cmd+Shift+Z ............ Redo (Ctrl+Y on Windows)

EDITING
Double-click ........... Edit text
Escape ................. Exit edit mode
Cmd+D / Ctrl+D ......... Duplicate element
Delete Key ............ Delete selected

NAVIGATION
Click empty area ....... Deselect all
Arrow Keys ............ Move element 1px
Shift + Arrow ......... Move element 10px
Shift + Click ......... Multi-select
```

---

**Happy Designing! 🎨✨**

For more help, ask Echo AI in the bottom-right corner!
