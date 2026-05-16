// File: src/components/EchoCore/Dashboard.jsx

import React from "react";
import EchoShell from "../interaction/EchoShell"; // ✅ Importing existing component
import { DashboardThemeProvider } from "../EchoCore/components/theme/DashboardThemeContext";
import { EchoCoreProvider } from "../EchoCore/context";


// [TEAM LOG: Assembly] – Dashboard integrates EchoShell with global providers
export default function Dashboard({ userId = "guest" }) {
  return (
    <DashboardThemeProvider>
      <EchoCoreProvider userId={userId}>
        <EchoShell />
      </EchoCoreProvider>
    </DashboardThemeProvider>
  );
}






// [TEAM LOG: A] EchoShell is the root container for EchoCore.
// It acts as the dynamic whiteboard where modules and AI responses are rendered.
// EchoShell manages the layout, toggling of modules, and Echo AI responses.