// File: src/components/EchoCore/EchoOverlay.jsx

import React, { useState } from "react";
import { X } from "lucide-react";

const EchoOverlay = ({ onClose }) => {
  const [input, setInput] = useState("");

  return (
    <div className="fixed bottom-24 right-6 w-[340px] max-h-[70vh] bg-white dark:bg-zinc-900 text-black dark:text-white rounded-2xl shadow-2xl border border-cyan-500 p-4 z-[9998] backdrop-blur-md">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
          Echo is listening...
        </h2>
        <button onClick={onClose} title="Close Echo">
          <X className="text-gray-500 hover:text-red-500 transition" />
        </button>
      </div>

      {/* Message area */}
      <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
        You can ask Echo anything. She remembers your habits and helps you plan ahead.
      </div>

      {/* Input area */}
      <textarea
        rows={3}
        placeholder="What's on your mind?"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full rounded-md p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-800 text-black dark:text-white resize-none"
      />
      <button
        onClick={() => {
          console.log("Echo input:", input);
          setInput("");
        }}
        className="mt-3 px-3 py-1.5 rounded-md bg-cyan-600 text-white hover:bg-cyan-700 shadow"
      >
        Send to Echo
      </button>
    </div>
  );
};

export default EchoOverlay;
