import React from 'react';

export default function ProposalSummary({ proposal }) {
  if (!proposal) return null;

  return (
    <div className="bg-white p-6 rounded shadow-md">
      <h2 className="text-2xl font-bold mb-4">Proposal Summary</h2>
      <p><strong>Guest Count:</strong> {proposal.guestCount}</p>
      <p><strong>Estimated Total:</strong> ${proposal.estimatedCost}</p>
      <h3 className="mt-4 font-semibold">Selected Features:</h3>
      <ul className="list-disc ml-5 mt-2">
        {proposal.modifiers.map((item, idx) => (
          <li key={idx}>{item.icon} {item.name} - ${item.cost}</li>
        ))}
      </ul>
    </div>
  );
}
