import React from "react";
import { EchoAIMasterInterface } from "@/components/echo-ai/EchoAIMasterInterface";
import { useBreakpoint } from "@/components/layout";

/**
 * EchoAI Master Page
 * Full-featured AI interface with multi-persona support,
 * voice loop, PDF learning, and knowledge management
 */
export default function EchoAIPage() {
  const breakpoint = useBreakpoint();

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col">
      {/* Responsive container that adapts to breakpoints */}
      <div className={`flex-1 overflow-hidden ${
        breakpoint === "xs" || breakpoint === "sm" ? "p-2" : "p-4"
      }`}>
        <EchoAIMasterInterface />
      </div>
    </div>
  );
}
