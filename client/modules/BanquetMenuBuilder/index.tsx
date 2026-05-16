/**
 * Banquet Menu Builder — Module Entry
 *
 * This file registers the module with MaestroBqts and exposes the
 * panel component for rendering. In Package 1, the panel is a
 * placeholder showing module status. Package 3 replaces it with
 * the real three-panel composition canvas.
 *
 * Note: The exact MaestroBqts panel registration API may differ
 * from what's shown here. If you have an existing panel registry,
 * adapt the registration call to match your conventions.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  MODULE_ID,
  MODULE_DISPLAY_NAME,
  MODULE_VERSION,
  BANQUET_MODULE_ROLES,
} from './BanquetMenuBuilder.constants';
import { initializeBanquetMenuBuilder } from './init';
import { CompositionCanvas } from './components/CompositionCanvas/CompositionCanvas';
import { WorkflowStageBar } from './components/Workflow/WorkflowStageBar';
import { EchoCompanion } from './components/EchoCompanion/EchoCompanion';
import { LibraryPanel } from './components/LibraryPanel/LibraryPanel';
import { PublishPipeline } from './components/Publishing/PublishPipeline';
import { useWorkflow } from './hooks/useWorkflow';
import { useMenuComposition } from './hooks/useMenuComposition';
import { useCompositionStore } from './hooks/useCompositionStore';
import { useAuth } from '@/contexts/AuthContext';

// =====================================================
// Demo preload — sets sensible defaults on first mount so the canvas
// doesn't open with guestCount=0/budget=0. The values mirror a typical
// mid-size wedding reception. Refresh-safe: only runs when meta is empty.
// =====================================================
const DEMO_DEFAULTS = {
  propertyId: 'demo-property-001',
  eventType: 'wedding-reception',
  guestCount: 150,
  budgetPerGuest: 95,
  budgetTotal: 150 * 95,
};

function useDemoPreload() {
  const meta = useCompositionStore((s) => s.meta);
  const setMeta = useCompositionStore((s) => s.setMeta);

  useEffect(() => {
    if (!meta.propertyId && setMeta) {
      setMeta(DEMO_DEFAULTS);
    }
  }, [meta.propertyId, setMeta]);
}

// =====================================================
// Panel Component
// Composes the full BMB experience: workflow stage bar at top, library
// panel on the left, composition canvas in the middle, Echo companion as
// a floating overlay. All children read from the shared composition store.
// =====================================================
const BanquetMenuBuilderPanel: React.FC = () => {
  useDemoPreload();
  const workflow = useWorkflow();
  const composition = useMenuComposition();
  const auth = useAuth();
  const [publishOpen, setPublishOpen] = useState(false);

  const onPublishRequested = useCallback(() => setPublishOpen(true), []);
  const onClosePublish = useCallback(() => setPublishOpen(false), []);

  // Identity for the publish audit trail. Falls through layers:
  //   1. authenticated user id
  //   2. authenticated user email (when id is missing)
  //   3. literal "anonymous" — render still works but the audit row
  //      is honest about being unattributed instead of pretending.
  const publishedBy =
    auth.user?.id ?? auth.user?.email ?? 'anonymous';

  return (
    <div
      style={{
        height: '100%',
        background: '#0a0a0c',
        color: '#e8e8ee',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <WorkflowStageBar
        workflow={workflow}
        composition={composition}
        onPublishRequested={onPublishRequested}
      />
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <LibraryPanel />
        <div style={{ flex: 1, minWidth: 0 }}>
          <CompositionCanvas />
        </div>
      </div>
      <EchoCompanion />
      {publishOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Publish menu"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClosePublish();
          }}
        >
          <div
            style={{
              width: 'min(900px, 92vw)',
              maxHeight: '88vh',
              overflow: 'auto',
              background: '#14141a',
              border: '1px solid #2a2a35',
              borderRadius: 12,
              padding: 24,
            }}
          >
            <PublishPipeline
              composition={composition}
              publishedBy={publishedBy}
              onPublishComplete={onClosePublish}
              onClose={onClosePublish}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================
// Module Definition
// =====================================================
export const BanquetMenuBuilderModule = {
  id: MODULE_ID,
  displayName: MODULE_DISPLAY_NAME,
  version: MODULE_VERSION,
  category: 'banquet-operations' as const,

  permittedRoles: BANQUET_MODULE_ROLES,

  panel: BanquetMenuBuilderPanel,

  initialize: initializeBanquetMenuBuilder,

  navigation: {
    parent: 'MaestroBqts',
    icon: 'menu-book',
    sortOrder: 30,
  },
};

// =====================================================
// Auto-register with MaestroBqts
//
// IMPORTANT: Adapt this to your actual MaestroBqts panel
// registration API. The pattern below assumes a registry
// pattern; if your MaestroBqts uses different conventions
// (e.g., a route definition, a context provider, etc.),
// replace this block with the equivalent.
// =====================================================
//
// Example pattern A — registry import:
// import { registerPanel } from '@/modules/MaestroBqts/registry';
// registerPanel(BanquetMenuBuilderModule);
//
// Example pattern B — manual registration in MaestroBqts:
// In src/modules/MaestroBqts/index.tsx:
//   import { BanquetMenuBuilderModule } from './BanquetMenuBuilder';
//   const panels = [..., BanquetMenuBuilderModule];
//
// Example pattern C — route-based:
// Add a route entry in your app router pointing to BanquetMenuBuilderPanel.

export default BanquetMenuBuilderModule;
