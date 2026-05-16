import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { PreHealthInspectorChecklistPanel } from '../components/panels/PreHealthInspectorChecklistPanel';

export default function PreInspection(){
  return (
    <DashboardLayout title="Pre Health Inspector Checklist" subtitle="Self-audit readiness and compliance">
      <div className="space-y-6">
        <PreHealthInspectorChecklistPanel />
      </div>
    </DashboardLayout>
  );
}
