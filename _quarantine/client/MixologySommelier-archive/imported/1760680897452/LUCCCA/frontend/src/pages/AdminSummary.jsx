import React from 'react';
import { PageSection } from '../components/PageSection';
import { StatGroup } from '../components/StatGroup';

export default function AdminSummary() {
  const summaryStats = [
    { label: 'Total Users', value: '12' },
    { label: 'Active Sessions', value: '4' },
    { label: 'System Alerts', value: '0' },
    { label: 'Last Backup', value: 'Today 04:00 AM' },
  ];

  return (
    <div className="admin-summary-page">
      <h1 className="text-2xl font-bold mb-4">Admin Summary</h1>
      <PageSection title="Quick Stats">
        <StatGroup stats={summaryStats} />
      </PageSection>
    </div>
  );
}
