// File: src/components/EchoCore/components/interaction/EchoAssistant.jsx
import React, { useState } from "react";
import { Mic, Send, Loader } from "lucide-react";
import EchoWhisper from "./EchoWhisper";

// [TEAM LOG: Interaction] - EchoAssistant for voice + text AI communication
export default function EchoAssistant({ onSend }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    await onSend?.(message);
    setMessage("");
    setLoading(false);
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-md flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask Echo..."
          className="flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring focus:ring-blue-300"
        />
        <button
          onClick={handleSend}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {loading ? <Loader className="animate-spin" /> : <Send />}
        </button>
        // ADD INSIDE EchoAssistant.jsx (top imports)
import { useVoiceRecognition } from "../../voice";

// MODIFY component body
const { transcript, listening, startListening } = useVoiceRecognition();

// ADDITION to button for Mic
<button
  onClick={startListening}
  className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
  aria-label="Voice Command"
>
  <Mic className={listening ? "text-red-500" : ""} />
</button>

// Optional auto-fill: useEffect(() => setMessage(transcript), [transcript]);

        <button className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300">
          <Mic />
        </button>
      </div>
      <EchoWhisper />
    </div>
  );
}
