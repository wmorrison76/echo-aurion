import React from "react";
import { ThemeProvider } from "./components/ThemeProvider";
import { PanelFrame } from "./components/echo/PanelFrame";
import { App } from "./App";
import "./global.css";
import "./luccca-lookbook.css"; /** * SommelierAI Module - Default Export * This is the root component that gets imported by the panel registry * Wrapped with ThemeProvider first, then PanelFrame for consistent UI chrome */
export default function SommelierAIModule(props: any) {
  return (
    <ThemeProvider>
      {" "}
      <PanelFrame
        title="SommelierAI"
        icon="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='1.5'%3E%3Cpath d='M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4h4z'/%3E%3Cpath d='M4 14v4a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4'/%3E%3C/svg%3E"
        {...props}
      >
        {" "}
        <div className="h-full flex flex-col">
          {" "}
          <App />{" "}
        </div>{" "}
      </PanelFrame>{" "}
    </ThemeProvider>
  );
}
