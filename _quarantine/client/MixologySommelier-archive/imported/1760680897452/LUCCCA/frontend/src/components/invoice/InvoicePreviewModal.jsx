// 2. components/invoice/InvoicePreviewModal.jsx
import React from 'react';
import './InvoicePreviewModal.css';

const InvoicePreviewModal = ({ file, onClose }) => {
  return (
    <div className="invoice-modal-overlay">
      <div className="invoice-modal">
        <button className="close-button" onClick={onClose}>✖</button>
        <h2>Invoice Preview</h2>
        <p><strong>Filename:</strong> {file?.name}</p>
        <p>Further preview & AI parsing logic coming soon...</p>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;
