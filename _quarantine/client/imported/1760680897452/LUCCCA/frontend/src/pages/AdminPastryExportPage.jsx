import React from 'react';

export default function AdminPastryExportPage() {
  const handleExportTestLog = () => {
    fetch('/api/admin/pastry-test-log-export')
      .then(res => res.json())
      .then(data => {
        alert("Test log export completed: " + data.path);
      });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pastry Module Admin Tools</h1>
      <button
        onClick={handleExportTestLog}
        className="p-3 bg-blue-600 text-white rounded"
      >
        Export Pastry Test Log
      </button>
    </div>
  );
}
