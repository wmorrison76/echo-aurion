import React from 'react';

export default function ProposalActions({ onDownloadPDF, onGenerateQR }) {
  return (
    <div className="mt-6 flex gap-4">
      <button
        onClick={onDownloadPDF}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Download PDF
      </button>
      <button
        onClick={onGenerateQR}
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
      >
        Generate QR Code
      </button>
    </div>
  );
}
