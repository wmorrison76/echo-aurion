import React from 'react';

const InventoryTable = ({ items }) => {
  return (
    <table className="w-full border mt-4">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 text-left">Item</th>
          <th className="p-2 text-left">Qty</th>
          <th className="p-2 text-left">Unit</th>
          <th className="p-2 text-left">Cost</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i} className="border-t">
            <td className="p-2">{item.name}</td>
            <td className="p-2">{item.qty}</td>
            <td className="p-2">{item.unit}</td>
            <td className="p-2">${item.cost.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default InventoryTable;
