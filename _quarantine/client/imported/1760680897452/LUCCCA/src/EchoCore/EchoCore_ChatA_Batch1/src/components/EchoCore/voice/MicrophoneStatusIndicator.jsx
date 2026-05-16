import React from "react";

// [TEAM LOG: Chat A] - Shows mic listening state
export default function MicrophoneStatusIndicator({ listening }) {
  return (
    <div
      className={`w-4 h-4 rounded-full ${
        listening ? "bg-green-500" : "bg-gray-400"
      }`}
      title={listening ? "Listening" : "Idle"}
    ></div>
  );
}
