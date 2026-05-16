// File: frontend/src/components/DownloadOverridePDF.jsx

import React from 'react';
import html2pdf from 'html2pdf.js';

export default function DownloadOverridePDF() {
  const handleDownload = () => {
    const element = document.getElementById('override-instructions');
    html2pdf().from(element).save('LUCCCA_Override_Instructions.pdf');
  };

  return (
    <div>
      <div id="override-instructions" className="hidden">
        <h1>LUCCCA Admin Override Procedure</h1>
        <p>In the event of a complete lockout:</p>
        <ol>
          <li>Navigate to the Override Portal (/admin/override)</li>
          <li>Upload the LUCCCA_Master_Key.lck file</li>
          <li>Echo, Zelda, and Odin will verify the key</li>
          <li>Upon success, the system will auto-unlock and reload admin permissions</li>
        </ol>
        <p>Ensure this file is securely stored offline in a protected system vault.</p>
      </div>
      <button
        onClick={handleDownload}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Download Override Procedure PDF
      </button>
    </div>
  );
}
