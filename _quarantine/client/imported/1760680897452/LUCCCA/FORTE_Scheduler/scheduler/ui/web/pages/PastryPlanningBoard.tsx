import React from 'react';
import { PastryGantt } from '../components/PastryGantt';
import { WIPvsRevenueChart } from '../components/WIPvsRevenueChart';

export default function PastryPlanningBoard() {
  return (
    <div className="pastry-planning-board">
      <PastryGantt />
      <WIPvsRevenueChart />
    </div>
  );
}
