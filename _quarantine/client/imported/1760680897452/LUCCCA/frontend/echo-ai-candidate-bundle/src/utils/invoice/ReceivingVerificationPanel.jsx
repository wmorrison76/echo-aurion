import React, { useState } from 'react';

const ReceivingVerificationPanel = ({ uploadedInvoices }) => {
  const [duplicateCheckNumber, setDuplicateCheckNumber] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [issues, setIssues] = useState([]);

  const handleDuplicateScan = () => {
    const match = uploadedInvoices.find(inv => inv.invoiceNumber === duplicateCheckNumber);
    if (match) {
      setMatchResult({ found: true, invoice: match });
    } else {
      setMatchResult({ found: false });
    }
  };

  const handleMarkIssue = (type, comment) => {
    setIssues(prev => [...prev, { type, comment, timestamp: new Date().toISOString() }]);
  };

  return (
    <div className="p-6 border bg-gray-50 rounded-md shadow">
      <h2 className="text-lg font-bold mb-4">Receiving Verification</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium">Scan Invoice Number for Duplicate Check</label>
        <input
          type="text"
          value={duplicateCheckNumber}
          onChange={(e) => setDuplicateCheckNumber(e.target.value)}
          className="border px-2 py-1 rounded w-full mt-1"
        />
        <button onClick={handleDuplicateScan} className="mt-2 bg-blue-600 text-white px-4 py-1 rounded">
          Check
        </button>
        {matchResult && (
          <p className={`mt-2 ${matchResult.found ? 'text-green-600' : 'text-red-600'}`}>
            {matchResult.found ? 'Invoice Found in System ✅' : 'Invoice NOT Found ❌'}
          </p>
        )}
      </div>

      <div className="border-t pt-4 mt-4">
        <h3 className="text-md font-semibold mb-2">Mark Issues (within 24h):</h3>
        <button
          onClick={() => handleMarkIssue('Damaged Item', 'Vendor called for credit')}
          className="mr-2 bg-yellow-500 text-white px-3 py-1 rounded"
        >
          Mark Damaged
        </button>
        <button
          onClick={() => handleMarkIssue('Missing Item', 'Called vendor for replacement')}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          Mark Missing
        </button>

        {issues.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium">Logged Issues:</h4>
            <ul className="text-sm mt-2 space-y-1">
              {issues.map((i, idx) => (
                <li key={idx}>
                  [{new Date(i.timestamp).toLocaleString()}] • {i.type}: {i.comment}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceivingVerificationPanel;
