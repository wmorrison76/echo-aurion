/**
 * Calendar Page - Maestro Banquets
 * Global Calendar with integrated BEO management system
 */

import React from 'react';
import { GlobalCalendar } from '../components/panels/GlobalCalendar';
import DashboardLayout from '../components/layout/DashboardLayout';

export default function Calendar() {
  const handleBEOSelect = (beoId: string) => {
    console.log('BEO selected:', beoId);
    // Navigation is handled within GlobalCalendar component
  };

  const handleCreateBEO = (eventId: string) => {
    console.log('Creating BEO for event:', eventId);
    // BEO creation is handled within GlobalCalendar component
  };


  return (
    <DashboardLayout
      title="Global Calendar"
      subtitle="Event coordination and BEO management system"
    >
      <GlobalCalendar
        onBEOSelect={handleBEOSelect}
        onCreateBEO={handleCreateBEO}
        viewMode="calendar"
      />
    </DashboardLayout>
  );
}
