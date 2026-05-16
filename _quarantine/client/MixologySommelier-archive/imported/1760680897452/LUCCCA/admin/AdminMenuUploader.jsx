import React, { useState } from 'react';

export default function AdminMenuUploader() {
  const [fileName, setFileName] = useState(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setStatus('Uploading and processing...');

    // Simulate parsing delay
    setTimeout(() => {
      setStatus('Menu parsed successfully! Ready for proposal generation.');
    }, 2000);
  };

  return (
    <div className="p-6 bg-white rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">Upload Banquet Menu (PDF or CSV)</h2>
      <input
        type="file"
        accept=".pdf,.csv"
        onChange={handleFileChange}
        className="mb-4"
      />
      {fileName && (
        <p><strong>File:</strong> {fileName}</p>
      )}
      {status && (
        <p className="mt-2 text-green-600">{status}</p>
      )}
    </div>
  );
}
