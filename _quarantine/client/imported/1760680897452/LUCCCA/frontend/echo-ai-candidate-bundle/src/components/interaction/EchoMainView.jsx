// File: src/components/EchoCore/components/interaction/EchoMainView.jsx

import React from "react";
import EchoAssistant from "./EchoAssistant";
import EchoWhisper from "./EchoWhisper";
import EchoNotepad from "./EchoNotepad";
import DashboardTransitionWrapper from "./DashboardTransitionWrapper";

const EchoMainView = () => {
  return (
    <DashboardTransitionWrapper>
      <div className="space-y-6">
        <EchoAssistant />
        <EchoWhisper />
        <EchoNotepad />
      </div>
    </DashboardTransitionWrapper>
  );
};

export default EchoMainView;
