import React, { useState } from 'react';

export function EchoIcon() {
  const [show, setShow] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <button
        onClick={() => setShow(!show)}
        className="bg-blue-600 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white text-2xl hover:bg-blue-700"
        title="Need help? Ask Echo"
      >
        🎧
      </button>

      {show && (
        <div className="mt-2 w-64 bg-white text-black p-4 rounded shadow-lg">
          <h3 className="font-bold mb-2">Hi, I'm Echo!</h3>
          <p className="text-sm mb-2">
            Need help planning your event? I can suggest features, explain costs, and guide your next step.
          </p>
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            onClick={() => alert('Echo chat launched (coming soon!)')}
          >
            Let’s Chat
          </button>
        </div>
      )}
    </div>
  );
}
