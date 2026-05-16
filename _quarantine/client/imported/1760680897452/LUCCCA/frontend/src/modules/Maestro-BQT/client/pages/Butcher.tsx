import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { ButcherPanel } from '../components/panels/ButcherPanel';

export default function Butcher() {
  return (
    <DashboardLayout title="Butchery" subtitle="Auto-generated orders from BEOs, daily prep, and outlet chargebacks">
      <ButcherPanel />
    </DashboardLayout>
  );
}
