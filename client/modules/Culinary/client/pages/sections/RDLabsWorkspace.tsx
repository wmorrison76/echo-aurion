import { useState } from "react";
import { RDLabProvider, useOptionalRDLabStore } from "@/stores/rdLabStore";
import {
  LabDoorEntrance,
  TrackDashboards,
  CollaborationHub,
  ProjectDashboard,
  DiscoveryPanel,
  WorkbenchPanel,
  InsightsPanel,
  RDLabSessionSidebar,
  GlobalExperimentSearch,
  ExperimentTemplates,
  CollaborationPanel,
  BatchOperations,
  RecipeLinkingPanel,
  ExportImport,
  RDLabsHelpPanel,
  AIExperimentDesigner,
  AIValidationPanel,
  AISOPGenerator,
  AIProductionReadiness,
  AIRecommendations,
  AITeamInsights,
  AIPredictiveAnalytics,
  TrackSelector,
  EchoChatInterface,
  LabDoorTransition,
  LabSetupPanel,
  LabWhiteboard,
} from "@/components/RDLab";
import { IntegratedLabEntrance } from "@/components/RDLab/IntegratedLabEntrance";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  LayoutGrid,
  Beaker,
  TestTube,
  Search,
  Settings,
  Home,
  HelpCircle,
  Sparkles,
  BarChart3,
  Zap,
  Wand2,
  CheckCircle,
  FileText,
  AlertTriangle,
  Lightbulb,
  Users,
  Target,
  Plus,
  ChevronDown,
  Notebook,
} from "lucide-react";

export default function RDLabsWorkspace() {
  return (
    <RDLabProvider>
      <RDLabsWorkspaceContent />
    </RDLabProvider>
  );
}

function RDLabsWorkspaceContent() {
  const store = useOptionalRDLabStore();
  const { user } = useAuth();
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);
  const [labMode, setLabMode] = useState<"culinary" | "pastry">("culinary");
  const [recipeTrack, setRecipeTrack] = useState<
    "fine-dining" | "manufacturing"
  >("fine-dining");
  const [hasEnteredLab, setHasEnteredLab] = useState(false);
  const [transitionStage, setTransitionStage] = useState<
    "integrated-entrance" | "chat" | "door-animation" | "setup" | "workspace"
  >("integrated-entrance");
  const [projectContext, setProjectContext] = useState<{
    projectName: string;
    conversation: string;
    theme: string;
  } | null>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(true);

  if (!store) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background dark:bg-slate-950">
        <div className="text-center space-y-4">
          <Beaker className="h-16 w-16 mx-auto text-slate-400" />
          <p className="text-xl font-bold text-foreground">R&D Labs</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Initializing research environment...
          </p>
        </div>
      </div>
    );
  }

  // Integrated entrance with refined transition sequence
  if (transitionStage === "integrated-entrance") {
    return (
      <IntegratedLabEntrance
        onLabEnter={(projectInfo) => {
          setRecipeTrack("fine-dining");
          setLabMode("culinary");
          setProjectContext({
            projectName: projectInfo.projectName,
            conversation: projectInfo.conversationContext,
            theme: "culinary",
          });
          setHasEnteredLab(true);
          setTransitionStage("workspace");
        }}
      />
    );
  }

  // Legacy transition states (kept for backward compatibility)
  if (transitionStage === "chat") {
    return (
      <EchoChatInterface
        onEnterLab={(track, mode, context) => {
          setRecipeTrack(track);
          setLabMode(mode);
          setProjectContext(context);
          setTransitionStage("door-animation");
        }}
      />
    );
  }

  if (transitionStage === "door-animation") {
    return (
      <>
        <LabDoorTransition
          isOpen={true}
          labMode={labMode}
          onComplete={() => setTransitionStage("setup")}
        />
      </>
    );
  }

  if (transitionStage === "setup" && projectContext) {
    return (
      <LabSetupPanel
        isVisible={true}
        projectName={projectContext.projectName}
        recipeTrack={recipeTrack}
        labMode={labMode}
        chatContext={projectContext.conversation}
        onSetupComplete={() => {
          setHasEnteredLab(true);
          setTransitionStage("workspace");
        }}
      />
    );
  }

  const experimentsCount = store.experiments.length;
  const focusExperiment = store.experiments.find(
    (e) => e.id === store.focusExperimentId,
  );

  if (showDashboard) {
    return (
      <div className="w-full h-full bg-background dark:bg-slate-950 flex flex-col">
        <ProjectDashboard
          onSelectProject={() => setShowDashboard(false)}
          onCreateProject={() => {
            const newProjectId = store.createExperiment({
              title: "New Research Project",
              hypothesis: "Define your research hypothesis",
              owner: "Current User",
            });
            store.setFocusExperiment(newProjectId);
            setShowDashboard(false);
          }}
          recentProjects={[]}
          allProjects={[]}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-background dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              labMode === "pastry"
                ? "bg-rose-500/10 border border-rose-500/30"
                : "bg-[#c8a97e]/08 border border-[#c8a97e]/25"
            }`}
          >
            {labMode === "pastry" ? (
              <Sparkles className="h-5 w-5 text-rose-500" />
            ) : (
              <Beaker className="h-5 w-5 text-[#c8a97e]" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">R&D Labs</h1>
            <p className="text-xs text-muted-foreground">
              {labMode === "pastry"
                ? recipeTrack === "manufacturing"
                  ? "Pastry Manufacturing Lab"
                  : "Pastry Fine Dining Lab"
                : recipeTrack === "manufacturing"
                  ? "Culinary Manufacturing Lab"
                  : "Fine Dining Innovation Lab"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm hidden md:block">
            <p className="font-medium text-foreground">
              {experimentsCount} Active Experiments
            </p>
            <p className="text-xs text-muted-foreground">
              Research in progress
            </p>
          </div>
          <div className="flex gap-2">
            {hasEnteredLab && (
              <Button
                size="sm"
                variant={showWhiteboard ? "default" : "outline"}
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                className="gap-2"
                title="Lab Whiteboard"
              >
                <Notebook className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {showWhiteboard ? "Hide" : "Show"} Whiteboard
                </span>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setHasEnteredLab(false);
                setTransitionStage("chat");
                setProjectContext(null);
              }}
              className="gap-2"
              title="Switch Lab Focus"
            >
              <ChevronDown className="h-4 w-4" />
              Discuss with ECHO
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHelp(!showHelp)}
              className="gap-2"
              title="R&D Labs Guide"
            >
              <HelpCircle className="h-4 w-4" />
              Guide
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDashboard(true)}
              className="gap-2"
              title="Projects Dashboard"
            >
              <Home className="h-4 w-4" />
              Projects
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="flex-1 flex overflow-hidden">
        {/* Help Panel Overlay */}
        {showHelp && (
          <div className="absolute right-0 top-0 bottom-0 z-50">
            <RDLabsHelpPanel
              isOpen={showHelp}
              onClose={() => setShowHelp(false)}
            />
          </div>
        )}

        {/* Left Panel - Context */}
        <div className="w-80 border-r border-border dark:border-slate-800 overflow-auto flex-shrink-0 flex flex-col bg-muted/50 dark:bg-slate-900/50">
          <div className="p-4 border-b border-border dark:border-slate-800">
            <h2 className="text-sm font-semibold mb-1 text-foreground">
              Active Experiment
            </h2>
            <p className="text-xs text-muted-foreground">
              {focusExperiment?.title || "Select an experiment"}
            </p>
          </div>

          {/* Track Selector */}
          {user && (
            <div className="px-4 py-3 border-b border-border dark:border-slate-800">
              <TrackSelector
                chefId={user.id}
                onTrackChange={(track) => setRecipeTrack(track)}
              />
            </div>
          )}

          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">
                Quick Actions
              </h3>
              <Button className="w-full gap-2" size="sm">
                <Plus className="h-4 w-4" />
                New Experiment
              </Button>
            </div>
            <div className="border-t border-border dark:border-slate-700 my-2"></div>
            <div className="pt-2">
              <h3 className="text-sm font-semibold mb-2 text-foreground">
                Lab Focus
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <p className="font-medium text-blue-900 dark:text-blue-200 capitalize">
                    {labMode} - {recipeTrack.replace("-", " ")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1"
          >
            <TabsList className="w-full justify-start rounded-none h-12 overflow-x-auto border-b border-border dark:border-slate-800 bg-muted/30 dark:bg-slate-900/30">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2">
                <Zap className="h-4 w-4" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="ai-design" className="gap-2">
                <Wand2 className="h-4 w-4" />
                AI Design
              </TabsTrigger>
              <TabsTrigger value="ai-validate" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                AI Validate
              </TabsTrigger>
              <TabsTrigger value="ai-sop" className="gap-2">
                <FileText className="h-4 w-4" />
                AI SOP
              </TabsTrigger>
              <TabsTrigger value="workbench" className="gap-2">
                <TestTube className="h-4 w-4" />
                Workbench
              </TabsTrigger>
              <TabsTrigger value="discovery" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Discovery
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-2">
                <Search className="h-4 w-4" />
                Search
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <TabsContent value="overview" className="m-0 flex-1 overflow-hidden h-full">
                <div className="h-full overflow-y-auto p-6">
                  <TrackDashboards track={recipeTrack} labMode={labMode} />
                </div>
              </TabsContent>

              <TabsContent value="insights" className="m-0 flex-1 overflow-hidden h-full">
                <div className="h-full overflow-y-auto p-6">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-foreground">
                      Lab Insights
                    </h2>
                    <p className="text-muted-foreground">
                      Real-time analysis of your experiments
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="m-0 flex-1 overflow-hidden h-full">
                <div className="h-full overflow-y-auto p-6">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-foreground">
                      Lab Analytics
                    </h2>
                    <p className="text-muted-foreground">
                      Detailed performance metrics
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai-design" className="m-0 flex-1 overflow-hidden h-full">
                <div className="h-full overflow-y-auto p-6">
                  <AIExperimentDesigner />
                </div>
              </TabsContent>

              <TabsContent value="ai-validate" className="m-0 flex-1 overflow-hidden h-full">
                <div className="h-full overflow-y-auto p-6">
                  <AIValidationPanel />
                </div>
              </TabsContent>

              <TabsContent value="ai-sop" className="m-0 flex-1 overflow-hidden h-full">
                <div className="h-full overflow-y-auto p-6">
                  <AISOPGenerator />
                </div>
              </TabsContent>

              <TabsContent value="workbench" className="m-0 flex-1 overflow-hidden h-full">
                <div className="h-full overflow-y-auto p-6">
                  <WorkbenchPanel />
                </div>
              </TabsContent>

              <TabsContent value="discovery" className="m-0 flex-1 overflow-hidden h-full">
                <div className="h-full overflow-y-auto p-6">
                  <DiscoveryPanel />
                </div>
              </TabsContent>

              <TabsContent value="search" className="m-0 flex-1 overflow-hidden h-full">
                <div className="h-full overflow-y-auto p-6">
                  <GlobalExperimentSearch />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Panel - Collaboration & Session */}
        <div className="w-80 border-l border-border dark:border-slate-800 overflow-auto flex-shrink-0 flex flex-col bg-muted/50 dark:bg-slate-900/50">
          <div className="p-4 space-y-6">
            <CollaborationHub
              track={recipeTrack}
              labMode={labMode}
              currentUser={
                user ? { id: user.id, name: user.name || "Chef" } : undefined
              }
            />

            <div className="border-t border-border dark:border-slate-700 pt-6">
              <h3 className="text-sm font-semibold mb-3 text-foreground">
                Session Info
              </h3>
              {focusExperiment && (
                <RDLabSessionSidebar
                  isDarkMode={document.documentElement.classList.contains(
                    "dark",
                  )}
                  projectName={focusExperiment.title}
                  createdAt={new Date().toISOString()}
                  updatedAt={new Date().toISOString()}
                  experimentsCount={experimentsCount}
                  discoveryQueue={store.experiments.slice(0, 3)}
                  backlog={store.backlog}
                  insights={store.insights}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lab Whiteboard */}
      {hasEnteredLab && projectContext && (
        <LabWhiteboard
          isVisible={showWhiteboard}
          projectName={projectContext.projectName}
          onClose={() => setShowWhiteboard(false)}
          projectContext={{
            conversation: projectContext.conversation,
            track: recipeTrack,
            mode: labMode,
          }}
        />
      )}
    </div>
  );
}
