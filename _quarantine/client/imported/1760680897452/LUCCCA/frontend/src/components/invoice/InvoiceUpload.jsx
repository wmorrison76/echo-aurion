// Block 1 of Invoice Intelligence Core

// 1. components/invoice/InvoiceUpload.jsx
import React, { useState } from 'react';
import InvoicePreviewModal from './InvoicePreviewModal';
import './InvoiceUpload.css';

const InvoiceUpload = () => {
  const [file, setFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setPreviewOpen(true);
  };

  return (
    <div className="invoice-upload">
      <label className="upload-label">
        📄 Upload Invoice (PDF/IMG)
        <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} hidden />
      </label>

      {previewOpen && (
        <InvoicePreviewModal file={file} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
};

export default InvoiceUpload;