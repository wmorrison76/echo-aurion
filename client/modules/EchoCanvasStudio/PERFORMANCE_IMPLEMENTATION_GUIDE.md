# Performance Optimization Implementation Guide

## Overview
This guide provides step-by-step instructions to implement performance improvements identified in `STABILITY_AND_PERFORMANCE_AUDIT.md`.

**Timeline**: 
- Quick Wins: 2-3 weeks
- Phase 2: 3-4 weeks  
- Phase 3: 2-3 weeks

---

## Part 1: Sentry Integration (Day 1)

### Step 1: Install Sentry
```bash
npm install @sentry/react @sentry/tracing
```

### Step 2: Initialize in App.tsx
**File**: `client/App.tsx`

```typescript
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

// Initialize Sentry before rendering
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    environment: import.meta.env.MODE,
    integrations: [
      new BrowserTracing({
        tracingOrigins: ["localhost", /^\//],
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      {/* Your app content */}
    </Sentry.ErrorBoundary>
  );
}

export default Sentry.withProfiler(App);
```

### Step 3: Add Environment Variable
**File**: `.env.local` or DevServerControl

```
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

### Step 4: Test Error Capture
```typescript
// Add this to test:
<button onClick={() => {
  throw new Error("Test error for Sentry");
}}>
  Test Sentry
</button>
```

---

## Part 2: Lazy-Load Heavy Components (Days 2-4)

### Strategy
Component groups to lazy-load (in order of priority):

1. **Filter & Image Processing** (160KB):
   - UnifiedFilterDialog
   - CanvasBasedFilterPreview
   - GenerativeFillDialog
   - ImageEnhancementPanel

2. **AI Features** (120KB):
   - AIGeneratorPanel
   - AdvancedAIPanel
   - AI3SuggestionsPanel

3. **Tool Components** (90KB):
   - CanvasBasedTransformTool
   - CanvasBasedTextTool
   - CanvasBasedGradientTool

4. **Specialized Panels** (80KB):
   - FloatingAdvancedAIPanel
   - CakeDesignerPanel
   - VectorPanel

### Implementation Pattern

**Before**:
```typescript
// client/pages/Editor.tsx
import UnifiedFilterDialog from "../components/editor/UnifiedFilterDialog";
import AIGeneratorPanel from "../components/editor/AIGeneratorPanel";

// These are loaded in initial bundle (~400KB)
```

**After**:
```typescript
// client/pages/Editor.tsx
import { lazy, Suspense } from "react";

// Lazy-loaded components (~10KB initial, loaded on-demand)
const UnifiedFilterDialog = lazy(() => 
  import("../components/editor/UnifiedFilterDialog")
);
const AIGeneratorPanel = lazy(() => 
  import("../components/editor/AIGeneratorPanel")
);
const AdvancedAIPanel = lazy(() => 
  import("../components/editor/AdvancedAIPanel")
);
const AI3SuggestionsPanel = lazy(() => 
  import("../components/editor/AI3SuggestionsPanel")
);
const CanvasBasedTransformTool = lazy(() => 
  import("../components/editor/CanvasBasedTransformTool")
);
const CanvasBasedTextTool = lazy(() => 
  import("../components/editor/CanvasBasedTextTool")
);
const CanvasBasedGradientTool = lazy(() => 
  import("../components/editor/CanvasBasedGradientTool")
);
const GenerativeFillDialog = lazy(() => 
  import("../components/editor/GenerativeFillDialog")
);
const ImageEnhancementPanel = lazy(() => 
  import("../components/editor/ImageEnhancementPanel")
);
const FloatingAdvancedAIPanel = lazy(() => 
  import("../components/floating/FloatingAdvancedAIPanel")
);
const CakeDesignerPanel = lazy(() => 
  import("../components/floating/CakeDesignerPanel")
);
const VectorPanel = lazy(() => 
  import("../components/editor/VectorPanel")
);

// Create a shared loading component
function DialogLoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );
}

// In render, wrap each lazy component:
{isFilterDialogOpen && (
  <Suspense fallback={<DialogLoadingSpinner />}>
    <UnifiedFilterDialog {...filterProps} />
  </Suspense>
)}

{showAIGenerator && (
  <Suspense fallback={<DialogLoadingSpinner />}>
    <AIGeneratorPanel {...aiProps} />
  </Suspense>
)}

{showAdvancedAI && (
  <Suspense fallback={<DialogLoadingSpinner />}>
    <AdvancedAIPanel {...advancedAIProps} />
  </Suspense>
)}

{selectedTool === 'transform' && (
  <Suspense fallback={null}>
    <CanvasBasedTransformTool {...transformProps} />
  </Suspense>
)}

{selectedTool === 'text' && (
  <Suspense fallback={null}>
    <CanvasBasedTextTool {...textProps} />
  </Suspense>
)}

{selectedTool === 'gradient' && (
  <Suspense fallback={null}>
    <CanvasBasedGradientTool {...gradientProps} />
  </Suspense>
)}
```

### Measurement
After lazy-loading, check bundle size reduction:

```bash
# Install analyzer
npm install --save-dev webpack-bundle-analyzer

# Build and analyze
npm run build
npm install -D vite-plugin-visualizer
npx vite-plugin-visualizer
```

Expected reduction: **1MB → 600-700KB** (30-40% improvement)

---

## Part 3: Memoization & Callback Optimization (Days 5-7)

### Pattern 1: useCallback for Handlers

**Before**:
```typescript
// editor/MenuBar.tsx
function MenuBar({ onToolChange, onFileOpen }) {
  return (
    <button onClick={() => onToolChange('brush')}>Brush</button>
    <button onClick={() => onFileOpen()}>Open File</button>
  );
}
```

**After**:
```typescript
import { useCallback } from 'react';

function MenuBar({ onToolChange, onFileOpen }) {
  const handleBrushClick = useCallback(() => {
    onToolChange('brush');
  }, [onToolChange]);

  const handleFileClick = useCallback(() => {
    onFileOpen();
  }, [onFileOpen]);

  return (
    <button onClick={handleBrushClick}>Brush</button>
    <button onClick={handleFileClick}>Open File</button>
  );
}
```

### Pattern 2: useMemo for Derived Values

**Before**:
```typescript
// Editor.tsx
function Editor() {
  const [selectedTool, setSelectedTool] = useState('brush');
  
  // This gets recreated every render
  const toolOptions = TOOL_CATEGORIES.map(cat => ({
    ...cat,
    tools: cat.tools.filter(t => t.name !== 'hidden')
  }));

  return <ToolSelector options={toolOptions} />;
}
```

**After**:
```typescript
import { useMemo } from 'react';

function Editor() {
  const [selectedTool, setSelectedTool] = useState('brush');
  
  // Only recalculated when TOOL_CATEGORIES changes (rarely)
  const toolOptions = useMemo(() => 
    TOOL_CATEGORIES.map(cat => ({
      ...cat,
      tools: cat.tools.filter(t => t.name !== 'hidden')
    })),
    [] // Empty deps if TOOL_CATEGORIES is constant
  );

  return <ToolSelector options={toolOptions} />;
}
```

### Apply to Editor.tsx Key Handlers

Priority handlers to memoize in `Editor.tsx`:
```typescript
// Around line 3200 in Editor.tsx, add these memoizations:

const handleToolChange = useCallback((tool: ToolType) => {
  setSelectedTool(tool);
  setOpenDialog(null);
}, []);

const handleLayerPositionChange = useCallback(
  (layerId: string, x: number, y: number) => {
    const updatedLayers = layers.map(l =>
      l.id === layerId ? { ...l, x, y } : l
    );
    setLayers(updatedLayers);
    saveCanvasToHistory();
  },
  [layers]
);

const handleMoveLayer = useCallback(
  (layerId: string, direction: 'up' | 'down') => {
    const index = layers.findIndex(l => l.id === layerId);
    if (index === -1) return;
    
    const newLayers = [...layers];
    if (direction === 'up' && index < newLayers.length - 1) {
      [newLayers[index], newLayers[index + 1]] = 
      [newLayers[index + 1], newLayers[index]];
    } else if (direction === 'down' && index > 0) {
      [newLayers[index - 1], newLayers[index]] = 
      [newLayers[index], newLayers[index - 1]];
    }
    setLayers(newLayers);
  },
  [layers]
);

const handleDeleteLayer = useCallback((layerId: string) => {
  setLayers(layers.filter(l => l.id !== layerId));
  setSelectedLayer(null);
}, [layers]);

const handleLayerOpacityChange = useCallback(
  (layerId: string, opacity: number) => {
    setLayers(layers.map(l =>
      l.id === layerId ? { ...l, opacity } : l
    ));
  },
  [layers]
);

const handleBrushSizeChange = useCallback((size: number) => {
  setBrushSize(size);
}, []);

const handleBrushOpacityChange = useCallback((opacity: number) => {
  setBrushOpacity(opacity);
}, []);

const handleForegroundColorChange = useCallback((color: string) => {
  setForegroundColor(color);
}, []);

const handleZoom = useCallback((newZoom: number) => {
  setZoom(Math.max(0.1, Math.min(10, newZoom)));
}, []);

const handleUndo = useCallback(() => {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1);
  }
}, [historyIndex]);

const handleRedo = useCallback(() => {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(historyIndex + 1);
  }
}, [historyIndex, history.length]);

const handleMenuAction = useCallback((action: string) => {
  switch (action) {
    case 'save': handleSave(); break;
    case 'export': handleExport(); break;
    case 'undo': handleUndo(); break;
    case 'redo': handleRedo(); break;
    // ... other actions
  }
}, [handleSave, handleExport, handleUndo, handleRedo]);
```

Then pass these memoized handlers to child components:
```typescript
return (
  <div>
    <MenuBar 
      onMenuAction={handleMenuAction}
      selectedTool={selectedTool}
      onToolChange={handleToolChange}
    />
    <Canvas
      selectedTool={selectedTool}
      layers={layers}
      onLayerPositionChange={handleLayerPositionChange}
      onZoom={handleZoom}
      brushSize={brushSize}
      brushOpacity={brushOpacity}
      foregroundColor={foregroundColor}
    />
    <LayersPanel
      layers={layers}
      selectedLayer={selectedLayer}
      onLayerSelect={setSelectedLayer}
      onMoveLayer={handleMoveLayer}
      onDeleteLayer={handleDeleteLayer}
      onOpacityChange={handleLayerOpacityChange}
    />
    <BrushSizeControl
      size={brushSize}
      opacity={brushOpacity}
      onSizeChange={handleBrushSizeChange}
      onOpacityChange={handleBrushOpacityChange}
      color={foregroundColor}
      onColorChange={handleForegroundColorChange}
    />
  </div>
);
```

---

## Part 4: Extract Shared Utilities (Days 8-14)

### Create Utility Modules

**File**: `client/lib/canvas-utils.ts`
```typescript
/**
 * Canvas utility functions to reduce code duplication
 */

export function createTempCanvas(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  return ctx;
}

export function copyCanvasToTemp(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const tempCtx = createTempCanvas(canvas.width, canvas.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get source canvas context');
  tempCtx.drawImage(canvas, 0, 0);
  return tempCtx;
}

export function imageToCanvas(image: HTMLImageElement | ImageData): CanvasRenderingContext2D {
  if (image instanceof ImageData) {
    const ctx = createTempCanvas(image.width, image.height);
    ctx.putImageData(image, 0, 0);
    return ctx;
  } else {
    const ctx = createTempCanvas(image.width, image.height);
    ctx.drawImage(image, 0, 0);
    return ctx;
  }
}

export function canvasToImageData(ctx: CanvasRenderingContext2D): ImageData {
  return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

export function cropCanvasToContent(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let minX = canvas.width, minY = canvas.height;
  let maxX = 0, maxY = 0;
  let hasContent = false;
  
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) {
      hasContent = true;
      const index = i / 4;
      const x = index % canvas.width;
      const y = Math.floor(index / canvas.width);
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  
  if (!hasContent) return canvas;
  
  const newCanvas = document.createElement('canvas');
  newCanvas.width = maxX - minX + 1;
  newCanvas.height = maxY - minY + 1;
  const newCtx = newCanvas.getContext('2d');
  if (!newCtx) throw new Error('Failed to get new canvas context');
  
  newCtx.drawImage(canvas, -minX, -minY);
  return newCanvas;
}
```

**File**: `client/lib/color-utils.ts`
```typescript
/**
 * Color conversion utilities (used across many components)
 */

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? `0${hex}` : hex;
    })
    .join('')
    .toUpperCase()}`;
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return [h * 360, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

export function rgbaToString(r: number, g: number, b: number, a: number = 1): string {
  return `rgba(${r},${g},${b},${a})`;
}
```

**File**: `client/lib/pixel-utils.ts`
```typescript
/**
 * Pixel-level processing utilities
 */

export function iteratePixels(
  imageData: ImageData,
  callback: (
    r: number,
    g: number,
    b: number,
    a: number,
    index: number
  ) => [number, number, number, number]
): ImageData {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = callback(data[i], data[i + 1], data[i + 2], data[i + 3], i);
    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
    data[i + 3] = clamp(a);
  }
  return imageData;
}

export function clamp(value: number, min: number = 0, max: number = 255): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function getPixel(
  imageData: ImageData,
  x: number,
  y: number
): [number, number, number, number] {
  const idx = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
  if (idx < 0 || idx + 3 >= imageData.data.length) {
    return [0, 0, 0, 0];
  }
  return [
    imageData.data[idx],
    imageData.data[idx + 1],
    imageData.data[idx + 2],
    imageData.data[idx + 3],
  ];
}

export function setPixel(
  imageData: ImageData,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number
): void {
  const idx = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
  if (idx >= 0 && idx + 3 < imageData.data.length) {
    imageData.data[idx] = clamp(r);
    imageData.data[idx + 1] = clamp(g);
    imageData.data[idx + 2] = clamp(b);
    imageData.data[idx + 3] = clamp(a);
  }
}

export function blurPixel(
  imageData: ImageData,
  x: number,
  y: number,
  radius: number
): [number, number, number, number] {
  let r = 0, g = 0, b = 0, a = 0, count = 0;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const [pr, pg, pb, pa] = getPixel(imageData, x + dx, y + dy);
      r += pr;
      g += pg;
      b += pb;
      a += pa;
      count++;
    }
  }
  
  return [r / count, g / count, b / count, a / count];
}
```

### Update Editor.tsx to Use Utilities

```typescript
// At top of Editor.tsx, add:
import {
  createTempCanvas,
  copyCanvasToTemp,
  imageToCanvas,
  canvasToImageData,
  loadImage,
  cropCanvasToContent,
} from '../lib/canvas-utils';

import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
} from '../lib/color-utils';

// Then replace inline implementations with these utilities
```

---

## Verification Checklist

### After Implementing Part 1 (Sentry):
- [ ] Sentry project created and configured
- [ ] Error boundary shows in app
- [ ] Test error captured in Sentry dashboard
- [ ] Environment variables set correctly

### After Implementing Part 2 (Lazy-Loading):
- [ ] All heavy components use React.lazy
- [ ] Suspense boundaries added
- [ ] Loading spinners display
- [ ] Bundle size reduced by 30-40%
- [ ] No console errors for lazy imports
- [ ] Dialogs load quickly on first interaction

### After Implementing Part 3 (Memoization):
- [ ] useCallback used for all handlers
- [ ] useMemo used for derived values
- [ ] No console warnings about missing deps
- [ ] Tool changes feel smoother
- [ ] MenuBar doesn't cause Canvas rerender

### After Implementing Part 4 (Utilities):
- [ ] Canvas utilities extracted and tested
- [ ] Color utilities centralized
- [ ] Pixel utilities working
- [ ] Code duplication reduced
- [ ] Tests pass
- [ ] No regressions in existing features

---

## Measuring Improvements

### Bundle Size
```bash
npm run build
# Check dist folder size
# Before: ~500KB (gzipped)
# After lazy-loading: ~300-350KB (gzipped) - 30% reduction
```

### Performance
Open DevTools → Lighthouse → Performance (after each change)
- Initial load: Target <3 seconds
- Filter operation: Target <400ms
- Canvas render: Target 60fps

### Code Quality
```bash
# Check for unused imports
npm install -D unimported
npx unimported
```

---

## Next: Phase 2 (Web Workers)

Once Phase 1 complete, start Phase 2:
1. Create Web Worker pool for FilterEngine
2. Move Gaussian blur to worker (test performance gain)
3. Move all pixel filters to workers
4. Add progress tracking

This will give **3-5x performance improvement** for filters!

---

## Recommended Timeline

| Week | Task | Files | Status |
|------|------|-------|--------|
| 1 | Sentry + Lazy-loading | App.tsx, Editor.tsx | ⏳ Start here |
| 2 | Memoization + Utilities | Editor.tsx, lib/ | Next |
| 3 | Web Workers phase 1 | CanvasEngine.ts | After utilities |
| 4 | Web Workers phase 2 | FilterEngine.ts | Parallel |
| 5-6 | Layer caching + Virtualization | Canvas.tsx, LayersPanel.tsx | Final phase 1 |

**Total Time**: 4-6 weeks for all quick wins and phase 2 improvements
