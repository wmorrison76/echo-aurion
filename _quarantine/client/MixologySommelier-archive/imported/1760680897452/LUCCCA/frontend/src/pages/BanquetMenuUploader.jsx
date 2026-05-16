import React, { useState } from 'react';

export default function BanquetMenuUploader({ onUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-md">
      <h2 className="text-2xl font-bold mb-4">Upload Banquet Menu</h2>
      <input type="file" accept=".pdf,.csv" onChange={handleFileChange} className="mb-4" />
      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Upload
      </button>
    </div>
  );
}
