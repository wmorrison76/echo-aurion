// File: components/Dashboard/ProcurementDashboard.jsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ProcurementDashboard = () => {
  const spendData = [
    { day: 'Mon', spend: 1200 },
    { day: 'Tue', spend: 2200 },
    { day: 'Wed', spend: 1800 },
    { day: 'Thu', spend: 2600 },
    { day: 'Fri', spend: 3000 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
      {/* Spend vs Budget */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-bold mb-2">💸 Spend vs Budget</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={spendData}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="spend" stroke="#4F46E5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Open POs */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-bold mb-2">📋 Open Purchase Orders</h2>
          <ul className="text-sm space-y-1">
            <li>Produce PO #3382 - Awaiting Approval</li>
            <li>Dairy PO #3401 - Sent</li>
            <li>Protein PO #3410 - Scheduled</li>
          </ul>
        </CardContent>
      </Card>

      {/* Inventory Alerts */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-bold mb-2">🚨 Inventory Exceptions</h2>
          <ul className="text-sm space-y-1">
            <li>🔍 Lobster - 0 qty, was stocked last month</li>
            <li>⚠️ Tea Bags - 200 boxes counted</li>
            <li>📈 Milk - +110 qty increase</li>
          </ul>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-bold mb-2">🤖 Echo AI Suggestions</h2>
          <ul className="text-sm space-y-1">
            <li>Vendor switch: Save 12% on avocados</li>
            <li>Overstocked chicken thighs – freeze alert</li>
            <li>Flag high-spend items for weekly review</li>
          </ul>
        </CardContent>
      </Card>

      {/* Deliveries */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-bold mb-2">📦 Receiving Snapshot</h2>
          <ul className="text-sm space-y-1">
            <li>3 deliveries received today</li>
            <li>1 damaged item returned</li>
            <li>New item added: Blood Orange Puree</li>
          </ul>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-bold mb-2">🧾 Audit & Compliance</h2>
          <ul className="text-sm space-y-1">
            <li>Protein Audit overdue 3 days</li>
            <li>Dairy Audit scheduled for Friday</li>
            <li>Inventory flagged by Finance</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcurementDashboard;
