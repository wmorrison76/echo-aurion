import React from "react";

// [TEAM LOG: Chat A] - UI panel for voice toggles
export default function VoiceSettingsPanel({ onToggle }) {
  return (
    <div className="p-4 bg-white rounded-xl shadow-md">
      <h3 className="font-bold mb-2">Voice Settings</h3>
      <button
        onClick={onToggle}
        className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg"
      >
        Toggle Voice Mode
      </button>
    </div>
  );
}
