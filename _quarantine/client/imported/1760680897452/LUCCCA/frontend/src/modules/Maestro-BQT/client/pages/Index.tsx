import React, { useState } from 'react';
import { LUCCCAHub } from '../components/panels/LUCCCAHub';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Index() {
  const [resetToken, setResetToken] = useState(0);

  const headerActions = (
    <>
      <Button variant="outline" size="sm" onClick={() => setResetToken(t => t + 1)}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Reset Layout
      </Button>
    </>
  );

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Maestro Banquets Command Center"
      actions={headerActions}
    >
      <div className="dashboard-legacy">
        <LUCCCAHub resetToken={resetToken} />
      </div>
    </DashboardLayout>
  );
}
