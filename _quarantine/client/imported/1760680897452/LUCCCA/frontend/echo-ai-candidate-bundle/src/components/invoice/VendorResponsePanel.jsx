// ✅ BLOCK 5 – Vendor Response Handling & Echo Notifications
// Captures vendor feedback and routes tagged issues to Echo for learning and trend tracking.

// File: components/Invoice/VendorResponsePanel.jsx
import React, { useState } from 'react';

const VendorResponsePanel = ({ onSubmit }) => {
  const [response, setResponse] = useState('');
  const [issueType, setIssueType] = useState('');

  const handleSubmit = () => {
    if (response.trim()) {
      onSubmit({ response, issueType });
      setResponse('');
      setIssueType('');
    }
  };

  return (
    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
      <h3 className="font-semibold text-blue-700 mb-2">Vendor Response</h3>
      <select
        className="mb-2 w-full border rounded p-2"
        value={issueType}
        onChange={(e) => setIssueType(e.target.value)}
      >
        <option value="">Select Issue Type</option>
        <option value="Damaged">Damaged Product</option>
        <option value="Short">Shorted Item</option>
        <option value="Overcharged">Overcharged</option>
        <option value="Wrong Item">Wrong Item Delivered</option>
      </select>
      <textarea
        className="w-full border rounded p-2 mb-2"
        placeholder="Vendor response or notes..."
        value={response}
        onChange={(e) => setResponse(e.target.value)}
      />
      <button
        onClick={handleSubmit}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Submit Response
      </button>
    </div>
  );
};

export default VendorResponsePanel;


// File: utils/invoice/routeVendorIssuesToEcho.js
export function routeVendorIssuesToEcho({ invoiceNumber, vendor, issueType, response }) {
  // Simulated Echo tagging system
  return {
    message: `Issue tagged: ${issueType} for invoice ${invoiceNumber} from ${vendor}. Echo has logged vendor feedback.`,
    echoTag: {
      invoiceNumber,
      vendor,
      issueType,
      feedback: response,
      timestamp: new Date().toISOString(),
    },
  };
}
