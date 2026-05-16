/**
 * LUCCCA | DB-04
 * File: packages/echoscope/src/panes/ReportPreviewPane/ReportPreviewPane.tsx
 * Created: 2025-07-27 by Window B
 * Depends On: DB-02 GlobalStateBus
 * Exposes: <ReportPreviewPane />
 * Location Notes: Dockable pane in FluidShell
 * Tests: packages/echo-testing/src/panes/ReportPreviewPane.test.tsx
 * ADR: ADR-0001-fluid-whiteboard-shell.md
 */
import React from 'react';

export interface ReportPreviewPaneProps { 
  reportHtml: string; 
}

export const ReportPreviewPane: React.FC<ReportPreviewPaneProps> = ({ reportHtml }) => {
  // TODO: draggable, resizable pane wrapper, print hook
  return <div dangerouslySetInnerHTML={{ __html: reportHtml }} />;
};

export default ReportPreviewPane;
