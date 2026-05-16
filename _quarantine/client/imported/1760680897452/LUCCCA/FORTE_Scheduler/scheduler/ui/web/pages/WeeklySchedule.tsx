import React from 'react';
import { ScheduleGrid } from '../components/ScheduleGrid';
import { Toolbar } from '../components/Toolbar';

export default function WeeklySchedulePage() {
  return (
    <div className="forte-scheduler">
      <header className="header">
        <Toolbar />
      </header>
      <main>
        <ScheduleGrid />
      </main>
      <aside className="manager-panel">
        Manager metrics panel (Theory Cost, Labor %, Totals)
      </aside>
    </div>
  );
}
