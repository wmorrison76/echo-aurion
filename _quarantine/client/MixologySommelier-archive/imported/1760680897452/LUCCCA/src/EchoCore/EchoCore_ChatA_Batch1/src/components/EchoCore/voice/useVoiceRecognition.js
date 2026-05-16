import { useState } from "react";
import SpeechToTextService from "./SpeechToTextService";

// [TEAM LOG: Chat A] - React hook for managing voice input
export default function useVoiceRecognition() {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const service = new SpeechToTextService();

  const startListening = () => {
    setListening(true);
    service.start((text) => setTranscript(text));
  };

  const stopListening = () => {
    setListening(false);
    service.stop();
  };

  return { transcript, listening, startListening, stopListening };
}
