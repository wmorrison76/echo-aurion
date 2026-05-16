import React from 'react';

export default function CRMPipelineBoard({ pipeline }) {
  if (!pipeline || pipeline.length === 0) return <p>No pipeline data.</p>;

  return (
    <div className="grid grid-cols-3 gap-6 mt-6">
      {pipeline.map((stage, index) => (
        <div key={index} className="bg-white p-4 shadow rounded">
          <h3 className="text-xl font-bold mb-3">{stage.stage}</h3>
          {stage.events.length > 0 ? (
            <ul className="list-disc ml-5">
              {stage.events.map((event, idx) => (
                <li key={idx}>{event.name} – {event.date}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No events yet.</p>
          )}
        </div>
      ))}
    </div>
  );
}
