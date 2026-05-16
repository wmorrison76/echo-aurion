import { useState } from "react";
import { RDLabProvider, useOptionalRDLabStore } from "@/stores/rdLabStore";
import {
  ProjectDashboard,
  DiscoveryPanel,
  WorkbenchPanel,
  InsightsPanel,
  RDLabSessionSidebar,
} from "@/components/RDLab";
import { Button } from "@/components/ui/button";
import { LayoutGrid } from "lucide-react";

export default function PastryLabWorkspace() {
  return (
    <RDLabProvider>
      <PastryLabWorkspaceContent />
    </RDLabProvider>
  );
}

function PastryLabWorkspaceContent() {
  const store = useOptionalRDLabStore();
  const [showDashboard, setShowDashboard] = useState(true);

  if (!store) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <p className="text-xl font-bold mb-4">Loading Pastry Lab...</p>
          <p className="text-sm text-slate-400">Store initializing</p>
        </div>
      </div>
    );
  }

  const pastryExperiments = store.experiments.filter(
    (e) => e.specialization === "pastry" || e.specialization === "both"
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-rose-400/20 bg-slate-900/50">
        <h1 className="text-2xl font-bold text-rose-300">Pastry Lab</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={showDashboard ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowDashboard(!showDashboard)}
            className="gap-2"
            title="Toggle Dashboard View"
          >
            <LayoutGrid className="h-4 w-4" />
            Dashboard
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden gap-0">
        {/* Discovery Panel - Left */}
        <div className="w-72 border-r border-rose-400/10 bg-slate-900/30 overflow-auto flex-shrink-0">
          <div className="p-4">
            <DiscoveryPanel />
          </div>
        </div>

        {/* Center content - Dashboard or Workbench */}
        <div className="flex-1 overflow-auto flex flex-col">
          {showDashboard ? (
            <ProjectDashboard
              onSelectProject={() => setShowDashboard(false)}
              onCreateProject={() => {}}
            />
          ) : (
            <div className="p-4 flex-1 overflow-auto">
              <WorkbenchPanel />
            </div>
          )}
        </div>

        {/* Right Panel - Insights/Session Info */}
        {!showDashboard && (
          <div className="w-72 border-l border-rose-400/10 bg-slate-900/30 overflow-auto flex-shrink-0">
            <div className="p-4">
              <RDLabSessionSidebar
                isDarkMode={true}
                projectName="Pastry Lab"
                createdAt={new Date().toISOString()}
                updatedAt={new Date().toISOString()}
                experimentsCount={pastryExperiments.length}
                discoveryQueue={pastryExperiments.slice(0, 3)}
                backlog={[]}
                insights={[]}
              />
              <div className="mt-6">
                <InsightsPanel />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
