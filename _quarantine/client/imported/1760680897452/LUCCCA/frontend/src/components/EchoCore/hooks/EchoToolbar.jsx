// File: src/components/EchoCore/components/interaction/Toolbar.jsx
import React from "react";
import { Settings, HelpCircle } from "lucide-react";

// [TEAM LOG: Interaction] - Toolbar for quick assistant actions
export default function Toolbar({ onSettings, onHelp }) {
  return (
    <div className="flex gap-3 p-2 bg-gray-100 rounded-lg shadow-sm">
      <button
        onClick={onSettings}
        className="p-2 rounded-lg hover:bg-gray-200"
        aria-label="Settings"
      >
        <Settings />
      </button>

// In Board.jsx toolbar section, add a button to open the Studio panel
<button
  className="etb-btn"
  title="Create your own widget"
  onClick={() => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "studio" } }))}
>
  +
</button>


      <button
        onClick={onHelp}
        className="p-2 rounded-lg hover:bg-gray-200"
        aria-label="Help"
      >
        <HelpCircle />
      </button>
    </div>
  );
}
