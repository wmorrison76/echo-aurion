# MenuStudio Quick Start Guide

## Getting Started with the New Hooks and Components

### 1. Menu Management

#### Create and Manage Menus
```typescript
import { useMenus } from '@/hooks/useMenus';

function MyMenuComponent() {
  const {
    menus,
    loading,
    createMenu,
    updateMenu,
    deleteMenu,
    publishMenu,
    shareMenu,
  } = useMenus();

  // Fetch menus
  useEffect(() => {
    fetchMenus({ 
      propertyId: 'property-123',
      season: 'summer',
      isPublished: false 
    });
  }, []);

  // Create new menu
  const handleCreate = async () => {
    const menu = await createMenu({
      propertyId: 'property-123',
      title: 'Summer Menu',
      businessSeason: 'summer',
      menuType: 'single-page',
    });
  };

  // Publish menu
  const handlePublish = async (menuId) => {
    await publishMenu(menuId);
  };

  return (
    <div>
      {menus.map(menu => (
        <div key={menu.id}>
          <h2>{menu.title}</h2>
          <button onClick={() => handlePublish(menu.id)}>
            {menu.isPublished ? 'Update' : 'Publish'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### Manage Drafts with Auto-Save
```typescript
import { useMenuDrafts } from '@/hooks/useMenuDrafts';

function MenuEditor({ draftId }) {
  const { updateDraft, autosaveDraft } = useMenuDrafts();
  
  // Auto-save on canvas changes
  useEffect(() => {
    const timer = setInterval(() => {
      autosaveDraft(draftId, canvasState);
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(timer);
  }, [canvasState]);

  return <MenuDesignStudio />;
}
```

### 2. Font System

#### Real-Time Font Preview
```typescript
import { useFontPreview } from '@/hooks/useFontPreview';

function FontControlPanel() {
  const {
    fontState,
    currentFont,
    initializeFont,
    updateVariations,
    updateFontSize,
    resetToDefaults,
  } = useFontPreview('font-id-123');

  return (
    <div>
      <h3>{currentFont?.name}</h3>
      
      {/* Font Size */}
      <input
        type="range"
        min="8"
        max="200"
        value={fontState?.fontSize || 24}
        onChange={(e) => updateFontSize(Number(e.target.value))}
      />

      {/* Weight */}
      <input
        type="range"
        min="100"
        max="900"
        step="100"
        value={fontState?.variations.weight || 400}
        onChange={(e) => 
          updateVariations({ weight: Number(e.target.value) })
        }
      />

      {/* Width (condensed to expanded) */}
      <input
        type="range"
        min="75"
        max="125"
        value={fontState?.variations.width || 100}
        onChange={(e) => 
          updateVariations({ width: Number(e.target.value) })
        }
      />

      <button onClick={resetToDefaults}>Reset</button>
    </div>
  );
}
```

#### Use Font Toolbar
```typescript
import { FontToolbar } from '@/components/MenuDesignStudio/layout/FontToolbar';

function MyDesignStudio() {
  return (
    <>
      <FontToolbar
        fontState={fontState}
        onFontChange={setFontId}
        onVariationChange={updateVariations}
        onOutlineChange={updateOutline}
        onFontSizeChange={updateFontSize}
        onLineHeightChange={updateLineHeight}
        onLetterSpacingChange={updateLetterSpacing}
        onExportFont={handleExport}
        onSavePreset={handleSavePreset}
      />
      <MenuDesignStudio />
    </>
  );
}
```

### 3. Professional Export

#### Export as PDF
```typescript
import { useMenuExport } from '@/hooks/useMenuExport';

function ExportPanel({ menuId, canvasState }) {
  const { exportMenu, downloadFile } = useMenuExport();

  const handleExport = async () => {
    const result = await exportMenu(menuId, canvasState, {
      format: 'pdf',
      colorSpace: 'RGB',
      resolutionDpi: 150,
    });

    if (result) {
      downloadFile(result.fileUrl, 'menu.pdf');
    }
  };

  return <button onClick={handleExport}>Export PDF</button>;
}
```

#### Export for Professional Printer
```typescript
function PrinterExportPanel({ menuId, canvasState }) {
  const { exportForPrinter, downloadFile } = useMenuExport();

  const handlePrinterExport = async () => {
    const result = await exportForPrinter(
      menuId,
      canvasState,
      'PrintCo Inc', // Printer company
      {
        bleedSize: 9, // 0.125"
        markType: 'corner',
        markLength: 18,
        markWidth: 1,
      },
      {
        includeColorBars: true,
        includeRegistrationMarks: true,
        includeDensitySteps: true,
      }
    );

    if (result) {
      downloadFile(result.fileUrl, 'menu-print.pdf');
    }
  };

  return <button onClick={handlePrinterExport}>
    Export for Printer (CMYK, 300 DPI)
  </button>;
}
```

#### Export with Layers (PSD/SVG)
```typescript
function LayerExportPanel({ menuId, canvasState }) {
  const { exportWithLayers, downloadFile } = useMenuExport();

  const handlePSDExport = async () => {
    const result = await exportWithLayers(menuId, canvasState, 'psd');
    
    if (result) {
      downloadFile(result.fileUrl, 'menu.psd');
    }
  };

  const handleSVGExport = async () => {
    const result = await exportWithLayers(menuId, canvasState, 'svg');
    
    if (result) {
      downloadFile(result.fileUrl, 'menu.svg');
    }
  };

  return (
    <>
      <button onClick={handlePSDExport}>Export as PSD</button>
      <button onClick={handleSVGExport}>Export as SVG</button>
    </>
  );
}
```

### 4. Operations Documentation

#### Create and Share Docs
```typescript
import { useOperationsDocs } from '@/hooks/useOperationsDocs';

function DocumentManager() {
  const { docs, createDoc, updateDoc, shareDoc } = useOperationsDocs();

  const handleCreateDoc = async () => {
    const doc = await createDoc({
      propertyId: 'property-123',
      title: 'Menu Server Training',
      docType: 'server-training',
      content: 'Training guide for menu items...',
      menuId: 'menu-123',
      visibility: 'property',
    });
  };

  const handleShare = async (docId) => {
    await shareDoc(docId, ['user-1', 'user-2']);
  };

  return (
    <div>
      {docs.map(doc => (
        <div key={doc.id}>
          <h3>{doc.title}</h3>
          <button onClick={() => handleShare(doc.id)}>Share</button>
        </div>
      ))}
    </div>
  );
}
```

### 5. Performance Tracking

#### Track Menu Performance
```typescript
import { useMenuPerformance } from '@/hooks/useMenuPerformance';

function PerformanceDashboard({ menuId }) {
  const {
    performance,
    fetchPerformance,
    getTopPerformingItems,
    getLowPerformingItems,
    calculateItemROI,
    syncPOSSalesData,
  } = useMenuPerformance();

  // Fetch performance data
  useEffect(() => {
    fetchPerformance({
      menuId,
      dateFrom: new Date('2024-01-01'),
      dateTo: new Date('2024-12-31'),
      groupBy: 'monthly',
    });
  }, [menuId]);

  // Sync POS data
  const handleSyncPOS = async () => {
    const salesData = [
      {
        itemId: 'item-1',
        itemName: 'Burger',
        unitsSold: 150,
        revenue: 1500,
        timestamp: new Date(),
      },
    ];

    await syncPOSSalesData(menuId, salesData);
  };

  // Top items
  const topItems = getTopPerformingItems(5);

  return (
    <div>
      <h2>{performance?.totalItemsSold} items sold</h2>
      <p>Revenue: ${performance?.totalRevenue}</p>
      
      <button onClick={handleSyncPOS}>Sync POS Data</button>

      <h3>Top Items</h3>
      {topItems.map(item => (
        <div key={item.itemId}>
          <span>{item.itemId}: {item.sold} sold</span>
          <span> (ROI: {calculateItemROI(item.itemId, 50)}%)</span>
        </div>
      ))}
    </div>
  );
}
```

#### Predict Performance
```typescript
function PredictionPanel({ menuId }) {
  const { predictions, predictPerformance } = useMenuPerformance();

  useEffect(() => {
    predictPerformance(menuId);
  }, [menuId]);

  return (
    <div>
      <h3>Performance Predictions</h3>
      <p>Predicted Popularity: {predictions?.predictedPopularity}%</p>
      <p>Expected Revenue: ${predictions?.expectedRevenue}</p>
      
      <h4>Risk Factors</h4>
      <ul>
        {predictions?.riskFactors.map((risk, i) => (
          <li key={i}>{risk}</li>
        ))}
      </ul>

      <h4>Recommendations</h4>
      <ul>
        {predictions?.recommendations.map((rec, i) => (
          <li key={i}>{rec}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## API Integration Checklist

Before using these hooks, ensure the following API endpoints are implemented:

- [ ] `GET /api/menus`
- [ ] `POST /api/menus`
- [ ] `PATCH /api/menus/:id`
- [ ] `DELETE /api/menus/:id`
- [ ] `POST /api/menus/:id/publish`
- [ ] `POST /api/menus/:id/share`
- [ ] `GET /api/menu-drafts`
- [ ] `POST /api/menu-drafts`
- [ ] `PATCH /api/menu-drafts/:id`
- [ ] `POST /api/menu-drafts/:id/autosave`
- [ ] `POST /api/menu-drafts/:id/publish`
- [ ] `GET /api/operations-docs`
- [ ] `POST /api/operations-docs`
- [ ] `PATCH /api/operations-docs/:id`
- [ ] `POST /api/operations-docs/:id/share`
- [ ] `POST /api/menus/export`
- [ ] `POST /api/menus/export-printer`
- [ ] `POST /api/menus/export-layers`
- [ ] `GET /api/menu-performance`
- [ ] `POST /api/menu-performance/sync-pos`
- [ ] `POST /api/menu-performance/predict`
- [ ] `POST /api/menu-performance/similar`

---

## Common Patterns

### Loading States
All hooks return a `loading` state for UI feedback:

```typescript
const { menus, loading } = useMenus();

return loading ? <Spinner /> : <MenuList menus={menus} />;
```

### Error Handling
All hooks return an `error` state and toast notifications:

```typescript
const { error, createMenu } = useMenus();

if (error) {
  console.error('Menu error:', error);
}
```

### Optimistic Updates
Most operations update local state immediately for better UX:

```typescript
// State updates before API response completes
const newMenu = await createMenu(menuData);
// menus array now includes newMenu immediately
```

### Auto-Save Pattern
Draft saving without user notification:

```typescript
useEffect(() => {
  const timer = setInterval(() => {
    autosaveDraft(draftId, canvasState);
  }, 30000); // Save every 30 seconds
  
  return () => clearInterval(timer);
}, [canvasState]);
```

---

## Troubleshooting

### Fonts not loading?
- Check that `useSupabaseAuth` is providing a valid user
- Verify VectorFontEngine is initialized
- Check console for font library errors

### Export failing?
- Ensure menuId is valid
- Check that canvasState has required properties
- Verify backend export service is running

### Performance data empty?
- Ensure POS data has been synced
- Check date range is valid
- Verify menu exists and has items

---

## Next Steps

1. **Implement Backend APIs** - Set up REST endpoints for all hooks
2. **Integrate MenuDesignStudio** - Add font tabs to right panel
3. **Create Menu Gallery** - Build UI for browsing/managing menus
4. **Set up POS Sync** - Integrate with Point of Sale system
5. **Performance Dashboard** - Create analytics views
6. **Deploy to Production** - Test all features end-to-end

