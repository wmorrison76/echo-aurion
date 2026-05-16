import React, { useState, useCallback } from "react";
import { ConversationalDialog } from "./ConversationalDialog";
import { ControlBar } from "./ControlBar";
import { IntegratedCodeEditor } from "./IntegratedCodeEditor";
import { FileInteractionVisualizer } from "./FileInteractionVisualizer";
import { CodeGenerationPanel } from "./CodeGenerationPanel";
import { DeploymentPanel } from "./DeploymentPanel";
import TechStackPanel from "./TechStackPanel";
import {
  orchestrator,
  WorkflowState,
  WorkflowCallbacks,
} from "@/services/AutoWorkflowOrchestrator";
import {
  fileInteractionAnalyzer,
  FileInteractionGraph,
} from "@/services/FileInteractionAnalyzer";
import {
  deploymentService,
  DeploymentStatus,
} from "@/services/DeploymentService";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { DialogUnderstanding } from "@/services/RealAIConversationService";

interface NewStudioLayoutProps {
  initialIdea?: string;
}

export const NewStudioLayout: React.FC<NewStudioLayoutProps> = ({
  initialIdea = "",
}) => {
  const [workflowState, setWorkflowState] = useState<WorkflowState>(
    orchestrator.getState(),
  );
  const [fileGraph, setFileGraph] = useState<FileInteractionGraph | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [layoutMode, setLayoutMode] = useState<"dialog-editor" | "full-code">(
    "dialog-editor",
  );
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusProgress, setStatusProgress] = useState<number>(0);
  const [currentUnderstanding, setCurrentUnderstanding] =
    useState<DialogUnderstanding | null>(null);
  const [showTechStack, setShowTechStack] = useState(false);
  const [showCodeGeneration, setShowCodeGeneration] = useState(false);
  const [selectedStack, setSelectedStack] = useState<{
    database: string;
    backend: string;
    frontend: string;
  } | null>(null);
  const [deploymentStatus, setDeploymentStatus] =
    useState<DeploymentStatus | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  // Setup workflow callbacks
  React.useEffect(() => {
    const callbacks: WorkflowCallbacks = {
      onPhaseChange: (phase) => {
        setWorkflowState((prev) => ({ ...prev, phase }));
      },
      onProgress: (message, progress) => {
        setStatusMessage(message);
        setStatusProgress(progress);
      },
      onFilesGenerated: (files) => {
        // Analyze file interactions
        const graph = fileInteractionAnalyzer.analyzeFiles(
          files.map((f) => ({
            path: f.path,
            content: f.content,
            type: f.type,
          })),
        );
        setFileGraph(graph);

        // Set first file as selected
        if (files.length > 0) {
          setSelectedFile(files[0].path);
        }
      },
      onError: (error) => {
        setStatusMessage(`Error: ${error}`);
      },
      onComplete: (state) => {
        setWorkflowState(state);
        setStatusMessage("System ready for deployment!");
      },
    };

    orchestrator.setCallbacks(callbacks);
  }, []);

  const handleGenerationStart = useCallback(async (plan: any) => {
    // plan contains: phase, idea, understanding (from ConversationalDialog)
    if (plan.understanding) {
      setCurrentUnderstanding(plan.understanding);
      setShowTechStack(true); // Show tech stack selection first
      setStatusMessage("Select tech stack for your project...");
    }
  }, []);

  const handleImplementation = useCallback(async (code: any) => {
    // Already triggered by generatePlan/autoImplement
  }, []);

  const handleGenerate = useCallback(async () => {
    if (workflowState.phase === "understanding") {
      await orchestrator.generatePlan();
      await orchestrator.autoImplement();
    }
  }, [workflowState.phase]);

  const handleFix = useCallback(async () => {
    if (statusMessage.includes("Error") || statusMessage.includes("error")) {
      await orchestrator.fixCurrentIssue(statusMessage);
    }
  }, [statusMessage]);

  const handleAnalyze = useCallback(async () => {
    await orchestrator.analyzeCode();
  }, []);

  const handleDeploy = useCallback(async () => {
    if (!workflowState.generatedFiles.length) {
      setStatusMessage("No files to deploy. Generate code first.");
      return;
    }

    setIsDeploying(true);
    setStatusMessage("Starting deployment...");

    try {
      const status = await deploymentService.deploy(
        workflowState.generatedFiles,
        {
          platform: "netlify",
          environment: "production",
          outputDirectory: "dist",
        },
        (updatedStatus) => {
          setDeploymentStatus(updatedStatus);
          setStatusProgress(updatedStatus.progress);
          setStatusMessage(
            updatedStatus.logs[updatedStatus.logs.length - 1]?.message ||
              "Deploying...",
          );
        },
      );

      setDeploymentStatus(status);
      setWorkflowState((prev) => ({ ...prev, phase: "complete" }));
      setStatusMessage("Deployment completed successfully!");
    } catch (error) {
      setStatusMessage(
        `Deployment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsDeploying(false);
    }
  }, [workflowState.generatedFiles]);

  const handleStackSelected = useCallback(
    (stack: { database: string; backend: string; frontend: string }) => {
      setSelectedStack(stack);
      setShowTechStack(false);
      setShowCodeGeneration(true);
      setStatusMessage("Generating code system based on selected tech stack...");
    },
    []
  );

  const handleUndo = useCallback(() => {
    orchestrator.reset();
    setWorkflowState(orchestrator.getState());
    setFileGraph(null);
    setStatusMessage("");
    setStatusProgress(0);
    setShowTechStack(false);
    setShowCodeGeneration(false);
    setSelectedStack(null);
  }, []);

  const editorFiles =
    workflowState.generatedFiles.map((f) => ({
      path: f.path,
      name: f.path.split("/").pop() || f.path,
      content: f.content,
      language: f.type === "sql" ? "sql" : "typescript",
      isDirty: false,
      isSaved: true,
    })) || [];

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Control Bar */}
      <ControlBar
        phase={workflowState.phase}
        isLoading={workflowState.isLoading || isDeploying}
        onGenerate={handleGenerate}
        onFix={handleFix}
        onAnalyze={handleAnalyze}
        onDeploy={handleDeploy}
        onUndo={handleUndo}
        canGenerate={
          workflowState.phase === "understanding" ||
          workflowState.phase === "planning"
        }
        canDeploy={
          workflowState.generatedFiles.length > 0 &&
          workflowState.phase === "implementation"
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex gap-0 relative z-10">
        {layoutMode === "dialog-editor" ? (
          <>
            {/* Left: Conversation Dialog - Minimized for more center space */}
            <div className="w-[12%] border-r border-border/50 overflow-hidden flex flex-col mt-12">
              <div className="flex-1 h-[75vh] overflow-hidden">
                <ConversationalDialog
                  onGenerationStart={handleGenerationStart}
                  onImplementation={handleImplementation}
                />
              </div>
            </div>

            {/* Right: Code Editor & Visualizer (88% - expanded) */}
            <div className="w-[88%] flex flex-col overflow-hidden">
              {deploymentStatus ? (
                <DeploymentPanel
                  status={deploymentStatus}
                  isDeploying={isDeploying}
                  onDeploy={(platform) => {
                    handleDeploy();
                  }}
                  onRollback={async () => {
                    if (deploymentStatus.id) {
                      await deploymentService.rollback(deploymentStatus.id);
                      setStatusMessage("Rollback completed");
                    }
                  }}
                  onMonitor={async () => {
                    if (deploymentStatus.deploymentUrl) {
                      const health = await deploymentService.monitorHealth(
                        deploymentStatus.deploymentUrl,
                      );
                      setStatusMessage(
                        `Health: ${health.status} (${health.responseTime}ms)`,
                      );
                    }
                  }}
                />
              ) : showTechStack && currentUnderstanding ? (
                <div className="w-full h-full overflow-auto">
                  <TechStackPanel
                    understanding={currentUnderstanding}
                    onStackSelected={handleStackSelected}
                  />
                </div>
              ) : showCodeGeneration && currentUnderstanding ? (
                <CodeGenerationPanel
                  understanding={currentUnderstanding}
                  onGenerationComplete={(files) => {
                    setWorkflowState((prev) => ({
                      ...prev,
                      generatedFiles: files,
                      phase: "implementation",
                    }));
                    setStatusMessage("Code generated successfully!");
                    // Analyze file interactions
                    const graph = fileInteractionAnalyzer.analyzeFiles(
                      files.map((f) => ({
                        path: f.path,
                        content: f.content,
                        type: f.type,
                      })),
                    );
                    setFileGraph(graph);
                    if (files.length > 0) {
                      setSelectedFile(files[0].path);
                    }
                  }}
                />
              ) : workflowState.generatedFiles.length > 0 ? (
                <div className="flex gap-0 h-full">
                  {/* Code Editor (60% of right panel) */}
                  <div className="w-3/5 overflow-hidden">
                    <IntegratedCodeEditor
                      files={editorFiles}
                      selectedFile={selectedFile}
                      onFileSelect={setSelectedFile}
                      onFileChange={(path, content) => {
                        // Handle file changes
                      }}
                      onFileSave={(path, content) => {
                        // Handle file save
                        setStatusMessage(`Saved: ${path}`);
                      }}
                    />
                  </div>

                  {/* File Interactions (40% of right panel) */}
                  <div className="w-2/5 overflow-hidden">
                    {fileGraph && (
                      <FileInteractionVisualizer
                        graph={fileGraph}
                        selectedFile={selectedFile}
                        onSelectFile={setSelectedFile}
                        onOpenFile={setSelectedFile}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-3 max-w-md px-8">
                    <div className="w-16 h-16 mx-auto bg-secondary/30 rounded-lg flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                    <p className="font-medium text-lg">Waiting for generation...</p>
                    <p className="text-sm leading-relaxed">
                      Answer the dialog questions to auto-generate your code
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Full Code Mode */
          <div className="w-full overflow-hidden">
            <IntegratedCodeEditor
              files={editorFiles}
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              onFileChange={(path, content) => {
                // Handle file changes
              }}
              onFileSave={(path, content) => {
                // Handle file save
              }}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      {(statusMessage || statusProgress > 0) && (
        <div className="border-t border-border/50 bg-card/50 backdrop-blur-sm px-4 py-3">
          <div className="flex items-center gap-4">
            {workflowState.isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
            )}
            {statusMessage.includes("Error") && (
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">
                {statusMessage}
              </p>
              {statusProgress > 0 && (
                <div className="w-full bg-secondary rounded h-1.5 mt-1 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all"
                    style={{ width: `${statusProgress}%` }}
                  />
                </div>
              )}
            </div>

            {statusProgress > 0 && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {statusProgress}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Errors Display */}
      {workflowState.errors.length > 0 && (
        <div className="border-t border-destructive/50 bg-destructive/5 px-4 py-3 max-h-32 overflow-y-auto">
          <p className="text-sm font-semibold text-destructive mb-2">
            Errors ({workflowState.errors.length}):
          </p>
          <div className="space-y-1 text-xs text-destructive/80">
            {workflowState.errors.map((error, idx) => (
              <p key={idx}>• {error}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewStudioLayout;
