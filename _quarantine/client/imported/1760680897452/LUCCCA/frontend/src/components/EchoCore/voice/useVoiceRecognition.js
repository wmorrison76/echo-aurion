// File: src/components/EchoCore/voice/useVoiceRecognition.js
import { useState, useEffect } from "react";

// [TEAM LOG: Voice] - Placeholder STT using Web Speech API
export default function useVoiceRecognition() {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) return;
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    setListening(true);
    recognition.start();
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((res) => res[0].transcript)
        .join("");
      setTranscript(text);
    };
    recognition.onend = () => setListening(false);
  };

  return { transcript, listening, startListening };
}
