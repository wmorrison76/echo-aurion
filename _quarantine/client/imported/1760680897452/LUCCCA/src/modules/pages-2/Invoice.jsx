import React from 'react';

export default function Invoice() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📄 Invoices</h1>
      <p className="text-gray-700">
        Upload scanned invoices, parse line items, and assign to GL codes.
      </p>
      <div className="mt-4 border p-4 rounded shadow-sm bg-white text-sm text-gray-600">
        <p>🔍 OCR engine will extract:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Vendor Name</li>
          <li>Date</li>
          <li>Item Description</li>
          <li>Quantity</li>
          <li>Unit Cost</li>
        </ul>
      </div>
    </div>
  );
}