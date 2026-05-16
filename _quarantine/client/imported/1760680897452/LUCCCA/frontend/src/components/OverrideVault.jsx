// File: frontend/src/components/OverrideUnlock.jsx

import React, { useState } from 'react';

export default function OverrideUnlock() {
  const [keyFile, setKeyFile] = useState(null);
  const [status, setStatus] = useState('');

  const handleUpload = (e) => {
    const file = e.target.files[0];
    setKeyFile(file);
    // Simulate verification logic
    if (file && file.name === 'LUCCCA_Master_Key.lck') {
      setStatus('✅ Verified by Echo, Zelda, and Odin. Access Restored.');
      // Trigger recovery logic here
    } else {
      setStatus('❌ Invalid Key File. Access Denied.');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-24 p-6 border shadow-lg rounded bg-white">
      <h2 className="text-2xl font-bold mb-4 text-center">System Locked</h2>
      <p className="mb-4 text-sm text-gray-700 text-center">
        Upload your Master Key File to restore admin access. This will be verified by Echo, Zelda, and Odin’s Spear.
      </p>
      <input
        type="file"
        onChange={handleUpload}
        className="block w-full mb-4 border px-3 py-2 rounded"
      />
      {status && (
        <div className={`mt-2 font-semibold text-center ${status.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
          {status}
        </div>
      )}
    </div>
  );
}
