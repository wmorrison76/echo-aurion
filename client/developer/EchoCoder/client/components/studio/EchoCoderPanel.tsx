useEffect(() => {
  const handler = (e: any) => {
    const payload = e.detail;
    console.log("[EchoCoder] Escalation received:", payload);

    // Example: preload editor state
    setInitialPrompt(payload.message);

    if (payload.suggestedFiles) {
      setSuggestedFiles(payload.suggestedFiles);
    }
  };

  window.addEventListener("echocoder:escalate", handler);
  return () => window.removeEventListener("echocoder:escalate", handler);
}, []);

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  Zap,
  FileCode,
  Cog,
  ChevronRight,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { generateModuleWithAI, fixModuleWithAI } from "@/services/echocoderAI";
import {
  applyChangeRequest,
  approveChangeRequest,
  createUpgradeRequest,
  listChangeRequests,
  runChangeChecks,
  ChangeRequest,
  ChangeType,
} from "@/services/echocoderChangeControl";
import {
  fetchCodebaseIndex,
  fetchCodeFile,
  IndexedFile,
} from "@/services/echocoderCodebase";
import { generateContextPlan, ContextPlanResponse } from "@/services/echocoderContext";
import { previewPatches, stagePatches, PatchPreview } from "@/services/echocoderPatch";
import {
  fetchVaultStatus,
  triggerVaultBackup,
  triggerVaultDrill,
  VaultEntry,
} from "@/services/echocoderVault";
import { runZaroMonitor, ZaroMonitorResult } from "@/services/echocoderZaroMonitor";

interface EchoCoderTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  action: string;
}

const TOOLS: EchoCoderTool[] = [
  {
    id: "scaffold",
    name: "Project Scaffolder",
    description: "Generate project structure and boilerplate code",
    icon: <FileCode className="h-5 w-5" />,
    action: "Generate new project scaffold with configured settings",
  },
  {
    id: "analyze",
    name: "Code Analyzer",
    description: "Analyze project structure and dependencies",
    icon: <Code2 className="h-5 w-5" />,
    action: "Analyze and visualize code dependencies",
  },
  {
    id: "optimize",
    name: "Performance Optimizer",
    description: "Optimize code for performance and bundle size",
    icon: <Zap className="h-5 w-5" />,
    action: "Run optimization analysis and suggestions",
  },
  {
    id: "config",
    name: "Configuration Manager",
    description: "Manage project configurations and environment variables",
    icon: <Cog className="h-5 w-5" />,
    action: "Configure build, deploy, and runtime settings",
  },
];

export default function EchoCoderPanel() {
  const [enabled, setEnabled] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [moduleDescription, setModuleDescription] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [moduleToFix, setModuleToFix] = useState("");
  const [fixError, setFixError] = useState("");
  const [generatedModule, setGeneratedModule] = useState<any>(null);
  const [tenantId, setTenantId] = useState(() => {
    try {
      return localStorage.getItem("echocoder.tenantId") || "";
    } catch {
      return "";
    }
  });
  const [changeType, setChangeType] = useState<ChangeType>("major");
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [changeLoading, setChangeLoading] = useState(false);
  const [upgradeTitle, setUpgradeTitle] = useState("");
  const [upgradeDescription, setUpgradeDescription] = useState("");
  const [codebaseIndex, setCodebaseIndex] = useState<IndexedFile[]>([]);
  const [codebaseFilter, setCodebaseFilter] = useState("");
  const [codebaseLoading, setCodebaseLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeFileContent, setActiveFileContent] = useState<string>("");
  const [activeFileTruncated, setActiveFileTruncated] = useState(false);
  const [contextPrompt, setContextPrompt] = useState("");
  const [contextPlanning, setContextPlanning] = useState(false);
  const [contextPlan, setContextPlan] = useState<ContextPlanResponse | null>(null);
  const [contextChangeRequestId, setContextChangeRequestId] = useState<string | null>(
    null,
  );
  const [patchPreview, setPatchPreview] = useState<PatchPreview[]>([]);
  const [patchPreviewLoading, setPatchPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(() => {
    try {
      const raw = localStorage.getItem("project.config");
      if (!raw) return "http://localhost:8080";
      const parsed = JSON.parse(raw);
      return parsed.devServerUrl || "http://localhost:8080";
    } catch {
      return "http://localhost:8080";
    }
  });
  const [previewMode, setPreviewMode] = useState<"base" | "tenant">("base");
  const [agentPlanning, setAgentPlanning] = useState(false);
  const [agentPlannerPrompt, setAgentPlannerPrompt] = useState("");
  const [agentCoderPrompt, setAgentCoderPrompt] = useState("");
  const [agentReviewerPrompt, setAgentReviewerPrompt] = useState("");
  const [agentResults, setAgentResults] = useState<
    Record<string, ContextPlanResponse | null>
  >({
    planner: null,
    coder: null,
    reviewer: null,
  });
  const [mergedAgentPatches, setMergedAgentPatches] = useState<
    Array<{ path: string; content?: string; source: string }>
  >([]);
  const [agentChangeRequestId, setAgentChangeRequestId] = useState<string | null>(
    null,
  );
  const [vaultStatus, setVaultStatus] = useState<{
    local: VaultEntry[];
    offsite: VaultEntry[];
  }>({ local: [], offsite: [] });
  const [vaultLoading, setVaultLoading] = useState(false);
  const [zaroMonitorResult, setZaroMonitorResult] =
    useState<ZaroMonitorResult | null>(null);
  const [zaroMonitoring, setZaroMonitoring] = useState(false);

  useEffect(() => {
    const isEnabled = localStorage.getItem("echocoder.enabled") === "true";
    setEnabled(isEnabled);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("echocoder.tenantId", tenantId);
    } catch {}
  }, [tenantId]);

  const refreshChangeRequests = async () => {
    setChangeLoading(true);
    try {
      const requests = await listChangeRequests();
      setChangeRequests(requests);
    } catch (error) {
      toast({
        title: "Failed to load change requests",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setChangeLoading(false);
    }
  };

  const refreshCodebaseIndex = async () => {
    setCodebaseLoading(true);
    try {
      const files = await fetchCodebaseIndex();
      setCodebaseIndex(files);
    } catch (error) {
      toast({
        title: "Failed to load codebase index",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCodebaseLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      refreshChangeRequests();
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      refreshCodebaseIndex();
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      refreshVaultStatus();
    }
  }, [enabled]);

  const handleSelectFile = async (filePath: string) => {
    setActiveFile(filePath);
    try {
      const file = await fetchCodeFile(filePath);
      setActiveFileContent(file.content);
      setActiveFileTruncated(file.truncated);
    } catch (error) {
      toast({
        title: "Failed to load file",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const toggleSelectedFile = (filePath: string) => {
    setSelectedFiles((prev) =>
      prev.includes(filePath)
        ? prev.filter((item) => item !== filePath)
        : [...prev, filePath],
    );
  };

  const handleGenerateContextPlan = async () => {
    if (!contextPrompt.trim()) {
      toast({
        title: "Missing prompt",
        description: "Describe what you want EchoCoder to build or change.",
        variant: "destructive",
      });
      return;
    }
    if (selectedFiles.length === 0) {
      toast({
        title: "No context selected",
        description: "Select at least one file to provide context.",
        variant: "destructive",
      });
      return;
    }
    setContextPlanning(true);
    try {
      const files = await Promise.all(
        selectedFiles.map(async (filePath) => {
          const file = await fetchCodeFile(filePath);
          return {
            path: filePath,
            content: file.content,
            truncated: file.truncated,
          };
        }),
      );
      const response = await generateContextPlan({
        prompt: contextPrompt.trim(),
        files,
      });
      setContextPlan(response);
      toast({
        title: "Plan generated",
        description: "EchoCoder produced a plan with proposed patches.",
      });
    } catch (error) {
      toast({
        title: "Plan generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setContextPlanning(false);
    }
  };

  const handleCreateContextChangeRequest = async () => {
    if (!tenantId.trim()) {
      toast({
        title: "Missing tenant",
        description: "Select a tenant before creating a change request.",
        variant: "destructive",
      });
      return;
    }
    if (!contextPlan) {
      toast({
        title: "No plan available",
        description: "Generate a plan before creating a change request.",
        variant: "destructive",
      });
      return;
    }
    setChangeLoading(true);
    try {
      const title = contextPlan.summary || "Context plan changes";
      const description = contextPlan.plan || "Context plan requested changes.";
      const created = await createUpgradeRequest({
        tenantId: tenantId.trim(),
        changeType,
        title,
        description,
      });
      setContextChangeRequestId(created.id);
      setChangeRequests((prev) => [created, ...prev]);
      toast({
        title: "Change request created",
        description: `Change request ${created.id} ready for staging.`,
      });
    } catch (error) {
      toast({
        title: "Change request failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setChangeLoading(false);
    }
  };

  const handlePreviewPatches = async () => {
    if (!contextPlan?.patches || contextPlan.patches.length === 0) {
      toast({
        title: "No patches found",
        description: "The plan does not include patches with content.",
        variant: "destructive",
      });
      return;
    }
    const patchesWithContent = contextPlan.patches.filter(
      (patch) => patch.path && patch.content,
    ) as Array<{ path: string; content: string }>;
    if (patchesWithContent.length === 0) {
      toast({
        title: "No patch content",
        description: "The plan did not return patch content.",
        variant: "destructive",
      });
      return;
    }
    setPatchPreviewLoading(true);
    try {
      const previews = await previewPatches({
        tenantId: tenantId.trim() || undefined,
        patches: patchesWithContent,
      });
      setPatchPreview(previews);
      toast({
        title: "Patch preview ready",
        description: "Review before staging.",
      });
    } catch (error) {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPatchPreviewLoading(false);
    }
  };

  const handleStagePatches = async () => {
    if (!contextChangeRequestId) {
      toast({
        title: "No change request",
        description: "Create a change request before staging patches.",
        variant: "destructive",
      });
      return;
    }
    if (!contextPlan?.patches || contextPlan.patches.length === 0) {
      toast({
        title: "No patches found",
        description: "The plan does not include patches with content.",
        variant: "destructive",
      });
      return;
    }
    const patchesWithContent = contextPlan.patches.filter(
      (patch) => patch.path && patch.content,
    ) as Array<{ path: string; content: string }>;
    if (patchesWithContent.length === 0) {
      toast({
        title: "No patch content",
        description: "The plan did not return patch content.",
        variant: "destructive",
      });
      return;
    }
    setChangeLoading(true);
    try {
      const staged = await stagePatches({
        changeRequestId: contextChangeRequestId,
        patches: patchesWithContent,
      });
      if (staged?.changeRequest) {
        setChangeRequests((prev) =>
          prev.map((req) =>
            req.id === staged.changeRequest.id ? staged.changeRequest : req,
          ),
        );
      }
      toast({
        title: "Patches staged",
        description: "Run checks and approve to apply.",
      });
    } catch (error) {
      toast({
        title: "Staging failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setChangeLoading(false);
    }
  };

  const runAgentPlans = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No context selected",
        description: "Select files before running agent workflows.",
        variant: "destructive",
      });
      return;
    }
    const prompts = {
      planner: agentPlannerPrompt.trim(),
      coder: agentCoderPrompt.trim(),
      reviewer: agentReviewerPrompt.trim(),
    };
    if (!prompts.planner && !prompts.coder && !prompts.reviewer) {
      toast({
        title: "No agent prompts",
        description: "Provide at least one agent prompt to run.",
        variant: "destructive",
      });
      return;
    }
    setAgentPlanning(true);
    try {
      const files = await Promise.all(
        selectedFiles.map(async (filePath) => {
          const file = await fetchCodeFile(filePath);
          return {
            path: filePath,
            content: file.content,
            truncated: file.truncated,
          };
        }),
      );
      const entries = await Promise.all(
        Object.entries(prompts)
          .filter(([, value]) => value)
          .map(async ([agent, prompt]) => {
            const result = await generateContextPlan({
              prompt,
              files,
            });
            return [agent, result] as const;
          }),
      );

      const updated: Record<string, ContextPlanResponse | null> = {
        planner: null,
        coder: null,
        reviewer: null,
      };
      entries.forEach(([agent, result]) => {
        updated[agent] = result;
      });
      setAgentResults(updated);

      const priority = ["reviewer", "coder", "planner"];
      const patchMap = new Map<string, { content?: string; source: string }>();
      priority.forEach((agent) => {
        const res = updated[agent];
        if (!res?.patches) return;
        res.patches.forEach((patch) => {
          if (!patch.path || !patch.content) return;
          if (!patchMap.has(patch.path)) {
            patchMap.set(patch.path, { content: patch.content, source: agent });
          }
        });
      });

      const merged = Array.from(patchMap.entries()).map(([path, data]) => ({
        path,
        content: data.content,
        source: data.source,
      }));
      setMergedAgentPatches(merged);
      toast({
        title: "Agent plans complete",
        description: `Merged ${merged.length} patches from agents.`,
      });
    } catch (error) {
      toast({
        title: "Agent planning failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAgentPlanning(false);
    }
  };

  const createAgentChangeRequest = async () => {
    if (!tenantId.trim()) {
      toast({
        title: "Missing tenant",
        description: "Select a tenant before creating a change request.",
        variant: "destructive",
      });
      return;
    }
    if (mergedAgentPatches.length === 0) {
      toast({
        title: "No merged patches",
        description: "Run agent workflows before staging patches.",
        variant: "destructive",
      });
      return;
    }
    setChangeLoading(true);
    try {
      const created = await createUpgradeRequest({
        tenantId: tenantId.trim(),
        changeType,
        title: "Multi-agent change set",
        description:
          "Merged patches from Planner/Coder/Reviewer workflows.",
      });
      setAgentChangeRequestId(created.id);
      setChangeRequests((prev) => [created, ...prev]);
      toast({
        title: "Change request created",
        description: `Change request ${created.id} ready for staging.`,
      });
    } catch (error) {
      toast({
        title: "Change request failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setChangeLoading(false);
    }
  };

  const stageAgentPatches = async () => {
    if (!agentChangeRequestId) {
      toast({
        title: "No change request",
        description: "Create a change request before staging patches.",
        variant: "destructive",
      });
      return;
    }
    if (mergedAgentPatches.length === 0) {
      toast({
        title: "No patches to stage",
        description: "Run agent workflows before staging patches.",
        variant: "destructive",
      });
      return;
    }
    setChangeLoading(true);
    try {
      const staged = await stagePatches({
        changeRequestId: agentChangeRequestId,
        patches: mergedAgentPatches.map((patch) => ({
          path: patch.path,
          content: patch.content || "",
        })),
      });
      if (staged?.changeRequest) {
        setChangeRequests((prev) =>
          prev.map((req) =>
            req.id === staged.changeRequest.id ? staged.changeRequest : req,
          ),
        );
      }
      toast({
        title: "Patches staged",
        description: "Run checks and approve to apply.",
      });
    } catch (error) {
      toast({
        title: "Staging failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setChangeLoading(false);
    }
  };

  const refreshVaultStatus = async () => {
    setVaultLoading(true);
    try {
      const status = await fetchVaultStatus();
      setVaultStatus(status);
    } catch (error) {
      toast({
        title: "Vault status failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setVaultLoading(false);
    }
  };

  const handleVaultBackup = async () => {
    setVaultLoading(true);
    try {
      await triggerVaultBackup();
      await refreshVaultStatus();
      toast({
        title: "Vault backup complete",
        description: "Local and offsite vault entries updated.",
      });
    } catch (error) {
      toast({
        title: "Vault backup failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setVaultLoading(false);
    }
  };

  const handleVaultDrill = async () => {
    setVaultLoading(true);
    try {
      const result = await triggerVaultDrill();
      toast({
        title: "Restore drill complete",
        description: `Duration: ${result.result?.durationMs || 0}ms`,
      });
    } catch (error) {
      toast({
        title: "Restore drill failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setVaultLoading(false);
    }
  };

  const handleZaroMonitor = async () => {
    setZaroMonitoring(true);
    try {
      const result = await runZaroMonitor();
      setZaroMonitorResult(result);
      toast({
        title: result.alertTriggered ? "Anomaly detected" : "Monitor complete",
        description: `Changes detected: ${result.changesCount}`,
      });
    } catch (error) {
      toast({
        title: "Monitor failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setZaroMonitoring(false);
    }
  };

  const handleGenerateModule = async () => {
    if (!moduleName.trim() || !moduleDescription.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both module name and description",
        variant: "destructive",
      });
      return;
    }
    if (!tenantId.trim()) {
      toast({
        title: "Missing tenant",
        description: "Please select a tenant before generating modules",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const result = await generateModuleWithAI({
        moduleName: moduleName.trim(),
        description: moduleDescription.trim(),
        changeControl: {
          tenantId: tenantId.trim(),
          changeType,
          title: `Generate module ${moduleName.trim()}`,
          description: moduleDescription.trim(),
        },
      });

      setGeneratedModule(result);
      toast({
        title: "Module staged",
        description: `Change request created for ${result.moduleName}. Run checks before apply.`,
      });

      setModuleDescription("");
      setModuleName("");
      refreshChangeRequests();
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleFixModule = async () => {
    if (!moduleToFix.trim() || !fixError.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter module name and error description",
        variant: "destructive",
      });
      return;
    }
    if (!tenantId.trim()) {
      toast({
        title: "Missing tenant",
        description: "Please select a tenant before fixing modules",
        variant: "destructive",
      });
      return;
    }

    setFixing(true);
    try {
      const result = await fixModuleWithAI(moduleToFix.trim(), fixError.trim(), {
        tenantId: tenantId.trim(),
        changeType,
        title: `Fix module ${moduleToFix.trim()}`,
        description: fixError.trim(),
      });

      toast({
        title: "Fix staged",
        description: `${result.moduleName} fix staged for review.`,
      });

      setModuleToFix("");
      setFixError("");
      refreshChangeRequests();
    } catch (error) {
      toast({
        title: "Fix failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setFixing(false);
    }
  };

  const handleRunChecks = async (id: string) => {
    setChangeLoading(true);
    try {
      const updated = await runChangeChecks(id);
      setChangeRequests((prev) =>
        prev.map((req) => (req.id === updated.id ? updated : req)),
      );
      toast({
        title: "Checks completed",
        description: `Status: ${updated.status.replace("_", " ")}`,
      });
    } catch (error) {
      toast({
        title: "Check run failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setChangeLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setChangeLoading(true);
    try {
      const updated = await approveChangeRequest(id);
      setChangeRequests((prev) =>
        prev.map((req) => (req.id === updated.id ? updated : req)),
      );
      toast({
        title: "Change approved",
        description: `Change ${updated.id} approved.`,
      });
    } catch (error) {
      toast({
        title: "Approval failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setChangeLoading(false);
    }
  };

  const handleApply = async (id: string) => {
    setChangeLoading(true);
    try {
      const updated = await applyChangeRequest(id);
      setChangeRequests((prev) =>
        prev.map((req) => (req.id === updated.id ? updated : req)),
      );
      toast({
        title: "Change applied",
        description: `Applied ${updated.appliedPaths.length} files.`,
      });
    } catch (error) {
      toast({
        title: "Apply failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setChangeLoading(false);
    }
  };

  const handleUpgradeRequest = async () => {
    if (!tenantId.trim() || !upgradeTitle.trim() || !upgradeDescription.trim()) {
      toast({
        title: "Missing information",
        description: "Provide tenant, title, and description for upgrade request",
        variant: "destructive",
      });
      return;
    }
    setChangeLoading(true);
    try {
      const created = await createUpgradeRequest({
        tenantId: tenantId.trim(),
        changeType,
        title: upgradeTitle.trim(),
        description: upgradeDescription.trim(),
      });
      setUpgradeTitle("");
      setUpgradeDescription("");
      setChangeRequests((prev) => [created, ...prev]);
      toast({
        title: "Upgrade request created",
        description: `Request ${created.id} staged for checks.`,
      });
    } catch (error) {
      toast({
        title: "Upgrade request failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setChangeLoading(false);
    }
  };

  if (!enabled) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            EchoCoder
          </CardTitle>
          <CardDescription>Backend developer tool</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            EchoCoder is currently disabled. Enable it from Settings to access
            backend development tools.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.setItem("echocoder.enabled", "true");
              setEnabled(true);
              toast({
                title: "EchoCoder Enabled",
                description: "Backend tools are now available",
              });
            }}
          >
            Enable EchoCoder
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-cyan-500" />
            <div>
              <CardTitle>EchoCoder Backend Tools</CardTitle>
              <CardDescription>
                AI-powered code generation & module builder
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">Enabled</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="fix">Fix</TabsTrigger>
            <TabsTrigger value="codebase">Codebase</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="change-control">Change Control</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
          </TabsList>

          {/* Generate Module Tab */}
          <TabsContent value="generate" className="space-y-3 mt-4">
            <div className="space-y-3">
              <div className="rounded border border-border/60 bg-accent/10 p-3 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Change Control
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Tenant ID</label>
                  <Input
                    placeholder="client-acme-hospitality"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="mt-1"
                    disabled={generating}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Change Type</label>
                  <select
                    value={changeType}
                    onChange={(e) => setChangeType(e.target.value as ChangeType)}
                    className="mt-1 rounded border border-border bg-background px-2 py-2 text-sm"
                    disabled={generating}
                  >
                    <option value="major">Major (audit + security + smoke)</option>
                    <option value="cosmetic">Cosmetic (smoke + approval)</option>
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Major changes require audit + security + smoke tests before approval.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Module Name</label>
                <Input
                  placeholder="e.g., Analytics, Notifications, etc."
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="mt-1"
                  disabled={generating}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe what this module should do. Include features, data structure, and UI preferences."
                  value={moduleDescription}
                  onChange={(e) => setModuleDescription(e.target.value)}
                  className="mt-1 min-h-[100px]"
                  disabled={generating}
                />
              </div>

              <Button
                onClick={handleGenerateModule}
                disabled={generating}
                className="w-full"
              >
                {generating && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {generating ? "Generating..." : "Generate Module"}
              </Button>

              {generatedModule && (
                <div className="p-3 rounded bg-green-900/30 border border-green-700">
                  <p className="text-sm font-medium text-green-300">
                    ✓ Module Staged
                  </p>
                  <p className="text-xs text-green-200 mt-1">
                    {generatedModule.moduleName} staged for tenant{" "}
                    {tenantId || "unknown"}.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Fix Module Tab */}
          <TabsContent value="fix" className="space-y-3 mt-4">
            <div className="space-y-3">
              <div className="rounded border border-border/60 bg-accent/10 p-3 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Change Control
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Tenant ID</label>
                  <Input
                    placeholder="client-acme-hospitality"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="mt-1"
                    disabled={fixing}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Change Type</label>
                  <select
                    value={changeType}
                    onChange={(e) => setChangeType(e.target.value as ChangeType)}
                    className="mt-1 rounded border border-border bg-background px-2 py-2 text-sm"
                    disabled={fixing}
                  >
                    <option value="major">Major (audit + security + smoke)</option>
                    <option value="cosmetic">Cosmetic (smoke + approval)</option>
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cosmetic changes still require smoke tests and system approval.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Module Name</label>
                <Input
                  placeholder="Name of the module to fix"
                  value={moduleToFix}
                  onChange={(e) => setModuleToFix(e.target.value)}
                  className="mt-1"
                  disabled={fixing}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Error or Issue</label>
                <Textarea
                  placeholder="Describe the error or issue you're experiencing with this module."
                  value={fixError}
                  onChange={(e) => setFixError(e.target.value)}
                  className="mt-1 min-h-[100px]"
                  disabled={fixing}
                />
              </div>

              <Button
                onClick={handleFixModule}
                disabled={fixing}
                variant="secondary"
                className="w-full"
              >
                {fixing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {fixing ? "Fixing..." : "Fix Module"}
              </Button>

              <div className="p-3 rounded bg-blue-900/30 border border-blue-700">
                <div className="flex gap-2 items-start">
                  <AlertCircle className="h-4 w-4 text-blue-300 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-200">
                    EchoCoder will analyze the issue and fix the code
                    automatically.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Codebase Tab */}
          <TabsContent value="codebase" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Codebase Context</div>
                <div className="text-xs text-muted-foreground">
                  Select files to build context for EchoCoder prompts.
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={refreshCodebaseIndex}
                disabled={codebaseLoading}
              >
                {codebaseLoading ? "Refreshing..." : "Refresh Index"}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="space-y-3">
                <Input
                  placeholder="Filter by path or extension"
                  value={codebaseFilter}
                  onChange={(e) => setCodebaseFilter(e.target.value)}
                />
                <div className="h-[360px] overflow-auto rounded border border-border/60 bg-background/60 p-2 space-y-2">
                  {codebaseIndex
                    .filter((file) => {
                      const query = codebaseFilter.trim().toLowerCase();
                      if (!query) return true;
                      return (
                        file.path.toLowerCase().includes(query) ||
                        file.extension.toLowerCase().includes(query)
                      );
                    })
                    .slice(0, 200)
                    .map((file) => (
                      <button
                        key={file.path}
                        onClick={() => handleSelectFile(file.path)}
                        onDoubleClick={() => toggleSelectedFile(file.path)}
                        className={`w-full text-left rounded px-2 py-1 text-xs transition ${
                          activeFile === file.path
                            ? "bg-primary/20 text-foreground"
                            : "hover:bg-accent/30 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{file.path}</span>
                          <span className="ml-2 text-[10px] uppercase">
                            {file.extension}
                          </span>
                        </div>
                      </button>
                    ))}
                  {codebaseIndex.length === 0 && (
                    <div className="text-xs text-muted-foreground">
                      No files indexed yet.
                    </div>
                  )}
                </div>
                <div className="rounded border border-border/60 bg-accent/10 p-2 space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Selected Context
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedFiles.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        No files selected.
                      </span>
                    ) : (
                      selectedFiles.map((file) => (
                        <button
                          key={file}
                          onClick={() => toggleSelectedFile(file)}
                          className="rounded bg-primary/10 px-2 py-1 text-[11px] text-primary"
                        >
                          {file.split("/").pop()}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    File Preview
                  </div>
                  {activeFile && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleSelectedFile(activeFile)}
                    >
                      {selectedFiles.includes(activeFile)
                        ? "Remove Context"
                        : "Add Context"}
                    </Button>
                  )}
                </div>
                <div className="h-[420px] overflow-auto rounded border border-border/60 bg-black/60 p-3 text-[11px] text-green-200 font-mono whitespace-pre-wrap">
                  {activeFileContent || "Select a file to preview its content."}
                </div>
                {activeFileTruncated && (
                  <div className="text-[11px] text-muted-foreground">
                    Preview truncated for large file.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded border border-border/60 bg-accent/10 p-3 space-y-3">
              <div className="text-sm font-semibold">Context Prompt</div>
              <Textarea
                placeholder="Describe the feature or change you want EchoCoder to plan."
                value={contextPrompt}
                onChange={(e) => setContextPrompt(e.target.value)}
                className="min-h-[120px]"
              />
              <Button
                onClick={handleGenerateContextPlan}
                disabled={contextPlanning}
              >
                {contextPlanning ? "Planning..." : "Generate Plan"}
              </Button>
              {contextPlan && (
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground">
                      Summary:
                    </span>{" "}
                    {contextPlan.summary || "No summary returned."}
                  </div>
                  <div className="whitespace-pre-wrap">
                    {contextPlan.plan || "No plan returned."}
                  </div>
                  {contextPlan.patches && contextPlan.patches.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground">
                        Proposed Patches
                      </div>
                      {contextPlan.patches.map((patch, index) => (
                        <div key={`${patch.path}-${index}`}>
                          {patch.path}
                          {patch.rationale ? ` — ${patch.rationale}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleCreateContextChangeRequest}
                  disabled={changeLoading || !contextPlan}
                >
                  {contextChangeRequestId
                    ? `Change Request: ${contextChangeRequestId}`
                    : "Create Change Request"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePreviewPatches}
                  disabled={patchPreviewLoading || !contextPlan}
                >
                  {patchPreviewLoading ? "Previewing..." : "Preview Patches"}
                </Button>
                <Button
                  onClick={handleStagePatches}
                  disabled={changeLoading || !contextPlan}
                >
                  Stage Patches
                </Button>
              </div>
              {patchPreview.length > 0 && (
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">
                    Patch Preview
                  </div>
                  {patchPreview.map((preview) => (
                    <div
                      key={preview.path}
                      className="rounded border border-border/60 bg-background/60 p-2 space-y-2"
                    >
                      <div className="text-[11px] text-foreground">
                        {preview.path}
                      </div>
                      {preview.error ? (
                        <div className="text-xs text-red-400">
                          {preview.error}
                        </div>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-2">
                          <div>
                            <div className="text-[10px] uppercase text-muted-foreground">
                              Before
                            </div>
                            <pre className="max-h-40 overflow-auto rounded bg-black/60 p-2 text-[10px] text-green-200">
                              {preview.before || "(empty)"}
                            </pre>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-muted-foreground">
                              After
                            </div>
                            <pre className="max-h-40 overflow-auto rounded bg-black/60 p-2 text-[10px] text-green-200">
                              {preview.after || "(empty)"}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4 mt-4">
            <div className="rounded border border-border/60 bg-accent/10 p-3 space-y-3">
              <div className="text-sm font-semibold">Live Preview</div>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Preview URL</label>
                  <Input
                    value={previewUrl}
                    onChange={(e) => setPreviewUrl(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Mode</label>
                  <select
                    value={previewMode}
                    onChange={(e) =>
                      setPreviewMode(e.target.value as "base" | "tenant")
                    }
                    className="mt-1 w-full rounded border border-border bg-background px-2 py-2 text-sm"
                  >
                    <option value="base">Base</option>
                    <option value="tenant">Tenant Overlay</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(previewUrl, "_blank", "noopener")}
                >
                  Open Preview
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setPreviewUrl((value) =>
                      value.includes("?")
                        ? `${value}&tenant=${encodeURIComponent(tenantId || "default")}&mode=${previewMode}`
                        : `${value}?tenant=${encodeURIComponent(tenantId || "default")}&mode=${previewMode}`,
                    )
                  }
                >
                  Append Tenant Params
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Tenant overlay mode appends query params for preview routing.
              </div>
            </div>
            <div className="rounded border border-border/60 overflow-hidden">
              <iframe
                title="EchoCoder Live Preview"
                src={previewUrl}
                className="h-[520px] w-full bg-black"
              />
            </div>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-4 mt-4">
            <div className="rounded border border-border/60 bg-accent/10 p-3 space-y-3">
              <div className="text-sm font-semibold">Multi-Agent Workflow</div>
              <div className="text-xs text-muted-foreground">
                Run Planner, Coder, and Reviewer in parallel with shared context.
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Planner
                  </div>
                  <Textarea
                    placeholder="Planner goals, scope, and constraints"
                    value={agentPlannerPrompt}
                    onChange={(e) => setAgentPlannerPrompt(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Coder
                  </div>
                  <Textarea
                    placeholder="Coder instructions for implementation"
                    value={agentCoderPrompt}
                    onChange={(e) => setAgentCoderPrompt(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Reviewer
                  </div>
                  <Textarea
                    placeholder="Reviewer guidance: risks, edge cases, tests"
                    value={agentReviewerPrompt}
                    onChange={(e) => setAgentReviewerPrompt(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
              </div>
              <Button onClick={runAgentPlans} disabled={agentPlanning}>
                {agentPlanning ? "Running agents..." : "Run Agents"}
              </Button>
            </div>

            <div className="rounded border border-border/60 bg-accent/10 p-3 space-y-3">
              <div className="text-sm font-semibold">Merged Output</div>
              <div className="text-xs text-muted-foreground">
                Reviewer > Coder > Planner priority for patch conflicts.
              </div>
              {mergedAgentPatches.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  Run agents to see merged patches.
                </div>
              ) : (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {mergedAgentPatches.map((patch) => (
                    <div key={patch.path}>
                      {patch.path} — {patch.source}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={createAgentChangeRequest}
                  disabled={changeLoading || mergedAgentPatches.length === 0}
                >
                  {agentChangeRequestId
                    ? `Change Request: ${agentChangeRequestId}`
                    : "Create Change Request"}
                </Button>
                <Button
                  onClick={stageAgentPatches}
                  disabled={changeLoading || mergedAgentPatches.length === 0}
                >
                  Stage Merged Patches
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 text-xs text-muted-foreground">
              {Object.entries(agentResults).map(([agent, result]) => (
                <div
                  key={agent}
                  className="rounded border border-border/60 bg-background/60 p-2 space-y-2"
                >
                  <div className="text-[11px] uppercase text-muted-foreground">
                    {agent}
                  </div>
                  <div className="text-xs text-foreground">
                    {result?.summary || "No summary yet."}
                  </div>
                  <div className="whitespace-pre-wrap text-[11px]">
                    {result?.plan || ""}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Change Control Tab */}
          <TabsContent value="change-control" className="space-y-4 mt-4">
            <div className="rounded border border-border/60 bg-accent/10 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Change Requests</div>
                  <div className="text-xs text-muted-foreground">
                    Run checks, approve, and apply without touching client profiles prematurely.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refreshChangeRequests}
                  disabled={changeLoading}
                >
                  {changeLoading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
              {changeRequests.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  No change requests yet. Generate or fix a module to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {changeRequests.map((req) => (
                    <div
                      key={req.id}
                      className="rounded border border-border/60 bg-background/60 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold">{req.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Tenant: {req.tenantId} • {req.operation} • {req.changeType}
                          </div>
                        </div>
                        <Badge variant="secondary">{req.status.replace("_", " ")}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {req.description}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {req.requiredChecks.map((check) => (
                          <span
                            key={check}
                            className="rounded border border-border/60 bg-accent/20 px-2 py-1"
                          >
                            {check}: {req.checks[check]?.status || "pending"}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRunChecks(req.id)}
                          disabled={changeLoading || req.status === "applied"}
                        >
                          Run Checks
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req.id)}
                          disabled={changeLoading || req.status !== "ready_for_approval"}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleApply(req.id)}
                          disabled={changeLoading || req.status !== "approved"}
                        >
                          Apply to Tenant
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded border border-border/60 bg-accent/10 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Doomsday Vault</div>
                  <div className="text-xs text-muted-foreground">
                    Encrypted backups with local + offsite retention.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refreshVaultStatus}
                  disabled={vaultLoading}
                >
                  {vaultLoading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={handleVaultBackup}
                  disabled={vaultLoading}
                >
                  Run Backup
                </Button>
                <Button
                  variant="outline"
                  onClick={handleVaultDrill}
                  disabled={vaultLoading}
                >
                  Run Restore Drill
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 text-xs text-muted-foreground">
                <div className="rounded border border-border/60 bg-background/60 p-2">
                  <div className="text-[11px] uppercase">Local Vault</div>
                  {vaultStatus.local.length === 0 ? (
                    <div>No local backups yet.</div>
                  ) : (
                    vaultStatus.local.slice(0, 3).map((entry) => (
                      <div key={entry.id}>
                        {entry.id} • {(entry.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </div>
                    ))
                  )}
                </div>
                <div className="rounded border border-border/60 bg-background/60 p-2">
                  <div className="text-[11px] uppercase">Offsite Vault</div>
                  {vaultStatus.offsite.length === 0 ? (
                    <div>No offsite backups yet.</div>
                  ) : (
                    vaultStatus.offsite.slice(0, 3).map((entry) => (
                      <div key={entry.id}>
                        {entry.id} • {(entry.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded border border-border/60 bg-accent/10 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">ZARO Monitoring</div>
                  <div className="text-xs text-muted-foreground">
                    Detect unexpected file changes and trigger guard alerts.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleZaroMonitor}
                  disabled={zaroMonitoring}
                >
                  {zaroMonitoring ? "Monitoring..." : "Run Monitor"}
                </Button>
              </div>
              {zaroMonitorResult ? (
                <div className="text-xs text-muted-foreground">
                  Changes: {zaroMonitorResult.changesCount} • Alert:{" "}
                  {zaroMonitorResult.alertTriggered ? "Triggered" : "None"}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No monitoring results yet.
                </div>
              )}
            </div>

            <div className="rounded border border-border/60 bg-accent/10 p-3 space-y-3">
              <div className="text-sm font-semibold">System Upgrade Request</div>
              <div className="text-xs text-muted-foreground">
                Use this for version upgrades that require audit, security, and smoke tests.
              </div>
              <Input
                placeholder="Upgrade title (e.g., Inventory v2.3 migration)"
                value={upgradeTitle}
                onChange={(e) => setUpgradeTitle(e.target.value)}
              />
              <Textarea
                placeholder="Describe the upgrade scope, risk, and expected outcome."
                value={upgradeDescription}
                onChange={(e) => setUpgradeDescription(e.target.value)}
                className="min-h-[90px]"
              />
              <Button onClick={handleUpgradeRequest} disabled={changeLoading}>
                Create Upgrade Request
              </Button>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-3 mt-4">
            {TOOLS.map((tool) => (
              <Dialog key={tool.id}>
                <DialogTrigger asChild>
                  <button className="w-full text-left p-3 rounded border border-border hover:bg-accent/40 transition group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-muted-foreground group-hover:text-foreground transition mt-1">
                          {tool.icon}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tool.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition flex-shrink-0 mt-1" />
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      {tool.icon}
                      {tool.name}
                    </DialogTitle>
                    <DialogDescription>{tool.description}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 rounded bg-accent/20 border border-border">
                      <p className="text-sm font-medium mb-2">Action</p>
                      <p className="text-sm text-muted-foreground">
                        {tool.action}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(tool.action);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                          toast({
                            title: "Copied",
                            description: "Action copied to clipboard",
                          });
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button className="flex-1">Execute</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </TabsContent>

          <TabsContent value="docs" className="space-y-3 mt-4">
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded bg-accent/20 border border-border">
                <h4 className="font-medium mb-2">Project Scaffolder</h4>
                <p className="text-muted-foreground text-xs">
                  Generates complete project structure with boilerplate code,
                  configuration files, and documentation templates.
                </p>
              </div>
              <div className="p-3 rounded bg-accent/20 border border-border">
                <h4 className="font-medium mb-2">Code Analyzer</h4>
                <p className="text-muted-foreground text-xs">
                  Analyzes your codebase to identify dependencies, file
                  connections, and structural patterns.
                </p>
              </div>
              <div className="p-3 rounded bg-accent/20 border border-border">
                <h4 className="font-medium mb-2">Performance Optimizer</h4>
                <p className="text-muted-foreground text-xs">
                  Provides recommendations for code optimization, bundle size
                  reduction, and performance improvements.
                </p>
              </div>
              <div className="p-3 rounded bg-accent/20 border border-border">
                <h4 className="font-medium mb-2">Configuration Manager</h4>
                <p className="text-muted-foreground text-xs">
                  Manages build configurations, environment variables,
                  deployment settings, and runtime options.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Button variant="ghost" size="sm" className="w-full" asChild>
          <a href="/settings?tab=tools">Configure EchoCoder Settings</a>
        </Button>
      </CardContent>
    </Card>
  );
}
