import React from "react";
import { VoiceSettingsPanel, MicrophoneStatusIndicator } from "../";

export default {
  title: "EchoCore/Voice",
  component: VoiceSettingsPanel,
};

export const Default = () => (
  <div className="p-4">
    <VoiceSettingsPanel onToggle={() => alert("Voice toggled")} />
    <MicrophoneStatusIndicator listening={true} />
  </div>
);
