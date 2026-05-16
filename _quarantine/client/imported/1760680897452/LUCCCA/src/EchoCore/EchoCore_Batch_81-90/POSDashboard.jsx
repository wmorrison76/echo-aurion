// POSDashboard.jsx
import React from 'react';
import usePOSData from './usePOSData';

/**
 * Displays POS sales data.
 */
const POSDashboard = ({ apiEndpoint }) => {
  const salesData = usePOSData(apiEndpoint);
  return (
    <div className="pos-dashboard">
      <h3>POS Sales Data</h3>
      <ul>
        {salesData.map((sale, i) => <li key={i}>{sale.item}: {sale.amount}</li>)}
      </ul>
    </div>
  );
};

export default POSDashboard;
