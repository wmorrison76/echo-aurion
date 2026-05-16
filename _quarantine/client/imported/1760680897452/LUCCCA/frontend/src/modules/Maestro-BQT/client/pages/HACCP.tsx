import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { HACCPPanel } from '../components/panels/HACCPPanel';

export default function HACCP(){
  return (
    <DashboardLayout title="HACCP Program" subtitle="Hazard analysis, CCPs, monitoring, and records">
      <div className="space-y-6">
        <HACCPPanel />
      </div>
    </DashboardLayout>
  );
}
