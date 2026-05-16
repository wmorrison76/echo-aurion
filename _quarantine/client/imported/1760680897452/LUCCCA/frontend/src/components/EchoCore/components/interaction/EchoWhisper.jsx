// File: src/components/EchoCore/components/interaction/EchoWhisper.jsx
import React from "react";

// [TEAM LOG: Interaction] - Idle prompt hints from Echo
export default function EchoWhisper() {
  const hints = [
    "Try: 'Show me today's revenue snapshot.'",
    "Say: 'How's the chef mood today?'",
    "Ask: 'What events are coming up?'",
  ];

  return (
    <div className="text-xs text-gray-500 italic">
      <p>{hints[Math.floor(Math.random() * hints.length)]}</p>
    </div>
  );
}
