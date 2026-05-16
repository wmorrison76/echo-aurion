// File: src/components/EchoCore/Dashboard.jsx

import React from "react";
import EchoShell from "../interaction/EchoShell"; // ✅ Importing existing component
import { DashboardThemeProvider } from "./components/theme";
import { EchoCoreProvider } from "./context";

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
