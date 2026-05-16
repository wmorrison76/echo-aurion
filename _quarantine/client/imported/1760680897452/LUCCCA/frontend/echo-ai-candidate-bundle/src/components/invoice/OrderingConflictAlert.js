// File: components/Invoice/OrderingConflictAlert.jsx
import React from 'react';

const OrderingConflictAlert = ({ conflicts }) => {
  if (!conflicts.length) return null;

  return (
    <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mt-4">
      <h3 className="font-semibold mb-2 text-orange-700">📦 Storeroom Conflict Detected</h3>
      <ul className="list-disc list-inside text-sm">
        {conflicts.map((item, i) => (
          <li key={i}>{item.name} already in storeroom – consider using existing stock.</li>
        ))}
      </ul>
    </div>
  );
};

export default OrderingConflictAlert;