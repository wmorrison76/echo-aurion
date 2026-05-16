

// ✅ BLOCK 3 – Invoice Verification & Duplicate Prevention Logic
// Adds a compliance-focused check step for receiving and approval workflows.

// File: components/Invoice/InvoiceVerificationStep.jsx
import React from 'react';

const InvoiceVerificationStep = ({ invoice, duplicateFound }) => {
  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mt-4">
      <h3 className="font-semibold mb-2 text-yellow-700">Invoice Verification</h3>
      <p className="text-sm">Receiving must review this invoice within 24 hours of submission.</p>
      <p className="text-sm mt-1">Check for credits, damages, or errors.</p>
      {duplicateFound ? (
        <p className="text-red-600 font-semibold mt-2">🚫 Duplicate invoice number detected! Review required before proceeding.</p>
      ) : (
        <p className="text-green-600 font-semibold mt-2">✅ No duplicate found. Ready for compliance check.</p>
      )}
    </div>
  );
};

export default InvoiceVerificationStep;
