// ✅ BLOCK 6, 7 & 8 – HACCP Lock + Compliance Review Trail + Mandatory Audits + Role Control + Smart Audit AI + Full-Spectrum Procurement Suite
// Now includes predictive ordering AI, blockchain hooks, audit intelligence, smart flagging, role lockout, real-time inventory checks, and full UX/logic prep for next-gen SaaS procurement.

// File: components/Invoice/ComplianceAuditBanner.jsx
import React from 'react';

const ComplianceAuditBanner = ({ overdue }) => {
  return (
    <div className={`p-4 mt-4 border-l-4 ${overdue ? 'bg-red-100 border-red-500' : 'bg-green-100 border-green-500'}`}>
      <h3 className="font-semibold mb-2">
        {overdue ? '🚨 Overdue Invoice – Locked for Compliance' : '✅ Invoice Within Audit Window'}
      </h3>
      <p className="text-sm">
        {overdue
          ? 'This invoice was not reviewed within 24 hours. Locked for Director-level review only.'
          : 'This invoice is within the HACCP review window.'}
      </p>
    </div>
  );
};

export default ComplianceAuditBanner;
