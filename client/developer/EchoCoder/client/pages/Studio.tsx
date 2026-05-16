import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mergeControlClasses } from "@/components/ui/control-styles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  canEditEngine as roleCanEditEngine,
  normalizeRole as normalizeEngineRole,
} from "../../lib/security/roles";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
  type Dispatch,
  type SetStateAction,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useBreakpoint } from "@/components/layout";
const ScorecardPanel = lazy(() => import("@/components/studio/ScorecardPanel"));
import AutomationPanel from "@/components/studio/AutomationPanel";
import { Tier1EnterprisePanel } from "@/components/studio/Tier1EnterprisePanel";
import { Tier2EnterprisePanel } from "@/components/studio/Tier2EnterprisePanel";
import { Tier3EnterprisePanel } from "@/components/studio/Tier3EnterprisePanel";
import { Tier4EnterprisePanel } from "@/components/studio/Tier4EnterprisePanel";
import { SmartSidebar } from "@/components/studio/SmartSidebar";
import { WorkflowCenter } from "@/components/studio/WorkflowCenter";
import { OnboardingFlow } from "@/components/studio/OnboardingFlow";
import PlannerScriptPanel from "@/components/studio/PlannerScriptPanel";
import PlannerStageTracker, {
  type PlannerStage,
} from "@/components/studio/PlannerStageTracker";
import PlannerProjectSetup from "@/components/studio/PlannerProjectSetup";
import PlannerScaffoldPreview from "@/components/studio/PlannerScaffoldPreview";
import EchoCoderPanel from "@/components/studio/EchoCoderPanel";
import AI3SeedGenerator from "@/components/studio/AI3SeedGenerator";
import { NewStudioLayout } from "@/components/studio/NewStudioLayout";
import EchoOrb from "@/components/echo/EchoOrb";

// Lazy load AI3 components to reduce initial bundle size
const AI3AnalyticsDashboard = lazy(() => import("@/components/studio/AI3AnalyticsDashboard"));
const AI3FeedbackPanel = lazy(() => import("@/components/studio/AI3FeedbackPanel"));
const AI3CollaborationPanel = lazy(() => import("@/components/studio/AI3CollaborationPanel"));
import EmbedSnippet from "@/components/echo/EmbedSnippet";
import CodeExplorer from "@/components/studio/CodeExplorer";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import AddonToolbar from "@/components/studio/design/AddonToolbar";
import DesignMenuBar from "@/components/studio/design/DesignMenuBar";
import DesignInspector, {
  type DesignInspectorBlock,
} from "@/components/studio/design/DesignInspector";
import FigmaToolkit from "@/components/studio/design/FigmaToolkit";
import CanvasToolbar from "@/components/studio/design/CanvasToolbar";
import CollapsibleToolSection from "@/components/studio/design/CollapsibleToolSection";
import ImageGeneratorPanel from "@/components/studio/ImageGeneratorPanel";
import { EDITABLE_CONTENT } from "@/components/studio/design/editable-content";
import { textStyleFromProps } from "@/components/studio/design/library";
import { base64ToString } from "@/lib/base64";
import {
  compileEchoScript,
  DEFAULT_ECHO_SCRIPT,
  fingerprintScript,
  type ScriptBuildOutput,
} from "@/lib/echo-script";
import {
  buildProjectScaffold,
  makeProjectSlug,
  type PlannerScaffold,
  type PlannerScaffoldFile,
} from "@/lib/planner-scaffold";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Settings, Github, Search } from "lucide-react";
import { templates } from "@/templates/catalog";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { toast } from "@/hooks/use-toast";
import {
  getGuardOfflineUntil,
  getGuardStatus,
  GUARD_RETRY_DELAY_MS,
  sendGuardEvent,
} from "@/lib/guard-client";
import DefconOverlay from "@/components/echo/DefconOverlay";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

function formatTimestamp(value: number): string {
  return timeFormatter.format(new Date(value));
}

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

async function logLine(line: string) {
  try {
    await fetch("/api/logs/append", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line }),
    });
  } catch {}
}

type GithubDialogState = {
  open: boolean;
  repo: string;
  branch: string;
  subdir: string;
  token: string;
  busy: boolean;
};

const ENGINE_LOCK_PREFIXES = [
  "/styles/",
  "/templates/slots/",
  "/schema/",
  "/seeds/",
  "/lib/security/",
];
const ENGINE_LOCK_FILES = new Set(["/engine.json"]);
const GRID = 8;

export default function Studio() {
  const [renderError, setRenderError] = useState<Error | null>(null);
  const renderErrorDetails =
    renderError?.stack ||
    renderError?.message ||
    (renderError ? String(renderError) : "");

  useEffect(() => {
    if (!renderError) return;
    const msg = renderError.message || String(renderError);
    const detail = renderError.stack || msg;
    logLine(`[Studio] render error: ${msg}`).catch(() => {});
    logLine(`[Studio] render stack: ${detail}`).catch(() => {});
  }, [renderError]);

  return (
    <ErrorBoundary
      onError={(error) => {
        console.error("Studio render error", error);
        setRenderError(error);
      }}
      fallback={
        <div className="p-4 text-sm space-y-3">
          <div className="space-y-1">
            <div className="font-semibold">Studio failed to render.</div>
            <p className="text-muted-foreground">
              Something in the last update caused the Studio view to crash.
              Review the newest change in Historian, undo it if needed, then
              reload once the code looks good.
            </p>
          </div>
          {renderError ? (
            <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-xs font-mono whitespace-pre-wrap break-words space-y-2">
              {renderError.message ? (
                <div className="font-semibold text-destructive-foreground">
                  {renderError.message}
                </div>
              ) : null}
              {renderErrorDetails ? <div>{renderErrorDetails}</div> : null}
            </div>
          ) : null}
          <button
            className="inline-flex items-center gap-1 rounded border border-muted-foreground/30 px-2 py-1 text-xs hover:bg-muted/40"
            onClick={() => {
              setRenderError(null);
              window.location.reload();
            }}
          >
            Reload Studio
          </button>
        </div>
      }
    >
      <StudioInner />
      <DefconOverlay />
    </ErrorBoundary>
  );
}

function StudioInner() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState<string>(
    'export default function Generated(){\n  return (<main className="container py-10"><h1 className="text-2xl font-bold">Welcome</h1><p className="mt-2 text-muted-foreground">Edit this page in the Studio and click Apply.</p></main>);\n}\n',
  );
  const [scriptText, setScriptText] = useState<string>(
    () => readStorage("planner.script") || DEFAULT_ECHO_SCRIPT,
  );
  const [scriptResult, setScriptResult] = useState<ScriptBuildOutput | null>(
    null,
  );
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [autoCompileScript, setAutoCompileScript] = useState<boolean>(
    () => readStorage("planner.autoCompile") === "on",
  );
  const [scriptRunning, setScriptRunning] = useState(false);

  // Echo orb controls
  const [speed, setSpeed] = useState(0.4);
  const [wobble, setWobble] = useState(0.25);
  const [compactness, setCompactness] = useState(0.9);
  const [colorA, setColorA] = useState("#14e0ff");
  const [colorB, setColorB] = useState("#ffe95c");
  const [showRings, setShowRings] = useState(true);
  const [ringSpeed, setRingSpeed] = useState(0.6);
  const [ringCount, setRingCount] = useState(6);
  const [ringParticles, setRingParticles] = useState(900);
  const [ringRandomness, setRingRandomness] = useState(0.35);
  const [radius, setRadius] = useState(2.2);
  const [glowParticles, setGlowParticles] = useState(1200);
  const [glowAz, setGlowAz] = useState(25);
  const [glowEl, setGlowEl] = useState(10);
  const [glowSpeed, setGlowSpeed] = useState(1.4);
  const [glowSize, setGlowSize] = useState(0.035);
  const [glowColor, setGlowColor] = useState("#ffe95c");
  const [omniGlow, setOmniGlow] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [layoutTemplate, setLayoutTemplate] = useState("Minimal");
  const [figmaUrl, setFigmaUrl] = useState<string>(
    () => readStorage("studio.figmaUrl") || "",
  );
  const [helix, setHelix] = useState(true);
  const [helixParticles, setHelixParticles] = useState(1200);
  const [helixRadius, setHelixRadius] = useState(0.9);
  const [helixPitch, setHelixPitch] = useState(0.5);
  const [helixSpeed, setHelixSpeed] = useState(1.0);
  const [currentTask, setCurrentTask] = useState<string>("Idle");
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialTab = (params.get("tab") || "design").toLowerCase();
  const [tab, setTab] = useState<string>(
    ["design", "interact", "code", "seed"].includes(initialTab)
      ? initialTab
      : "design",
  );
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const t = p.get("task");
    if (t) setCurrentTask(t);
    const tb = (p.get("tab") || "").toLowerCase();
    if (tb && tb !== tab)
      setTab(
        ["design", "interact", "code", "seed"].includes(tb) ? tb : "design",
      );
  }, [location.search]);

  const taskTabMap: Record<string, string> = {
    Blueprint: "design",
    Planner: "seed",
    Coder: "code",
    Reviewer: "interact",
    Integrator: "design",
    Historian: "interact",
    Scorecard: "interact",
    Interact: "interact",
  };
  function handleTaskSelect(t: string) {
    setCurrentTask(t);
    const nextTab = taskTabMap[t] || tab;
    setTab(nextTab);
    const q = new URLSearchParams(location.search);
    q.set("task", t);
    q.set("tab", nextTab);
    navigate({ search: q.toString() }, { replace: true });
  }

  async function onSeedFile(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      const payload = {
        name: file.name,
        size: file.size,
        kind: file.type,
        text,
      };
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setAnalysis(json);
    } catch (e) {
      alert("Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  async function plan(text?: string) {
    try {
      const promptText = (text ?? prompt).trim();
      if (!promptText) return;
      setPrompt(promptText);
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          route: "/generated",
          layoutTemplate,
        }),
      });
      const json = await res.json();
      setAnalysis(json);
      const sugg = suggestDest(promptText);
      if (sugg.length) {
        setApplySuggestions(sugg);
        setDestPath(sugg[0]);
      }
      setApplyOpen(true);
    } catch {
      alert("Plan failed");
    }
  }

  const [previewKey, setPreviewKey] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyExpand, setApplyExpand] = useState(false);
  const [undoContent, setUndoContent] = useState<string | null>(null);
  const initialProjectName = readStorage("studio.projectName") || "";
  const [projectName, setProjectName] = useState<string>(initialProjectName);
  const [projectSlug, setProjectSlug] = useState<string>(() => {
    const storedSlug = readStorage("studio.projectSlug");
    if (storedSlug) return storedSlug;
    return makeProjectSlug(initialProjectName || "project");
  });
  const initialPlannerStage: PlannerStage = (() => {
    const storedStage = readStorage("studio.plannerStage");
    if (storedStage === "plan") {
      return "plan";
    }
    return initialProjectName ? "plan" : "setup";
  })();
  const [plannerStage, setPlannerStage] =
    useState<PlannerStage>(initialPlannerStage);
  const [slugEdited, setSlugEdited] = useState<boolean>(() =>
    Boolean(readStorage("studio.projectSlug")),
  );
  const [scaffoldPlan, setScaffoldPlan] = useState<PlannerScaffold | null>(
    null,
  );
  const [scaffoldApplying, setScaffoldApplying] = useState(false);
  const [destPath, setDestPath] = useState<string>(() => {
    const storedDest = readStorage("studio.destPath");
    if (storedDest) return storedDest;
    const slug =
      readStorage("studio.projectSlug") ||
      makeProjectSlug(initialProjectName || "project");
    return `client/projects/${slug}/index.tsx`;
  });
  const [role, setRole] = useState<string>(
    () => readStorage("studio.role") || "editor",
  );

  const projectRoot = useMemo(
    () => `client/projects/${projectSlug || "project"}`,
    [projectSlug],
  );

  const handleProjectNameInput = useCallback(
    (value: string) => {
      setProjectName(value);
      if (!slugEdited) {
        const nextSlug = makeProjectSlug(value || "project");
        setProjectSlug(nextSlug);
      }
      if (plannerStage === "scaffold" || plannerStage === "ready") {
        setPlannerStage("plan");
        setScaffoldPlan(null);
      }
    },
    [slugEdited, plannerStage],
  );

  const handleProjectSlugInput = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      const nextSlug = trimmed
        ? makeProjectSlug(trimmed)
        : makeProjectSlug(projectName || "project");
      setProjectSlug(nextSlug);
      setSlugEdited(Boolean(trimmed));
      if (plannerStage === "scaffold" || plannerStage === "ready") {
        setPlannerStage("plan");
        setScaffoldPlan(null);
      }
    },
    [plannerStage, projectName],
  );

  const handleProjectSetupSubmit = useCallback(() => {
    setScaffoldPlan(null);
    setPlannerStage((prev) => (prev === "setup" ? "plan" : prev));
  }, [setScaffoldPlan, setPlannerStage]);

  // Code editor modal and sync control
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeDraft, setCodeDraft] = useState<string>("");
  const [codeSync, setCodeSync] = useState<boolean>(true);
  const [applySuggestions, setApplySuggestions] = useState<string[]>([]);
  const [includeCss, setIncludeCss] = useState(true);
  const [interactionState, setInteractionState] = useState<
    "idle" | "live" | "paused"
  >("idle");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [guardStatus, setGuardStatus] = useState<{
    alert: "none" | "defcon1";
    detail?: string;
    since?: number;
  } | null>(null);
  const [guardUnavailable, setGuardUnavailable] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [clearingAlert, setClearingAlert] = useState(false);
  const [syncingPreview, setSyncingPreview] = useState(false);

  const refreshGuardStatus = useCallback(async () => {
    if (guardUnavailable) {
      const remaining = getGuardOfflineUntil() - Date.now();
      if (remaining > 250) {
        return;
      }
    }
    let result: Awaited<ReturnType<typeof getGuardStatus>>;
    try {
      result = await getGuardStatus();
    } catch {
      result = { data: null, offline: true };
    }
    if (result.offline) {
      setGuardUnavailable(true);
      setGuardStatus(null);
      return;
    }
    setGuardUnavailable(false);
    if (result.data) {
      setGuardStatus({
        alert: result.data.alert === "defcon1" ? "defcon1" : "none",
        detail: result.data.detail,
        since:
          typeof result.data.since === "number" ? result.data.since : undefined,
      });
    } else {
      setGuardStatus(null);
    }
  }, [guardUnavailable, setGuardStatus, setGuardUnavailable]);

  useEffect(() => {
    if (!guardUnavailable) return;
    if (typeof window === "undefined") return;
    const remaining = getGuardOfflineUntil() - Date.now();
    const delay = Math.max(GUARD_RETRY_DELAY_MS, remaining > 0 ? remaining : 0);
    const timeout = window.setTimeout(() => {
      setGuardUnavailable(false);
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [guardUnavailable]);

  const markSynced = useCallback(() => {
    const now = Date.now();
    setLastSyncAt(now);
    return now;
  }, []);

  const broadcast = useCallback(
    (event: string, detail?: Record<string, unknown>) => {
      try {
        window.dispatchEvent(
          new CustomEvent(event, detail ? { detail } : undefined),
        );
      } catch {}
    },
    [],
  );

  const handleStartLive = useCallback(() => {
    setInteractionState("live");
    const ts = markSynced();
    broadcast("interact:start", { startedAt: ts });
    toast({
      title: "Live session started",
      description: "Operations stream is active.",
    });
  }, [broadcast, markSynced]);

  const handlePauseLive = useCallback(() => {
    setInteractionState("paused");
    broadcast("interact:pause");
    toast({
      title: "Session paused",
      description: "Interactions are temporarily halted.",
    });
  }, [broadcast]);

  const handleSyncPreview = useCallback(() => {
    setSyncingPreview(true);
    setPreviewKey((k) => k + 1);
    const ts = markSynced();
    toast({
      title: "Preview refreshed",
      description: `Synchronized at ${formatTimestamp(ts)}.`,
    });
    window.setTimeout(() => setSyncingPreview(false), 600);
  }, [markSynced]);

  const handleEscalate = useCallback(async () => {
    setEscalating(true);
    try {
      let result: Awaited<ReturnType<typeof sendGuardEvent>>;
      try {
        result = await sendGuardEvent({
          type: "defcon1",
          detail: "Manual escalation triggered from Interact",
        });
      } catch {
        result = { data: null, offline: true };
      }
      if (result.offline) {
        setGuardUnavailable(true);
        toast({
          title: "Guard unreachable",
          description:
            "The guardian service could not be contacted. Try again shortly.",
          variant: "destructive",
        });
        return;
      }
      if (!result.data) {
        toast({
          title: "Escalation failed",
          description: result.error || "Unable to notify guard service.",
          variant: "destructive",
        });
        return;
      }
      setGuardUnavailable(false);
      setInteractionState("paused");
      toast({
        title: "Alert escalated",
        description: "DEFCON 1 engaged for this workspace.",
        variant: "destructive",
      });
      await refreshGuardStatus();
    } catch (error: any) {
      toast({
        title: "Escalation error",
        description: error?.message || String(error),
        variant: "destructive",
      });
    } finally {
      setEscalating(false);
    }
  }, [refreshGuardStatus, setGuardUnavailable, setInteractionState]);

  const handleClearAlert = useCallback(async () => {
    setClearingAlert(true);
    try {
      let result: Awaited<ReturnType<typeof sendGuardEvent>>;
      try {
        result = await sendGuardEvent({ type: "clear" });
      } catch {
        result = { data: null, offline: true };
      }
      if (result.offline) {
        setGuardUnavailable(true);
        toast({
          title: "Guard unreachable",
          description:
            "The guardian service could not be contacted. Try again shortly.",
          variant: "destructive",
        });
        return;
      }
      if (!result.data) {
        toast({
          title: "Clear failed",
          description: result.error || "Unable to clear guard state.",
          variant: "destructive",
        });
        return;
      }
      setGuardUnavailable(false);
      toast({
        title: "Alert cleared",
        description: "Guard channel returned to nominal state.",
      });
      await refreshGuardStatus();
    } catch (error: any) {
      toast({
        title: "Clear error",
        description: error?.message || String(error),
        variant: "destructive",
      });
    } finally {
      setClearingAlert(false);
    }
  }, [refreshGuardStatus, setGuardUnavailable]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    refreshGuardStatus();
    const interval = window.setInterval(() => {
      refreshGuardStatus();
    }, 30000);
    return () => {
      window.clearInterval(interval);
    };
  }, [refreshGuardStatus]);

  const scriptFingerprint = useMemo(
    () => fingerprintScript(scriptText),
    [scriptText],
  );

  const statusBadgeVariant =
    guardStatus?.alert === "defcon1"
      ? "destructive"
      : guardUnavailable
        ? "secondary"
        : interactionState === "live"
          ? "default"
          : interactionState === "paused"
            ? "secondary"
            : "outline";
  const statusLabel =
    guardStatus?.alert === "defcon1"
      ? "DEFCON 1"
      : guardUnavailable
        ? "Guard offline"
        : interactionState === "live"
          ? "Live"
          : interactionState === "paused"
            ? "Paused"
            : "Idle";
  const guardDetail = guardUnavailable
    ? "Service unreachable - retrying shortly"
    : guardStatus?.detail
      ? String(guardStatus.detail)
      : guardStatus?.alert === "defcon1"
        ? "Alert active"
        : "No incidents";
  const guardSinceLabel =
    guardUnavailable || typeof guardStatus?.since !== "number"
      ? null
      : formatTimestamp(guardStatus.since);
  const lastSyncLabel =
    typeof lastSyncAt === "number"
      ? formatTimestamp(lastSyncAt)
      : "Not yet synced";

  const compileScript = useCallback(
    (
      overrideSource?: string,
      options?: {
        silent?: boolean;
        projectName?: string;
        projectSlug?: string;
        destPath?: string;
      },
    ) => {
      const scriptSource =
        typeof overrideSource === "string" ? overrideSource : scriptText;
      setScriptRunning(true);
      try {
        const compiled = compileEchoScript(scriptSource);
        const requestedName = options?.projectName ?? projectName;
        const resolvedName =
          (requestedName && requestedName.trim()) || compiled.projectName;
        const requestedSlug = options?.projectSlug ?? projectSlug;
        const slugSeed =
          requestedSlug && requestedSlug.trim() ? requestedSlug : resolvedName;
        const resolvedSlug = makeProjectSlug(slugSeed);
        const entryPath =
          options?.destPath ?? `client/projects/${resolvedSlug}/index.tsx`;
        const adjusted: ScriptBuildOutput = {
          ...compiled,
          projectName: resolvedName,
          destPath: entryPath,
        };
        setScriptResult(adjusted);
        setScriptError(null);
        setCode(adjusted.code);
        setCodeDraft(adjusted.code);
        setCodeSync(true);
        setProjectName(resolvedName);
        setProjectSlug(resolvedSlug);
        setDestPath(entryPath);
        writeStorage("studio.destPath", entryPath);
        writeStorage("studio.projectName", resolvedName);
        writeStorage("studio.projectSlug", resolvedSlug);
        setPreviewKey((key) => key + 1);
        setApplySuggestions((prev) => {
          const next = [entryPath, ...prev];
          return Array.from(new Set(next));
        });
        if (!options?.silent) {
          toast({
            title: "Script compiled",
            description: `${adjusted.componentName} → ${entryPath}`,
          });
        }
        return adjusted;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setScriptError(message);
        if (!options?.silent) {
          toast({
            title: "Script error",
            description: message,
            variant: "destructive",
          });
        }
        return null;
      } finally {
        setScriptRunning(false);
      }
    },
    [
      scriptText,
      projectName,
      projectSlug,
      setCode,
      setCodeDraft,
      setCodeSync,
      setProjectName,
      setProjectSlug,
      setDestPath,
      setPreviewKey,
      setApplySuggestions,
    ],
  );

  const generateFromScript = useCallback(
    (options?: { silent?: boolean }) => {
      if (plannerStage === "setup") {
        return null;
      }
      const compiled = compileScript(undefined, {
        silent: options?.silent,
        projectName: projectName.trim() || undefined,
        projectSlug: projectSlug.trim() || undefined,
      });
      if (!compiled) return null;
      const slug = compiled.destPath
        .replace(/^client\/projects\//, "")
        .replace(/\/index\.tsx$/, "");
      const plan = buildProjectScaffold({
        compiled,
        projectName: compiled.projectName,
        projectSlug: slug,
      });
      setScaffoldPlan(plan);
      setProjectSlug(plan.projectSlug);
      setSlugEdited(true);
      setDestPath(plan.entryPath);
      writeStorage("studio.destPath", plan.entryPath);
      const planPaths = Array.isArray(plan.files)
        ? plan.files
            .map((file) => file?.path)
            .filter((p): p is string => typeof p === "string" && p.length > 0)
        : [];
      setApplySuggestions((prev) =>
        Array.from(new Set([...planPaths, ...prev])),
      );
      setPlannerStage("scaffold");
      return plan;
    },
    [
      compileScript,
      plannerStage,
      projectName,
      projectSlug,
      setApplySuggestions,
      setScaffoldPlan,
      setProjectSlug,
      setSlugEdited,
      setDestPath,
      setPlannerStage,
    ],
  );

  const applyScaffold = useCallback(async () => {
    const currentPlan = scaffoldPlan;
    const rawFiles = Array.isArray(currentPlan?.files) ? currentPlan.files : [];
    const filesToApply = rawFiles.filter((file): file is PlannerScaffoldFile =>
      Boolean(
        file &&
          typeof file.path === "string" &&
          file.path.length > 0 &&
          typeof file.contents === "string",
      ),
    );
    if (!currentPlan || filesToApply.length === 0) {
      toast({
        title: "No scaffold to apply",
        description:
          "Compile the planner script to generate files before applying.",
        variant: "destructive",
      });
      return;
    }
    setScaffoldApplying(true);
    try {
      const changes = filesToApply.map((file) => ({
        relPath: file.path,
        contents: file.contents,
      }));
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Role": role,
        },
        body: JSON.stringify({
          changes,
          runChecks: true,
          message: `Planner scaffold apply (${currentPlan.projectName})`,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        const detail =
          [j.error, j?.typecheck?.out, j?.tests?.out]
            .filter(Boolean)
            .join("\n\n") || "Scaffold apply failed";
        toast({
          title: "Apply failed",
          description: detail,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Scaffold applied",
        description: `${changes.length} file${changes.length === 1 ? "" : "s"} written to ${currentPlan.projectRoot}.`,
      });
      setPlannerStage("ready");
      setPreviewKey((key) => key + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Apply error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setScaffoldApplying(false);
    }
  }, [scaffoldPlan, role, setPlannerStage, setPreviewKey]);

  useEffect(() => {
    writeStorage("planner.script", scriptText);
  }, [scriptText]);

  useEffect(() => {
    writeStorage("planner.autoCompile", autoCompileScript ? "on" : "off");
  }, [autoCompileScript]);

  useEffect(() => {
    writeStorage("studio.figmaUrl", figmaUrl);
  }, [figmaUrl]);

  useEffect(() => {
    if (!autoCompileScript) return;
    if (plannerStage === "setup") return;
    generateFromScript({ silent: true });
  }, [autoCompileScript, scriptText, plannerStage, generateFromScript]);

  const handleScriptChange = useCallback(
    (value: string) => {
      setScriptText(value);
      if (scriptError) setScriptError(null);
    },
    [scriptError],
  );

  const handleScriptReset = useCallback(() => {
    setScriptText(DEFAULT_ECHO_SCRIPT);
    setScriptError(null);
  }, []);

  const normalizedDestPath = useMemo(
    () => "/" + destPath.replace(/^\/+/, ""),
    [destPath],
  );
  const codeOverrides = useMemo(() => {
    if (!codeSync) return undefined;
    const overrides: Record<string, string> = {
      [normalizedDestPath]: code,
    };
    if (scaffoldPlan?.files?.length) {
      for (const file of scaffoldPlan.files) {
        if (!file || typeof file.path !== "string") continue;
        if (typeof file.contents !== "string") continue;
        const key = "/" + file.path.replace(/^\/+/, "");
        overrides[key] = file.contents;
      }
    }
    return overrides;
  }, [normalizedDestPath, code, codeSync, scaffoldPlan]);

  useEffect(() => {
    if (tab === "code" && destPath) {
      const p = "/" + destPath.replace(/^\/+/, "");
      try {
        window.dispatchEvent(
          new CustomEvent("code:open", { detail: { path: p } }),
        );
      } catch {}
    }
  }, [tab, destPath]);

  useEffect(() => {
    writeStorage("studio.projectName", projectName);
  }, [projectName]);

  useEffect(() => {
    writeStorage("studio.projectSlug", projectSlug);
  }, [projectSlug]);

  useEffect(() => {
    writeStorage("studio.plannerStage", plannerStage);
  }, [plannerStage]);

  useEffect(() => {
    if (
      (plannerStage === "scaffold" || plannerStage === "ready") &&
      (!scaffoldPlan ||
        !Array.isArray(scaffoldPlan.files) ||
        scaffoldPlan.files.length === 0)
    ) {
      setPlannerStage("plan");
      setScaffoldPlan(null);
    }
  }, [plannerStage, scaffoldPlan]);

  function suggestDest(p: string): string[] {
    const slug = makeProjectSlug(p || "generated");
    return [
      `client/projects/${slug}/index.tsx`,
      `client/projects/${slug}/manifest.json`,
      `client/projects/${slug}/README.md`,
    ];
  }

  // Undo/Redo stacks for design canvas
  const [hist, setHist] = useState<
    {
      blocks: Block[];
      overrides: Record<string, Partial<CSSStyleDeclaration>>;
    }[]
  >([]);
  const [redos, setRedos] = useState<
    {
      blocks: Block[];
      overrides: Record<string, Partial<CSSStyleDeclaration>>;
    }[]
  >([]);
  const lastStateRef = useRef<{
    blocks: Block[];
    overrides: Record<string, Partial<CSSStyleDeclaration>>;
  } | null>(null);

  // Visual inspector state for Live Preview
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [inspect, setInspect] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [selected, setSelected] = useState<string>("");
  const [overrides, setOverrides] = useState<
    Record<string, Partial<CSSStyleDeclaration>>
  >({});
  const [cssExport, setCssExport] = useState<string>("");

  // Imported modules (via local files, URLs, or GitHub)
  const [modules, setModules] = useState<
    { name: string; files: Record<string, string> }[]
  >([]);
  const latestModule = modules.length > 0 ? modules[modules.length - 1] : null;
  const latestModuleFiles = latestModule?.files ?? {};

  const [githubDialog, setGithubDialog] = useState<GithubDialogState>(() => ({
    open: false,
    repo: "",
    branch: "",
    subdir: "",
    token: readStorage("gh.token") || "",
    busy: false,
  }));

  // Pre‑scan modal state
  const [prescanOpen, setPrescanOpen] = useState(false);
  const [prescanText, setPrescanText] = useState<string>("");
  const [secscanOpen, setSecscanOpen] = useState(false);
  const [secscanText, setSecscanText] = useState<string>("");
  const [secscanStatus, setSecscanStatus] = useState<
    "green" | "yellow" | "red"
  >("green");
  const [intentOpen, setIntentOpen] = useState(false);
  const [intentJson, setIntentJson] = useState<string>("");
  const [dryOpen, setDryOpen] = useState(false);
  const [dryText, setDryText] = useState<string>("");
  // Package builder state
  const [packOpen, setPackOpen] = useState(false);
  const [packChannel, setPackChannel] = useState<
    "testers" | "end-users" | "custom"
  >("testers");
  const [packName, setPackName] = useState<string>("");
  const [packIncludeManifest, setPackIncludeManifest] = useState(true);
  const [packExcludeBinaries, setPackExcludeBinaries] = useState(true);
  const [packBusy, setPackBusy] = useState(false);
  const [packCount, setPackCount] = useState(0);
  const [packRoles, setPackRoles] = useState<Record<string, boolean>>({
    docs: true,
    "frontend component": true,
    "utility/config": true,
    "server route": false,
    "server library": false,
    "cli script": false,
    other: false,
  });
  const [packRoleCounts, setPackRoleCounts] = useState<Record<string, number>>(
    {},
  );

  // Replace/Install dialog state
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [archiveUnused, setArchiveUnused] = useState(true);
  const [projTarget, setProjTarget] = useState<string>("");
  const [srcModuleIdx, setSrcModuleIdx] = useState<number>(0);
  const [srcEntry, setSrcEntry] = useState<string>("");
  const [projTargetQuery, setProjTargetQuery] = useState("");
  const [srcEntryQuery, setSrcEntryQuery] = useState("");

  // DB transfer (Neon → self���hosted)
  const [dbOpen, setDbOpen] = useState(false);
  const [dbSrc, setDbSrc] = useState("");
  const [dbDst, setDbDst] = useState("");
  const [dbSchemaOnly, setDbSchemaOnly] = useState(false);
  const [dbScript, setDbScript] = useState("");

  useEffect(() => {
    function inferRole(path: string, text: string): string {
      const p = path.toLowerCase();
      if (/\.(md|markdown|txt)$/.test(p)) return "docs";
      if (p.endsWith(".sh")) return "cli script";
      if (p.includes("/server/") || /\.cjs$/.test(p)) {
        if (
          p.includes("/routes/") ||
          p.endsWith("index.cjs") ||
          p.endsWith("index.ts") ||
          p.endsWith("index.js")
        )
          return "server route";
        return "server library";
      }
      if (/\.(tsx|jsx)$/.test(p)) return "frontend component";
      if (/\.(ts|js|json)$/.test(p)) return "utility/config";
      return "other";
    }
    function buildReport(files: Record<string, string>): string {
      const lines: string[] = [];
      const paths = Object.keys(files).sort();
      const counts: Record<string, number> = {};
      for (const p of paths) {
        const role = inferRole(p, files[p] || "");
        counts[role] = (counts[role] || 0) + 1;
        lines.push(`- ${p}  �� ${role}`);
      }
      const head =
        `Summary: ` +
        Object.entries(counts)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ");
      return head + "\n\n" + lines.join("\n");
    }
    function isBinary(str: string): boolean {
      if (!str) return false;
      let nonPrintable = 0;
      const len = Math.min(str.length, 2000);
      for (let i = 0; i < len; i++) {
        const c = str.charCodeAt(i);
        if (c === 65533 || c <= 8) {
          nonPrintable++;
        }
      }
      return nonPrintable / Math.max(1, len) > 0.02;
    }
    type Issue = { path: string; severity: "red" | "yellow"; reason: string };
    function scanSecurity(files: Record<string, string>): {
      status: "green" | "yellow" | "red";
      issues: Issue[];
    } {
      const issues: Issue[] = [];
      const add = (path: string, severity: Issue["severity"], reason: string) =>
        issues.push({ path, severity, reason });
      for (const [p, src] of Object.entries(files)) {
        const pl = p.toLowerCase();
        if (/(\.exe|\.dll|\.dylib|\.so|\.bin)$/.test(pl))
          add(p, "red", "Binary/executable file inside module");
        if (isBinary(src)) add(p, "red", "File appears binary");
        if (pl.endsWith(".sh")) {
          if (
            /(rm\s+-rf\s+\/?\w+|curl\s+[^\n]+\|\s*sh|wget\s+[^\n]+\|\s*sh|dd\s+if=|mkfs\.|:\(\)\{:\|:&\};:)/.test(
              src,
            )
          )
            add(p, "red", "Dangerous shell command");
        }
        if (/\.(js|ts|jsx|tsx)$/.test(pl)) {
          if (
            /child_process\.(exec|spawn)/.test(src) &&
            /(curl|wget)/.test(src)
          )
            add(p, "red", "Downloads and executes via child_process");
          if (
            /eval\s*\(/.test(src) &&
            /(atob|Buffer\.from\([^,]+,'base64')/.test(src)
          )
            add(p, "yellow", "Obfuscated eval");
          if (/new\s+Function\s*\(/.test(src))
            add(p, "yellow", "Dynamic code generation");
          if (/http:\/\//.test(src) && /(fetch|axios|request|curl)/.test(src))
            add(p, "yellow", "Uses insecure HTTP");
          if (
            /crypto\.(createCipher|createDecipher)/.test(src) ||
            /md5\(/i.test(src)
          )
            add(p, "yellow", "Weak/legacy crypto");
        }
        if (pl.endsWith("package.json")) {
          try {
            const pkg = JSON.parse(src);
            const scripts = pkg.scripts || {};
            const badKeys = ["preinstall", "install", "postinstall"];
            for (const k of badKeys) {
              const v = scripts[k];
              if (typeof v === "string" && /(curl|wget).+\|\s*sh/.test(v))
                add(p, "red", `Suspicious ${k} script`);
            }
          } catch {}
        }
      }
      const severe = issues.filter((i) => i.severity === "red").length;
      const warnings = issues.filter((i) => i.severity === "yellow").length;
      const status: "green" | "yellow" | "red" =
        severe > 0 ? "red" : warnings > 0 ? "yellow" : "green";
      return { status, issues };
    }
    const onPrescan = () => {
      try {
        const last = latestModule;
        if (!last) return;
        const report = buildReport(last.files);
        setPrescanText(report);
        setPrescanOpen(true);
        logLine(
          `[PRESCAN] module=${last.name} lines=${report.split("\n").length}`,
        );
      } catch (err) {
        console.error("module prescan failed", err);
        setPrescanText("Pre-scan failed. Check console for details.");
        setPrescanOpen(true);
      }
    };
    function stripRoot(paths: string[]): string[] {
      if (paths.length === 0) return paths;
      const segs = paths.map((p) => p.replace(/^\//, "").split("/")[0]);
      const one = new Set(segs).size === 1 ? segs[0] : null;
      if (!one) return paths;
      const re = new RegExp(
        "^" + one.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "/",
      );
      return paths.map((p) => "/" + p.replace(/^\//, "").replace(re, ""));
    }
    async function hashString(s: string) {
      try {
        const globalCrypto =
          typeof globalThis !== "undefined" && (globalThis as any)?.crypto
            ? (globalThis as any).crypto
            : undefined;
        const subtle = globalCrypto?.subtle;
        if (subtle) {
          const enc = new TextEncoder();
          const buf = await subtle.digest("SHA-256", enc.encode(s));
          return Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        }
      } catch (err) {
        console.warn("hashString subtle digest failed", err);
      }
      let hash = 0;
      for (let i = 0; i < s.length; i++) {
        hash = (hash + s.charCodeAt(i) * 2654435761) | 0;
      }
      return Math.abs(hash).toString(16);
    }
    function getProjectFiles(): Record<string, string> {
      // Restrict glob to essential directories to avoid OOM
      const a = import.meta.glob(
        [
          "/client/pages/**/*.{ts,tsx}",
          "/client/components/**/*.{ts,tsx}",
          "/client/hooks/**/*.{ts,tsx}",
          "/shared/**/*.{ts,tsx}",
        ],
        { eager: true, query: "?raw", import: "default" },
      ) as Record<string, string>;
      return a;
    }
    const onSecscan = () => {
      try {
        const last = latestModule;
        if (!last) return;
        const res = scanSecurity(last.files);
        setSecscanStatus(res.status);
        const header = `Status: ${res.status.toUpperCase()}\nIssues: ${res.issues.length}`;
        const list = res.issues
          .map((i) => `- [${i.severity.toUpperCase()}] ${i.path}: ${i.reason}`)
          .join("\n");
        setSecscanText(
          header + (list ? "\n\n" + list : "\n\nNo issues found."),
        );
        setSecscanOpen(true);
        logLine(
          `[SECSCAN] module=${last.name} status=${res.status} issues=${res.issues.length}`,
        );
      } catch (err) {
        console.error("module secscan failed", err);
        setSecscanStatus("red");
        setSecscanText("Security scan failed. Check console for details.");
        setSecscanOpen(true);
      }
    };
    const onIntent = async () => {
      try {
        const last = latestModule;
        if (!last) return;
        const paths = Object.keys(last.files);
        const stripped = stripRoot(paths);
        const items: any[] = [];
        for (const [i, p] of stripped.entries()) {
          const role = inferRole(p, last.files[paths[i]] || "");
          const sha = await hashString(last.files[paths[i]] || "");
          items.push({ path: p, role, sha256: sha });
        }
        const manifest = {
          module: last.name,
          createdAt: new Date().toISOString(),
          files: items,
        };
        setIntentJson(JSON.stringify(manifest, null, 2));
        setIntentOpen(true);
        logLine(`[INTENT] module=${last.name} files=${items.length}`);
      } catch (err) {
        console.error("module intent failed", err);
        setIntentJson("Intent manifest failed. Check console for details.");
        setIntentOpen(true);
      }
    };
    const onDry = () => {
      try {
        const last = latestModule;
        if (!last) return setDryText("No module loaded");
        const proj = getProjectFiles();
        const paths = Object.keys(last.files);
        const stripped = stripRoot(paths);
        let add = 0,
          mod = 0,
          oacl = 0;
        const lines: string[] = [];
        for (const [i, p] of stripped.entries()) {
          const target = p;
          const inAcl = /^\/(client|shared|server)\//.test(target);
          if (!inAcl) {
            oacl++;
            lines.push(`OUT_OF_ACL ${target}`);
            continue;
          }
          const before = proj[target];
          const after = last.files[paths[i]] || "";
          if (before == null) {
            add++;
            lines.push(`ADD ${target}`);
          } else if (before !== after) {
            mod++;
            lines.push(`MOD ${target}`);
          }
        }
        const summary = `Summary: add ${add}, modify ${mod}, out_of_acl ${oacl}`;
        setDryText(
          summary +
            (lines.length ? `\n\n${lines.slice(0, 200).join("\n")}` : ""),
        );
        setDryOpen(true);
        logLine(`[DRYRUN] module=${last.name} ${summary}`);
      } catch (err) {
        console.error("module dry run failed", err);
        setDryText("Dry run failed. Check console for details.");
        setDryOpen(true);
      }
    };
    window.addEventListener("module:prescan", onPrescan as any);
    window.addEventListener("module:secscan", onSecscan as any);
    window.addEventListener("module:intent", onIntent as any);
    window.addEventListener("module:dryrun", onDry as any);
    return () => {
      window.removeEventListener("module:prescan", onPrescan as any);
      window.removeEventListener("module:secscan", onSecscan as any);
      window.removeEventListener("module:intent", onIntent as any);
      window.removeEventListener("module:dryrun", onDry as any);
    };
  }, [modules]);

  // Dependency scanner and replace/apply
  function normalize(p: string | null | undefined) {
    if (typeof p !== "string") return "/";
    return ("/" + p.replace(/^\/+/, "")).replace(/\\/g, "/");
  }
  function dirname(p: string | null | undefined) {
    if (typeof p !== "string") return "/";
    const idx = p.lastIndexOf("/");
    return idx >= 0 ? p.slice(0, idx + 1) : "/";
  }
  function resolveRelative(
    base: string | null | undefined,
    spec: string | null | undefined,
  ) {
    if (typeof base !== "string" || typeof spec !== "string") return "";
    const b = dirname(base);
    const stack = b.replace(/^\//, "").split("/").filter(Boolean);
    const segs = spec.split("/");
    for (const s of segs) {
      if (s === "." || s === "") continue;
      if (s === "..") stack.pop();
      else stack.push(s);
    }
    return normalize("/" + stack.join("/"));
  }
  function addExtCandidates(p: string | null | undefined) {
    if (typeof p !== "string" || !p) return [];
    const list = [
      p,
      p + ".ts",
      p + ".tsx",
      p + ".js",
      p + ".jsx",
      p + "/index.tsx",
      p + "/index.ts",
      p + "/index.js",
      p + "/index.jsx",
    ];
    const seen = new Set<string>();
    return list.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
  }
  function isEngineProtectedPath(p: string | null | undefined) {
    if (typeof p !== "string") return false;
    const normalized = normalize(p);
    if (!normalized) return false;
    if (ENGINE_LOCK_FILES.has(normalized)) return true;
    return ENGINE_LOCK_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  }
  function buildGraph(
    files: Record<string, string> | null | undefined,
  ): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    if (!files || typeof files !== "object") return graph;
    try {
      const entries = Object.entries(files as Record<string, unknown>);
      for (const [path, raw] of entries) {
        if (typeof path !== "string" || typeof raw !== "string") {
          continue;
        }
        const src = raw;
        const deps = new Set<string>();
        const re =
          /(from\s+['\"]([^'\"]+)['\"])|require\(\s*['\"]([^'\"]+)['\"]\s*\)|import\(\s*['\"]([^'\"]+)['\"]\s*\)/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(src))) {
          const spec = m[2] || m[3] || m[4] || "";
          if (!spec || !spec.startsWith(".")) continue;
          const relative = resolveRelative(path, spec);
          if (!relative) continue;
          const cand = addExtCandidates(relative).filter(
            (c) => typeof c === "string" && c.length > 0,
          );
          for (const c of cand) {
            const val = Object.prototype.hasOwnProperty.call(files, c)
              ? (files as Record<string, unknown>)[c]
              : undefined;
            if (typeof val === "string") {
              deps.add(normalize(c));
              break;
            }
          }
        }
        graph.set(normalize(path), deps);
      }
    } catch (err) {
      console.error("buildGraph failed", err);
      return new Map<string, Set<string>>();
    }
    return graph;
  }
  function reachable(
    entry: string | undefined,
    graph: Map<string, Set<string>> | null | undefined,
  ): Set<string> {
    if (
      !entry ||
      !graph ||
      typeof (graph as Map<string, Set<string>>).has !== "function"
    ) {
      return new Set<string>();
    }
    if (!(graph as Map<string, Set<string>>).has(entry))
      return new Set<string>();
    const seen = new Set<string>();
    const stack: string[] = [entry];
    try {
      while (stack.length) {
        const node = stack.pop();
        if (!node || seen.has(node)) continue;
        seen.add(node);
        const deps = (graph as Map<string, Set<string>>).get(node);
        if (deps) {
          deps.forEach((dep) => {
            if (!seen.has(dep)) stack.push(dep);
          });
        }
      }
    } catch (err) {
      console.error("reachable traversal failed", err);
      return new Set<string>();
    }
    return seen;
  }
  function getProjectFilesMap(): Record<string, string> {
    try {
      // Restrict glob to essential directories to avoid OOM
      const a = import.meta.glob(
        [
          "/client/pages/**/*.{ts,tsx}",
          "/client/components/**/*.{ts,tsx}",
          "/client/hooks/**/*.{ts,tsx}",
          "/shared/**/*.{ts,tsx}",
        ],
        { eager: true, query: "?raw", import: "default" },
      ) as Record<string, string>;
      return a;
    } catch (err) {
      console.error("getProjectFilesMap failed", err);
      return {};
    }
  }
  async function onReplaceInstall() {
    const mod = modules[srcModuleIdx] ?? latestModule;
    if (!mod || !mod.files) {
      alert("Load a module first");
      return;
    }
    const rawSrc = srcEntry?.trim();
    const rawTarget = projTarget?.trim();
    if (!rawSrc || !rawTarget) {
      alert("Select source and target");
      return;
    }
    const src = normalize(rawSrc);
    const target = normalize(rawTarget);
    if (!/^\/(client|shared|server)\//.test(target)) {
      alert("Target must be within /client, /shared or /server");
      return;
    }
    const files = mod.files;
    if (!files || typeof files !== "object") {
      alert("Module files unavailable");
      return;
    }
    const recordFiles = files as Record<string, string>;
    const entryContent = recordFiles[src] ?? recordFiles[normalize(src)];
    if (typeof entryContent !== "string") {
      alert("Source not in module");
      return;
    }
    try {
      const graph = buildGraph(recordFiles);
      const reach = reachable(normalize(src), graph);
      if (!reach.size) {
        alert("Could not resolve entry dependencies");
        return;
      }
      const proj = getProjectFilesMap();
      if (!proj || typeof proj !== "object") {
        alert("Project files unavailable");
        return;
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const destDir = dirname(target);
      const baseSrcDir = dirname(src);
      type Change = { relPath: string; contents: string };
      const changes: Change[] = [];
      const ensureArchive = (rel: string, contents: string | undefined) => {
        if (typeof contents !== "string" || !rel) return;
        const cleaned = rel.replace(/^\//, "").trim();
        if (!cleaned) return;
        const arch = `client/UnUsed_archive/${stamp}/${cleaned}`;
        changes.push({ relPath: arch, contents });
      };
      const writeWithArchive = (dest: string, contents: string | undefined) => {
        if (typeof contents !== "string" || !dest) return;
        const normalizedDest = normalize(dest);
        if (!canEditEngine && isEngineProtectedPath(normalizedDest)) {
          toast({
            title: "Engine files locked",
            description:
              "Only Admins or Lead Devs can modify core engine assets.",
            variant: "destructive",
          });
          logLine(
            `[#acl] locked ${normalizedDest} for role=${normalizedRole || "unknown"}`,
          );
          return;
        }
        const before = proj[dest];
        if (typeof before === "string") ensureArchive(dest, before);
        changes.push({ relPath: dest, contents });
      };
      const original = proj[target];
      if (typeof original === "string") ensureArchive(target, original);
      writeWithArchive(target, entryContent);
      for (const p of reach) {
        if (p === normalize(src)) continue;
        const depContents = recordFiles[p] ?? recordFiles[normalize(p)];
        if (typeof depContents !== "string") continue;
        let relFromEntry = normalize(p).replace(
          new RegExp("^" + baseSrcDir.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")),
          "",
        );
        if (relFromEntry.startsWith("/")) relFromEntry = relFromEntry.slice(1);
        const dest = normalize(destDir + relFromEntry);
        writeWithArchive(dest, depContents);
      }
      if (archiveUnused) {
        for (const [p, content] of Object.entries(recordFiles)) {
          if (!reach.has(normalize(p))) ensureArchive(p, content);
        }
      }
      const r = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": role },
        body: JSON.stringify({
          changes,
          runChecks: true,
          message: `Replace ${target} with ${src} (${mod.name})`,
        }),
      });
      const j = await r.json();
      if (r.ok && j?.ok) {
        toast({
          title: "Replaced",
          description: `Applied ${j.applied ?? 0} change(s). Backup ${j.backupId ?? "n/a"}`,
        });
        logLine(
          `[REPLACE] ok changes=${j.applied ?? 0} backup=${j.backupId ?? "n/a"}`,
        );
      } else {
        const errMsg = j?.error || `HTTP ${r.status}`;
        toast({
          title: "Replace failed",
          description: errMsg,
          variant: "destructive",
        });
        logLine(`[REPLACE] failed ${errMsg}`);
      }
    } catch (e: any) {
      console.error("replace/install failed", e);
      toast({
        title: "Replace error",
        description: e?.message || String(e),
        variant: "destructive",
      });
    }
  }

  // Helpers for Package Builder
  function inferRolePkg(path: string): string {
    const p = path.toLowerCase();
    if (/\.(md|markdown|txt)$/.test(p)) return "docs";
    if (p.endsWith(".sh")) return "cli script";
    if (p.includes("/server/") || /\.cjs$/.test(p)) {
      if (
        p.includes("/routes/") ||
        p.endsWith("index.cjs") ||
        p.endsWith("index.ts") ||
        p.endsWith("index.js")
      )
        return "server route";
      return "server library";
    }
    if (/\.(tsx|jsx)$/.test(p)) return "frontend component";
    if (/\.(ts|js|json)$/.test(p)) return "utility/config";
    return "other";
  }
  function stripRootPkg(paths: string[]): string[] {
    if (paths.length === 0) return paths;
    const segs = paths.map((p) => p.replace(/^\//, "").split("/")[0]);
    const one = new Set(segs).size === 1 ? segs[0] : null;
    if (!one) return paths;
    const re = new RegExp(
      "^" + one.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "/",
    );
    return paths.map((p) => "/" + p.replace(/^\//, "").replace(re, ""));
  }
  function isBinaryPkg(str: string): boolean {
    if (!str) return false;
    let nonPrintable = 0;
    const len = Math.min(str.length, 2000);
    for (let i = 0; i < len; i++) {
      const c = str.charCodeAt(i);
      if (c === 65533 || c <= 8) nonPrintable++;
    }
    return nonPrintable / Math.max(1, len) > 0.02;
  }

  async function openPackageBuilder() {
    const last = latestModule;
    if (!last) {
      setPackOpen(true);
      setPackCount(0);
      setPackRoles({ ...packRoles });
      setPackRoleCounts({});
      return;
    }
    setPackName(last.name || "module");
    // Count roles
    const paths = Object.keys(last.files);
    const stripped = stripRootPkg(paths);
    const counts: Record<string, number> = {};
    for (const [i, p] of stripped.entries()) {
      const role = inferRolePkg(p);
      counts[role] = (counts[role] || 0) + 1;
    }
    setPackRoleCounts(counts);
    // Default selection follows current channel
    if (packChannel === "end-users") {
      setPackRoles({
        docs: true,
        "frontend component": false,
        "utility/config": false,
        "server route": false,
        "server library": false,
        "cli script": false,
        other: false,
      });
    } else {
      setPackRoles({
        docs: true,
        "frontend component": true,
        "utility/config": true,
        "server route": false,
        "server library": false,
        "cli script": false,
        other: false,
      });
    }
    // Compute initial count after state settles
    setTimeout(recomputeSelectedCount, 0);
    setPackOpen(true);
  }

  async function buildPackage() {
    const last = latestModule;
    if (!last) {
      toast({
        title: "No module",
        description: "Import a module first",
        variant: "destructive",
      });
      return;
    }
    setPackBusy(true);
    try {
      const paths = Object.keys(last.files);
      const stripped = stripRootPkg(paths);
      const selected: Record<string, string> = {};
      const items: any[] = [];
      for (const [i, p] of stripped.entries()) {
        const role = inferRolePkg(p);
        const txt = last.files[paths[i]] || "";
        if (!packRoles[role]) continue;
        if (packExcludeBinaries && isBinaryPkg(txt)) continue;
        selected[p.replace(/^\//, "")] = txt;
        let sha: string;
        try {
          const globalCrypto =
            typeof globalThis !== "undefined" && (globalThis as any)?.crypto
              ? (globalThis as any).crypto
              : undefined;
          const subtle = globalCrypto?.subtle;
          if (subtle) {
            const enc = new TextEncoder();
            const buf = await subtle.digest("SHA-256", enc.encode(txt));
            sha = Array.from(new Uint8Array(buf))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
          } else {
            throw new Error("subtle crypto unavailable");
          }
        } catch (err) {
          console.warn("hashString fallback (intent)", err);
          let hash = 0;
          for (let i = 0; i < txt.length; i++) {
            hash = (hash + txt.charCodeAt(i) * 2654435761) | 0;
          }
          sha = Math.abs(hash).toString(16);
        }
        items.push({ path: p.replace(/^\//, ""), role, sha256: sha });
      }
      const manifest = packIncludeManifest
        ? {
            module: packName || last.name || "module",
            channel: packChannel,
            createdAt: new Date().toISOString(),
            files: items,
          }
        : undefined;
      const res = await fetch("/api/seed/package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: packName || last.name || "package",
          channel: packChannel,
          files: selected,
          manifest,
        }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        toast({
          title: "Package saved",
          description: String(j.fileName || j.path || "OK")
            .toString()
            .replace(/^.*\//, ""),
        });
        logLine(
          `[PACKAGE] name=${packName || last.name || "module"} channel=${packChannel} files=${Object.keys(selected).length} size=${j.size || 0}`,
        );
        setPackOpen(false);
      } else {
        toast({
          title: "Package failed",
          description: j.error || "Error",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Package error",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setPackBusy(false);
    }
  }

  function onChannelChange(ch: "testers" | "end-users" | "custom") {
    setPackChannel(ch);
    if (ch === "end-users") {
      setPackRoles({
        docs: true,
        "frontend component": false,
        "utility/config": false,
        "server route": false,
        "server library": false,
        "cli script": false,
        other: false,
      });
    } else if (ch === "testers") {
      setPackRoles({
        docs: true,
        "frontend component": true,
        "utility/config": true,
        "server route": false,
        "server library": false,
        "cli script": false,
        other: false,
      });
    }
    setTimeout(recomputeSelectedCount, 0);
  }

  function recomputeSelectedCount() {
    const last = latestModule;
    if (!last || !last.files) {
      setPackCount(0);
      return;
    }
    const paths = Object.keys(last.files);
    const stripped = stripRootPkg(paths);
    let cnt = 0;
    for (const [i, p] of stripped.entries()) {
      const role = inferRolePkg(p);
      const txt = last.files[paths[i]] || "";
      if (!packRoles[role]) continue;
      if (packExcludeBinaries && isBinaryPkg(txt)) continue;
      cnt++;
    }
    setPackCount(cnt);
  }

  function toggleRole(role: string) {
    setPackRoles((prev) => {
      const next = { ...prev, [role]: !prev[role] };
      return next;
    });
    setTimeout(recomputeSelectedCount, 0);
  }

  function toggleExcludeBinaries() {
    setPackExcludeBinaries((v) => !v);
    setTimeout(recomputeSelectedCount, 0);
  }

  function onOpenPackage() {
    openPackageBuilder();
  }

  function onPackNameChange(v: string) {
    setPackName(v);
  }

  function onIncludeManifestChange() {
    setPackIncludeManifest((v) => !v);
  }

  function onBuildPackage() {
    if (!packBusy) buildPackage();
  }

  // Simple role selection (local-only wiring)
  const normalizedRole = normalizeEngineRole(role);
  const canEditEngine = roleCanEditEngine(role);
  useEffect(() => {
    writeStorage("studio.role", role);
  }, [role]);

  // Build export/import script locally (no secrets stored server-side)
  function buildDbTransferScript() {
    const src = dbSrc.trim();
    const dst = dbDst.trim();
    if (!/^postgresql:\/\//.test(src) || !/^postgresql:\/\//.test(dst)) {
      toast({
        title: "Invalid connection strings",
        description: "Use libpq URLs starting with postgresql://",
        variant: "destructive",
      });
      return;
    }
    const now = new Date().toISOString().replace(/[:.]/g, "-");
    const dumpPath = `.zaro/db-dumps/neon-${now}.dump`;
    const lines = [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      `SRC=\"${src}\"`,
      `DST=\"${dst}\"`,
      `DUMP=\"${dumpPath}\"`,
      "mkdir -p .zaro/db-dumps",
      "echo 'Dumping from Neon...'",
      dbSchemaOnly
        ? 'pg_dump --schema-only --no-owner --no-privileges "$SRC" -f "$DUMP"'
        : 'pg_dump --format=custom --no-owner --no-privileges "$SRC" -f "$DUMP"',
      "echo 'Restoring to target...'",
      dbSchemaOnly
        ? 'psql "$DST" -f "$DUMP"'
        : 'pg_restore --no-owner --no-privileges --clean --if-exists -d "$DST" "$DUMP"',
      "echo 'Done.'",
    ];
    setDbScript(lines.join("\n"));
    logLine(`[DB_TRANSFER_SCRIPT] schemaOnly=${dbSchemaOnly} dump=${dumpPath}`);
  }

  function buildCss(map: Record<string, Partial<CSSStyleDeclaration>>) {
    const toKebab = (s: string) =>
      s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    const parts: string[] = [];
    for (const [sel, styles] of Object.entries(map)) {
      const decls = Object.entries(styles)
        .filter(([_, v]) => v != null && String(v) !== "")
        .map(([k, v]) => `  ${toKebab(k)}: ${v};`)
        .join("\n");
      if (decls) parts.push(`${sel} {\n${decls}\n}`);
    }
    return parts.join("\n\n");
  }

  function computeSelector(el: Element) {
    if ((el as HTMLElement).id) return `#${(el as HTMLElement).id}`;
    const path: string[] = [];
    let cur: Element | null = el;
    while (
      cur &&
      cur.nodeType === 1 &&
      (cur as HTMLElement).tagName.toLowerCase() !== "html"
    ) {
      const tag = (cur as HTMLElement).tagName.toLowerCase();
      const id = (cur as HTMLElement).id ? `#${(cur as HTMLElement).id}` : "";
      const cls = (cur as HTMLElement).className
        ? "." +
          Array.from(
            new Set(
              (cur as HTMLElement).className.split(/\s+/).filter(Boolean),
            ),
          ).join(".")
        : "";
      let nth = 1;
      let sib = cur.previousElementSibling;
      while (sib) {
        if (sib.tagName === cur.tagName) nth++;
        sib = sib.previousElementSibling;
      }
      path.unshift(
        `${tag}${id || cls ? `${id}${cls}` : nth > 1 ? `:nth-of-type(${nth})` : ""}`,
      );
      cur = cur.parentElement as Element | null;
    }
    return path.join(" > ");
  }

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    let overlay: HTMLDivElement | null = null;
    let dragging = false;
    let startX = 0,
      startY = 0;
    let targetEl: HTMLElement | null = null;
    let originalTransform = "";

    function ensureOverlay() {
      if (overlay) return overlay;
      overlay = doc.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.pointerEvents = "none";
      overlay.style.border = "1px dashed #00e5ff";
      overlay.style.boxShadow = "0 0 18px rgba(0,229,255,0.6)";
      overlay.style.zIndex = "999999";
      overlay.style.display = "none";
      doc.body.appendChild(overlay);
      return overlay;
    }

    function onMove(e: MouseEvent) {
      if (!inspect) return;
      const el = e.target as HTMLElement;
      if (!el) return;
      const r = el.getBoundingClientRect();
      ensureOverlay();
      if (!overlay) return;
      overlay.style.display = "block";
      overlay.style.left = r.left + "px";
      overlay.style.top = r.top + "px";
      overlay.style.width = r.width + "px";
      overlay.style.height = r.height + "px";
    }
    function onClick(e: MouseEvent) {
      if (!inspect) return;
      e.preventDefault();
      e.stopPropagation();
      const el = e.target as HTMLElement;
      if (!el) return;
      const sel = computeSelector(el);
      setSelected(sel);
    }
    function onDown(e: MouseEvent) {
      if (!inspect) return;
      if (!selected) return;
      const el = doc.querySelector(selected) as HTMLElement | null;
      if (!el) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      targetEl = el;
      originalTransform = el.style.transform || "";
      e.preventDefault();
    }
    function onDrag(e: MouseEvent) {
      if (!inspect || !dragging || !targetEl) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const t = `translate(${dx}px, ${dy}px)`;
      targetEl.style.transform = originalTransform
        ? `${originalTransform} ${t}`
        : t;
      setOverrides((prev) => ({
        ...prev,
        [selected]: {
          ...(prev[selected] || {}),
          transform: targetEl!.style.transform,
        },
      }));
    }
    function onUp() {
      dragging = false;
    }

    doc.addEventListener("mousemove", onMove, true);
    doc.addEventListener("click", onClick, true);
    doc.addEventListener("mousedown", onDown, true);
    doc.addEventListener("mousemove", onDrag, true);
    doc.addEventListener("mouseup", onUp, true);
    return () => {
      doc.removeEventListener("mousemove", onMove, true);
      doc.removeEventListener("click", onClick, true);
      doc.removeEventListener("mousedown", onDown, true);
      doc.removeEventListener("mousemove", onDrag, true);
      doc.removeEventListener("mouseup", onUp, true);
      if (overlay && overlay.parentElement)
        overlay.parentElement.removeChild(overlay);
    };
  }, [inspect, selected, previewKey]);

  // Remove scrollbars inside preview iframe content
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const style = doc.createElement("style");
        style.textContent = "html, body { overflow: hidden !important; }";
        doc.head.appendChild(style);
      } catch {}
    };
    iframe.addEventListener("load", onLoad);
    onLoad();
    return () => iframe.removeEventListener("load", onLoad);
  }, [previewKey]);

  function exportCss() {
    const css = buildCss(overrides);
    setCssExport(css);
    navigator.clipboard.writeText(css).catch(() => {});
  }
  function clearOverrides() {
    setOverrides({});
    setCssExport("");
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    for (const [sel] of Object.entries(overrides)) {
      const el = doc.querySelector(sel) as HTMLElement | null;
      if (el) el.style.transform = "";
    }
  }

  const [applyError, setApplyError] = useState<string | null>(null);
  async function applyToCodebase() {
    const previous = readStorage("studio.lastApplied");
    if (previous) setUndoContent(previous);
    const css = includeCss ? buildCss(overrides) : "";
    const payload =
      code +
      (includeCss && css
        ? `\n\n/* Studio CSS Overrides */\n<style>{\`\n${css}\n\`}</style>\n`
        : "\n");
    const changes = [{ relPath: destPath, contents: payload }];
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Role": role },
      body: JSON.stringify({
        changes,
        runChecks: true,
        message: `Studio apply to ${destPath}`,
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) {
      const detail =
        [j.error, j?.typecheck?.out, j?.tests?.out]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 4000) || "Apply failed";
      setApplyError(detail);
      return;
    }
    writeStorage("studio.lastApplied", payload);
    writeStorage("studio.destPath", destPath);
    setPreviewKey((k) => k + 1);
  }
  async function updateCssFile() {
    try {
      const css = buildCss(overrides);
      if (!css) {
        toast({
          title: "No CSS overrides",
          description: "Nothing to update",
          variant: "destructive",
        });
        return;
      }
      const files = getProjectFilesMap();
      const current = files["/client/global.css"] || "";
      const stamp = new Date().toISOString();
      const block = `\n/* Studio Overrides ${stamp} */\n${css}\n`;
      const role = readStorage("studio.role") || "editor";
      const adminToken = readStorage("studio.adminToken") || "";
      const r = await fetch("/api/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Role": role,
          ...(adminToken ? { "X-Admin-Token": adminToken } : {}),
        },
        body: JSON.stringify({
          changes: [
            { relPath: "client/global.css", contents: current + block },
          ],
          runChecks: true,
          message: "Studio: append CSS overrides to client/global.css",
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        toast({ title: "CSS updated", description: "client/global.css" });
      } else {
        toast({
          title: "Update failed",
          description: j.error || "Error",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Update error",
        description: e?.message || String(e),
        variant: "destructive",
      });
    }
  }

  async function undoApply() {
    const r = await fetch("/api/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!r.ok) return alert("Rollback failed");
    setPreviewKey((k) => k + 1);
  }

  // Simple draggable design canvas + toolbar
  type Block = {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    type: string;
    props?: Record<string, any>;
  };
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: "a",
      x: 20,
      y: 20,
      w: 260,
      h: 80,
      z: 1,
      type: "Section",
      props: { heading: "Header", bordered: true },
    },
    {
      id: "b",
      x: 220,
      y: 140,
      w: 220,
      h: 140,
      z: 2,
      type: "Card",
      props: { bordered: true },
    },
  ]);
  const [selectedId, setSelectedId] = useState<string>("");
  const selectedBlock = blocks.find((b) => b.id === selectedId) || null;
  const canUndo = hist.length > 0;
  const canRedo = redos.length > 0;

  const captureDesignSnapshot = useCallback(() => {
    setHist((h) => [
      ...h,
      {
        blocks: JSON.parse(JSON.stringify(blocks)),
        overrides: JSON.parse(JSON.stringify(overrides)),
      },
    ]);
    setRedos([]);
  }, [blocks, overrides]);

  const handleInspectorPositionChange = useCallback(
    (changes: Partial<Pick<DesignInspectorBlock, "x" | "y" | "w" | "h">>) => {
      if (!selectedId) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      captureDesignSnapshot();
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== selectedId) return block;
          const next = { ...block };
          if (changes.x != null) {
            const snapped = Math.round(changes.x / GRID) * GRID;
            const maxX = rect ? Math.max(0, rect.width - next.w) : snapped;
            next.x = Math.max(0, rect ? Math.min(snapped, maxX) : snapped);
          }
          if (changes.y != null) {
            const snapped = Math.round(changes.y / GRID) * GRID;
            const maxY = rect ? Math.max(0, rect.height - next.h) : snapped;
            next.y = Math.max(0, rect ? Math.min(snapped, maxY) : snapped);
          }
          if (changes.w != null) {
            const snapped = Math.max(40, Math.round(changes.w / GRID) * GRID);
            const limit = rect ? Math.max(40, rect.width - next.x) : snapped;
            next.w = Math.max(40, rect ? Math.min(snapped, limit) : snapped);
          }
          if (changes.h != null) {
            const snapped = Math.max(40, Math.round(changes.h / GRID) * GRID);
            const limit = rect ? Math.max(40, rect.height - next.y) : snapped;
            next.h = Math.max(40, rect ? Math.min(snapped, limit) : snapped);
          }
          return next;
        }),
      );
    },
    [selectedId, captureDesignSnapshot, GRID],
  );

  const handleInspectorPropsChange = useCallback(
    (changes: Record<string, any>) => {
      if (!selectedId) return;
      captureDesignSnapshot();
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === selectedId
            ? {
                ...block,
                props: {
                  ...block.props,
                  ...changes,
                },
              }
            : block,
        ),
      );
    },
    [selectedId, captureDesignSnapshot],
  );

  const handleInspectorLayer = useCallback(
    (action: "front" | "back" | "up" | "down") => {
      if (!selectedId) return;
      captureDesignSnapshot();
      setBlocks((prev) => {
        const target = prev.find((block) => block.id === selectedId);
        if (!target) return prev;
        const maxZ = prev.reduce((m, block) => Math.max(m, block.z), target.z);
        const minZ = prev.reduce((m, block) => Math.min(m, block.z), target.z);
        return prev.map((block) => {
          if (block.id !== selectedId) return block;
          switch (action) {
            case "front":
              return { ...block, z: maxZ + 1 };
            case "back":
              return { ...block, z: minZ - 1 };
            case "up":
              return { ...block, z: block.z + 1 };
            case "down":
              return { ...block, z: block.z - 1 };
            default:
              return block;
          }
        });
      });
    },
    [selectedId, captureDesignSnapshot],
  );

  const handleInspectorAlign = useCallback(
    (mode: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
      if (!selectedId) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      captureDesignSnapshot();
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== selectedId) return block;
          const next = { ...block };
          const width = rect?.width ?? next.x + next.w;
          const height = rect?.height ?? next.y + next.h;
          const snap = (value: number) =>
            Math.max(0, Math.round(value / GRID) * GRID);
          switch (mode) {
            case "left":
              next.x = 0;
              break;
            case "center":
              next.x = snap((width - next.w) / 2);
              break;
            case "right":
              next.x = snap(width - next.w);
              break;
            case "top":
              next.y = 0;
              break;
            case "middle":
              next.y = snap((height - next.h) / 2);
              break;
            case "bottom":
              next.y = snap(height - next.h);
              break;
          }
          if (rect) {
            next.x = Math.max(
              0,
              Math.min(next.x, Math.max(0, rect.width - next.w)),
            );
            next.y = Math.max(
              0,
              Math.min(next.y, Math.max(0, rect.height - next.h)),
            );
          }
          return next;
        }),
      );
    },
    [selectedId, captureDesignSnapshot, GRID],
  );

  const handleInspectorEffect = useCallback(
    (effect: "drop-shadow" | "glow" | "clear-shadow") => {
      if (!selectedId) return;
      captureDesignSnapshot();
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== selectedId) return block;
          const nextProps = { ...block.props };
          if (effect === "clear-shadow") {
            delete nextProps.boxShadow;
          } else if (effect === "drop-shadow") {
            nextProps.boxShadow = "0 1px 8px rgba(0,0,0,.35)";
          } else if (effect === "glow") {
            const color = nextProps.outlineColor || "#15d1ff";
            nextProps.boxShadow = `0 0 14px ${color}, 0 0 24px ${color}`;
          }
          return { ...block, props: nextProps };
        }),
      );
    },
    [selectedId, captureDesignSnapshot],
  );

  const handleDuplicateBlock = useCallback(() => {
    if (!selectedBlock) return;
    captureDesignSnapshot();
    const newId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 9);
    const rect = canvasRef.current?.getBoundingClientRect();
    const offset = GRID * 4;
    const rawX = rect
      ? Math.min(rect.width - selectedBlock.w, selectedBlock.x + offset)
      : selectedBlock.x + offset;
    const rawY = rect
      ? Math.min(rect.height - selectedBlock.h, selectedBlock.y + offset)
      : selectedBlock.y + offset;
    const snap = (value: number) =>
      Math.max(0, Math.round(value / GRID) * GRID);
    const clone: Block = {
      ...selectedBlock,
      id: newId,
      x: snap(Math.max(0, rawX)),
      y: snap(Math.max(0, rawY)),
      z: selectedBlock.z + 1,
      props: JSON.parse(JSON.stringify(selectedBlock.props ?? {})),
    };
    setBlocks((prev) => [...prev, clone]);
    setSelectedId(newId);
  }, [selectedBlock, captureDesignSnapshot, GRID]);

  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number }>({
    open: false,
    x: 0,
    y: 0,
  });
  const [editingBlock, setEditingBlock] = useState<{
    id: string;
    prop: string;
    multiline: boolean;
    label: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const resizing = useRef<{
    id: string;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
  } | null>(null);
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>, id: string) {
    const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragging.current = { id, dx: e.clientX - b.left, dy: e.clientY - b.top };
    lastStateRef.current = {
      blocks: JSON.parse(JSON.stringify(blocks)),
      overrides: JSON.parse(JSON.stringify(overrides)),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onResizeDown(e: ReactPointerEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    const el = e.currentTarget.parentElement as HTMLElement;
    const r = el.getBoundingClientRect();
    resizing.current = {
      id,
      sx: e.clientX,
      sy: e.clientY,
      sw: r.width,
      sh: r.height,
    };
    lastStateRef.current = {
      blocks: JSON.parse(JSON.stringify(blocks)),
      overrides: JSON.parse(JSON.stringify(overrides)),
    };
    el.setPointerCapture((e as any).pointerId);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const parent = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (resizing.current) {
      const { id, sx, sy, sw, sh } = resizing.current;
      const dw = e.clientX - sx;
      const dh = e.clientY - sy;
      const w = Math.max(
        40,
        Math.min(parent.width, Math.round((sw + dw) / GRID) * GRID),
      );
      const h = Math.max(
        40,
        Math.min(parent.height, Math.round((sh + dh) / GRID) * GRID),
      );
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, w, h } : b)));
      return;
    }
    if (!dragging.current) return;
    const { id, dx, dy } = dragging.current;
    const nx = Math.max(
      0,
      Math.min(
        parent.width - 40,
        Math.round((e.clientX - parent.left - dx) / GRID) * GRID,
      ),
    );
    const ny = Math.max(
      0,
      Math.min(
        parent.height - 40,
        Math.round((e.clientY - parent.top - dy) / GRID) * GRID,
      ),
    );
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, x: nx, y: ny } : b)),
    );
  }
  function onPointerUp() {
    if (lastStateRef.current) {
      setHist((h) => [...h, lastStateRef.current!]);
      setRedos([]);
      lastStateRef.current = null;
    }
    dragging.current = null;
    resizing.current = null;
  }
  function addBlock(type: string, props: Record<string, any> = {}) {
    const id = Math.random().toString(36).slice(2, 7);
    setHist((h) => [
      ...h,
      {
        blocks: JSON.parse(JSON.stringify(blocks)),
        overrides: JSON.parse(JSON.stringify(overrides)),
      },
    ]);
    setRedos([]);
    const maxZ = blocks.reduce((m, b) => Math.max(m, b.z), 0);
    const baseProps: Record<string, any> = { bordered: true, ...(props || {}) };
    const meta = EDITABLE_CONTENT[type];
    if (meta && baseProps[meta.prop] == null)
      baseProps[meta.prop] = meta.defaultValue;
    setBlocks((prev) => [
      ...prev,
      {
        id,
        x: (props as any).x ?? 40,
        y: (props as any).y ?? 40,
        w: (props as any).w ?? 160,
        h: (props as any).h ?? 70,
        z: maxZ + 1,
        type,
        props: baseProps,
      },
    ]);
  }

  function deleteSelectedBlock() {
    if (!selectedId) return;
    setHist((h) => [
      ...h,
      {
        blocks: JSON.parse(JSON.stringify(blocks)),
        overrides: JSON.parse(JSON.stringify(overrides)),
      },
    ]);
    setRedos([]);
    setBlocks((prev) => prev.filter((b) => b.id !== selectedId));
    setSelectedId("");
    setMenu({ open: false, x: 0, y: 0 });
  }
  function clearAllBlocks() {
    if (blocks.length === 0) return;
    setHist((h) => [
      ...h,
      {
        blocks: JSON.parse(JSON.stringify(blocks)),
        overrides: JSON.parse(JSON.stringify(overrides)),
      },
    ]);
    setRedos([]);
    setBlocks([]);
    setSelectedId("");
    setMenu({ open: false, x: 0, y: 0 });
  }

  function beginInlineEdit(block: Block) {
    const meta = EDITABLE_CONTENT[block.type];
    if (!meta) return;
    setEditingBlock({
      id: block.id,
      prop: meta.prop,
      multiline: !!meta.multiline,
      label: meta.label,
    });
    setEditingValue(
      (block.props?.[meta.prop] as string | undefined) ?? meta.defaultValue,
    );
  }

  function cancelInlineEdit() {
    setEditingBlock(null);
    setEditingValue("");
  }

  function commitInlineEdit() {
    if (!editingBlock) return;
    const target = blocks.find((b) => b.id === editingBlock.id);
    if (!target) {
      cancelInlineEdit();
      return;
    }
    const meta = EDITABLE_CONTENT[target.type];
    const raw = editingBlock.multiline ? editingValue : editingValue.trim();
    const nextValue = raw || meta?.defaultValue || "";
    setHist((h) => [
      ...h,
      {
        blocks: JSON.parse(JSON.stringify(blocks)),
        overrides: JSON.parse(JSON.stringify(overrides)),
      },
    ]);
    setRedos([]);
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === editingBlock.id
          ? {
              ...b,
              props: {
                ...b.props,
                [editingBlock.prop]: nextValue,
              },
            }
          : b,
      ),
    );
    setEditingBlock(null);
    setEditingValue("");
  }

  useEffect(() => {
    if (editingBlock && editingBlock.id !== selectedId) {
      cancelInlineEdit();
    }
  }, [editingBlock, selectedId]);

  function undo() {
    setHist((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setRedos((r) => [
        {
          blocks: JSON.parse(JSON.stringify(blocks)),
          overrides: JSON.parse(JSON.stringify(overrides)),
        },
        ...r,
      ]);
      setBlocks(prev.blocks);
      setOverrides(prev.overrides);
      return h.slice(0, -1);
    });
  }
  function redo() {
    setRedos((r) => {
      if (r.length === 0) return r;
      const next = r[0];
      setHist((h) => [
        ...h,
        {
          blocks: JSON.parse(JSON.stringify(blocks)),
          overrides: JSON.parse(JSON.stringify(overrides)),
        },
      ]);
      setBlocks(next.blocks);
      setOverrides(next.overrides);
      return r.slice(1);
    });
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        undo();
      }
      if (
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          e.key.toLowerCase() === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        redo();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteSelectedBlock();
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "d" && selectedId) {
        e.preventDefault();
        handleDuplicateBlock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [blocks, overrides, selectedId, handleDuplicateBlock]);

  useEffect(() => {
    // Auto-generate code from blocks when synced
    if (!codeSync) return;
    const jsx = blocks
      .map((b) => {
        const styleParts = [
          `position:'absolute'`,
          `left:${Math.round(b.x)}`,
          `top:${Math.round(b.y)}`,
          `width:${Math.round(b.w)}`,
          `height:${Math.round(b.h)}`,
          `zIndex:${b.z || 1}`,
        ];
        if (b.props?.bg) styleParts.push(`background:'${b.props.bg}'`);
        if (b.props?.borderColor)
          styleParts.push(`borderColor:'${b.props.borderColor}'`);
        if (b.props?.outlineColor && b.props?.outline)
          styleParts.push(`outline:'2px solid ${b.props.outlineColor}'`);
        if (b.props?.boxShadow)
          styleParts.push(`boxShadow:'${b.props.boxShadow}'`);
        if (
          [
            "Text",
            "Heading",
            "Button",
            "Section",
            "List",
            "Tabs",
            "Accordion",
          ].includes(b.type)
        ) {
          if (b.props?.fontSize) {
            const size = Number(b.props.fontSize);
            if (!Number.isNaN(size)) styleParts.push(`fontSize:${size}`);
          }
          if (b.props?.fontWeight) {
            styleParts.push(`fontWeight:'${b.props.fontWeight}'`);
          }
          if (b.props?.color) {
            styleParts.push(`color:'${b.props.color}'`);
          }
          if (b.props?.textAlign) {
            styleParts.push(`textAlign:'${b.props.textAlign}'`);
          }
        }
        const style = `style={{${styleParts.join(",")}}}`;
        switch (b.type) {
          case "Section": {
            const heading =
              (b.props?.heading as string) ||
              EDITABLE_CONTENT.Section.defaultValue;
            return `<section ${style} className=\"rounded-lg border bg-background/40 p-6 space-y-2\"><h2 className=\"text-lg font-semibold\">${heading}</h2><p className=\"text-sm text-muted-foreground\">Section content placeholder</p></section>`;
          }
          case "Row":
            return `<div ${style} className=\"grid grid-cols-2 gap-4\"></div>`;
          case "Column":
            return `<div ${style} className=\"space-y-2\"></div>`;
          case "Spacer":
            return `<div ${style}></div>`;
          case "Divider":
            return `<hr ${style} />`;
          case "Grid":
            return `<div ${style} className=\"grid grid-cols-3 gap-3\"></div>`;
          case "Container":
            return `<div ${style} className=\"rounded-lg border p-4\"></div>`;
          case "Text": {
            const textValue =
              (b.props?.text as string) ?? EDITABLE_CONTENT.Text.defaultValue;
            return `<p ${style} className=\"text-sm leading-relaxed\">${textValue}</p>`;
          }
          case "Heading": {
            const headingText =
              (b.props?.text as string) ??
              EDITABLE_CONTENT.Heading.defaultValue;
            return `<h2 ${style} className=\"text-2xl font-bold\">${headingText}</h2>`;
          }
          case "Image":
            return `<img ${style} src=\"${b.props?.src || "/placeholder.svg"}\" alt=\"\" />`;
          case "Button":
            return `<button ${style} className=\"px-3 py-1 rounded-md border\">${b.props?.text || "Button"}</button>`;
          case "Video":
            return `<iframe ${style} src=\"${b.props?.src || ""}\" title=\"video\"></iframe>`;
          case "Icon":
            return `<span ${style} className=\"i-lucide-star\"></span>`;
          case "List": {
            const listText =
              (b.props?.items as string) ?? EDITABLE_CONTENT.List.defaultValue;
            const items = listText
              .split(/\n+/)
              .map((item) => item.trim())
              .filter(Boolean);
            const li =
              items.length > 0
                ? items.map((item) => `<li>${item}</li>`).join("")
                : "<li>List item</li>";
            return `<ul ${style} className=\"list-disc space-y-1 pl-5 text-sm\">${li}</ul>`;
          }
          case "Map":
            return `<iframe ${style} src=\"https://maps.google.com\" title=\"map\"></iframe>`;
          case "HTML":
            return `<div ${style} dangerouslySetInnerHTML={{__html:'<b>HTML</b>'}}></div>`;
          case "TextInput":
            return `<input ${style} className=\"rounded border px-2 py-1\" placeholder=\"Text\" />`;
          case "TextArea":
            return `<textarea ${style} className=\"rounded border px-2 py-1\" rows={3} placeholder=\"Message\" />`;
          case "Dropdown":
            return `<select ${style} className=\"rounded border px-2 py-1\"><option>Option</option></select>`;
          case "Checkbox":
            return `<label ${style} className=\"inline-flex items-center gap-2\"><input type=\"checkbox\"/> Check</label>`;
          case "Radio":
            return `<label ${style} className=\"inline-flex items-center gap-2\"><input type=\"radio\" name=\"r\"/> Option</label>`;
          case "FileUpload":
            return `<input ${style} type=\"file\" />`;
          case "DatePicker":
            return `<input ${style} type=\"date\" className=\"rounded border px-2 py-1\" />`;
          case "EmailInput":
            return `<input ${style} type=\"email\" className=\"rounded border px-2 py-1\" placeholder=\"you@example.com\" />`;
          case "Submit":
            return `<button ${style} className=\"px-3 py-1 rounded-md bg-primary text-primary-foreground\">Submit</button>`;
          case "Gallery":
            return `<div ${style} className=\"grid grid-cols-3 gap-2\">${Array.from(
              { length: 6 },
            )
              .map(
                (_, i) =>
                  `<img key=${"${i}"} src=\"/placeholder.svg\" alt=\"\"/>`,
              )
              .join("")}</div>`;
          case "Tabs": {
            const tabsText =
              (b.props?.items as string) ?? EDITABLE_CONTENT.Tabs.defaultValue;
            const tabs = tabsText
              .split(/\n+/)
              .map((tab) => tab.trim())
              .filter(Boolean);
            const buttons =
              tabs.length > 0
                ? tabs
                    .map(
                      (tab, idx) =>
                        `<button className=\"px-3 py-1 rounded ${idx === 0 ? "bg-primary text-primary-foreground" : "border"}\">${tab}</button>`,
                    )
                    .join("")
                : `<button className=\"px-3 py-1 rounded border\">Tab</button>`;
            return `<div ${style} className=\"flex items-center gap-2\">${buttons}</div>`;
          }
          case "Accordion": {
            const itemsText =
              (b.props?.items as string) ??
              EDITABLE_CONTENT.Accordion.defaultValue;
            const items = itemsText
              .split(/\n+/)
              .map((item) => item.trim())
              .filter(Boolean);
            const markup =
              items.length > 0
                ? items
                    .map(
                      (item) =>
                        `<details className=\"rounded border bg-background/40 p-2\"><summary className=\"font-medium\">${item}</summary><div className=\"mt-2 text-sm text-muted-foreground\">Content for ${item}</div></details>`,
                    )
                    .join("")
                : `<details className=\"rounded border bg-background/40 p-2\"><summary className=\"font-medium\">Item</summary><div className=\"mt-2 text-sm text-muted-foreground\">Content</div></details>`;
            return `<div ${style} className=\"space-y-2\">${markup}</div>`;
          }
          case "Carousel":
            return `<div ${style}>Carousel</div>`;
          case "Testimonials":
            return `<blockquote ${style}>“Great!”</blockquote>`;
          case "Pricing":
            return `<div ${style} className=\"grid md:grid-cols-3 gap-4\"><div className=\"rounded border p-4\">Plan</div></div>`;
          case "Modal":
            return `<div ${style} className=\"rounded border p-4\">Modal</div>`;
          case "Progress":
            return `<div ${style} className=\"w-full h-2 bg-muted\"><div className=\"h-full bg-primary\" style={{width:'40%'}}></div></div>`;
          case "Social":
            return `<div ${style} className=\"flex gap-2\"><a>FB</a><a>IG</a><a>TW</a></div>`;
          case "Calendar":
            return `<div ${style} className=\"rounded-md border p-2\"><div className=\"grid grid-cols-7 gap-1 text-center text-[11px]\">${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<div class=\\\"font-semibold\\\">${d}</div>`).join("")} ${Array.from(
              { length: 28 },
            )
              .map(
                (_, i) =>
                  `<div class=\\\"rounded hover:bg-muted cursor-pointer\\\">${i + 1}</div>`,
              )
              .join("")}</div></div>`;
          case "CodeSnippet": {
            const lang = b.props?.language || "text";
            const content = (b.props?.code || "").replace(/`/g, "\\`");
            return `<pre ${style} className=\"rounded-md border p-2 bg-muted/20 overflow-auto text-[11px]\"><code data-lang=\"${lang}\">${content}</code></pre>`;
          }
          case "Stack":
          case "SplitPane":
          case "Steps":
          case "PanelContainer":
          case "PanelToolbar":
          case "Dock":
          case "SidebarNav":
          case "Breadcrumbs":
          case "CommandPalette":
          case "MenuBar":
          case "Pagination":
          case "StatusBar":
          case "DataTable":
          case "VirtualList":
          case "TreeView":
          case "KanbanBoard":
          case "SchedulerTimeline":
          case "Chart":
          case "MetricTile":
          case "Avatar":
          case "Badge":
          case "TextField":
          case "RichText":
          case "Select":
          case "Combobox":
          case "Switch":
          case "DateRange":
          case "TimePicker":
          case "RangeSlider":
          case "ColorPicker":
          case "FileUploader":
          case "Form":
          case "Drawer":
          case "Popover":
          case "Tooltip":
          case "Toast":
          case "Spinner":
          case "ConfirmDialog":
          case "CodeBlock":
            return `<div ${style} className=\"rounded-md border border-dashed border-primary/40 bg-background/40 flex items-center justify-center text-xs uppercase tracking-wide tracking-[0.2em]\">${b.type}</div>`;
          default:
            return `<div ${style}></div>`;
        }
      })
      .join("\n");

    const out = `export default function Generated(){\n  return (\n    <main className=\"min-h-screen bg-background\">\n      <div className=\"relative container py-10\">\n        ${jsx}\n      </div>\n    </main>\n  );\n}`;
    setCode(out);
  }, [blocks, codeSync]);

  useEffect(() => {
    if (!codeSync) return;
    const normalizedDest = destPath.replace(/^\/+/, "");
    const targets = [{ relPath: "client/pages/Generated.tsx", contents: code }];
    if (normalizedDest && normalizedDest !== "client/pages/Generated.tsx") {
      targets.push({ relPath: normalizedDest, contents: code });
    }
    const timeout = window.setTimeout(() => {
      targets.forEach(async (payload) => {
        try {
          await fetch("/api/write-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (error) {
          console.warn("write-file failed", payload.relPath, error);
        }
      });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [code, codeSync, destPath]);

  useEffect(() => {
    const on = (e: any) => {
      navigate({ search: `task=Coder&tab=code` }, { replace: true });
    };
    window.addEventListener("echo:plan", on as any);
    return () => window.removeEventListener("echo:plan", on as any);
  }, []);

  // One-time daily snapshot on load
  useEffect(() => {
    const key = "studio.snapshot.date";
    const today = new Date().toISOString().slice(0, 10);
    const last = readStorage(key);
    if (last !== today) {
      fetch("/api/zaro/snapshot", { method: "POST" })
        .catch((error) => {
          console.warn("Snapshot failed:", error);
        })
        .finally(() => {
          writeStorage(key, today);
        });
    }
  }, []);

  useEffect(() => {
    try {
      const grid = document.getElementById("studio-grid") as HTMLElement | null;
      if (!grid) return;
      const storedValue = readStorage("coder.panelW");
      const stored = storedValue ? parseInt(storedValue, 10) : NaN;
      if (!isNaN(stored)) grid.style.gridTemplateColumns = `${stored}px 1fr`;
    } catch {}
  }, []);

  // Breakpoint detection for responsive layout
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";
  const isTablet = breakpoint === "md";
  const isDesktop = breakpoint === "lg" || breakpoint === "xl" || breakpoint === "2xl";

  // State for mobile/tablet panel visibility
  const [mobileShowChat, setMobileShowChat] = useState(true);

  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 text-sm">
          A rendering error occurred. Please try again.
        </div>
      }
    >
      <main className="w-full h-screen overflow-hidden flex flex-col py-0">
        {/* Responsive Layout Container */}
        <div
          id="studio-grid"
          className={`flex-1 overflow-hidden flex ${
            currentTask === "Scorecard"
              ? "flex-col"
              : isMobile
              ? "flex-col"
              : isTablet
              ? "flex-row"
              : "flex-row"
          }`}
        >
          {/* Left Panel - Chat (Responsive Visibility) */}
          {currentTask !== "Scorecard" && (
            <div
              className={`${
                isMobile
                  ? `${mobileShowChat ? "flex-1" : "hidden"} border-b`
                  : isTablet
                  ? "w-[25%] border-r overflow-y-auto"
                  : "w-[18%] border-r overflow-y-auto"
              } bg-background/50 backdrop-blur-sm`}
            >
              <ChatPanel
                className={`${
                  isMobile
                    ? "h-[300px] sm:h-[400px]"
                    : "self-start h-[calc(100vh-96px)] min-h-[620px]"
                }`}
                currentTask={currentTask}
                onTask={handleTaskSelect}
                layoutTemplate={layoutTemplate}
                setLayoutTemplate={setLayoutTemplate}
                onPlanSend={(text) => plan(text)}
                modules={modules}
                setModules={setModules}
                onShowSeed={() => setTab("seed")}
                role={role}
                setRole={setRole}
                githubDialog={githubDialog}
                setGithubDialog={setGithubDialog}
              />
            </div>
          )}

          {/* Mobile Tab Toggle */}
          {isMobile && currentTask !== "Scorecard" && (
            <div className="border-b bg-muted/30 px-3 py-2 flex gap-2">
              <Button
                variant={mobileShowChat ? "default" : "outline"}
                size="sm"
                onClick={() => setMobileShowChat(true)}
                className="h-8 text-xs flex-1"
              >
                Chat
              </Button>
              <Button
                variant={!mobileShowChat ? "default" : "outline"}
                size="sm"
                onClick={() => setMobileShowChat(false)}
                className="h-8 text-xs flex-1"
              >
                Studio
              </Button>
            </div>
          )}

          {/* Right Panel - Main Content */}
          <div
            className={`${
              isMobile
                ? `${!mobileShowChat ? "flex-1" : "hidden"}`
                : isTablet
                ? "flex-1"
                : "flex-1"
            } overflow-y-auto space-y-6 relative min-h-[calc(100vh-96px)]`}
          >
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v);
                const q = new URLSearchParams(location.search);
                q.set("tab", v);
                navigate({ search: q.toString() }, { replace: true });
              }}
            >
              <TabsList
                className={`mb-6 flex gap-1 sm:gap-2 bg-transparent border-0 overflow-x-auto ${
                  isMobile
                    ? "relative w-full justify-start -top-0 right-0 z-50 mb-4 px-4 flex-wrap"
                    : "absolute -top-14 right-4 z-50"
                }`}
              >
                <TabsTrigger value="design" className="text-xs sm:text-sm whitespace-nowrap">
                  Design
                </TabsTrigger>
                <TabsTrigger value="interact" className="text-xs sm:text-sm whitespace-nowrap">
                  Interact
                </TabsTrigger>
                <TabsTrigger value="code" className="text-xs sm:text-sm whitespace-nowrap">
                  Code
                </TabsTrigger>
                <TabsTrigger value="seed" className="text-xs sm:text-sm whitespace-nowrap">
                  Seed
                </TabsTrigger>
                <TabsTrigger value="tier1" className="text-xs sm:text-sm whitespace-nowrap">
                  Tier 1
                </TabsTrigger>
                <TabsTrigger value="tier2" className="text-xs sm:text-sm whitespace-nowrap">
                  Tier 2
                </TabsTrigger>
                <TabsTrigger value="tier3" className="text-xs sm:text-sm whitespace-nowrap">
                  Tier 3
                </TabsTrigger>
                <TabsTrigger value="tier4" className="text-xs sm:text-sm whitespace-nowrap">
                  Tier 4
                </TabsTrigger>
              </TabsList>
              <TabsContent value="design">
                <div
                  className={`grid gap-2 sm:gap-3 md:gap-4 ${
                    isMobile
                      ? "grid-cols-1"
                      : isTablet
                      ? "grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]"
                      : "grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]"
                  }`}
                >
                  <div
                    className={`space-y-2 sm:space-y-3 ${
                      isMobile
                        ? "max-h-[200px] sm:max-h-[300px] overflow-y-auto pr-2"
                        : "h-[calc(100vh-180px)] overflow-y-auto pr-2"
                    }`}
                  >
                    <CollapsibleToolSection
                      title={isMobile ? "Components" : "Component library"}
                      description={isMobile ? undefined : "Insert layout primitives and modules."}
                      defaultOpen={!isMobile}
                    >
                      <DesignMenuBar onAdd={addBlock} />
                    </CollapsibleToolSection>

                    <CollapsibleToolSection
                      title="Figma"
                      description={isMobile ? undefined : "Pin live Figma frames."}
                      defaultOpen={false}
                    >
                      <FigmaToolkit
                        figmaUrl={figmaUrl}
                        onUrlChange={setFigmaUrl}
                      />
                    </CollapsibleToolSection>

                    <CollapsibleToolSection
                      title="Assets"
                      description={isMobile ? undefined : "Generate icons and logos."}
                      defaultOpen={false}
                    >
                      <ImageGeneratorPanel />
                    </CollapsibleToolSection>

                    <CollapsibleToolSection
                      title="Canvas"
                      description={isMobile ? undefined : "Manage history and inserts."}
                      defaultOpen={!isMobile}
                    >
                      <div className={`space-y-2 sm:space-y-4`}>
                        <div
                          className={`grid ${
                            isMobile ? "grid-cols-2" : "grid-cols-2"
                          } gap-2`}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={undo}
                            disabled={!canUndo}
                            title="Undo (Ctrl+Z)"
                          >
                            Undo
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={redo}
                            disabled={!canRedo}
                            title="Redo (Ctrl+Shift+Z)"
                          >
                            Redo
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDuplicateBlock}
                            disabled={!selectedBlock}
                            title="Duplicate (Ctrl+D)"
                          >
                            Duplicate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={deleteSelectedBlock}
                            disabled={!selectedBlock}
                            title="Delete (Del)"
                          >
                            Delete
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={clearAllBlocks}
                            disabled={blocks.length === 0}
                            title="Clear all blocks"
                          >
                            Clear all
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              addBlock("Orb", { w: 140, h: 140, x: 720, y: 20 })
                            }
                          >
                            Insert Orb
                          </Button>
                        </div>
                        <AddonToolbar
                          onInsert={(lang, code) =>
                            addBlock("CodeSnippet", { language: lang, code })
                          }
                        />
                      </div>
                    </CollapsibleToolSection>

                    <CollapsibleToolSection
                      title="Inspector"
                      description="Adjust position and appearance."
                      defaultOpen={!!selectedBlock}
                    >
                      <DesignInspector
                        block={selectedBlock as DesignInspectorBlock | null}
                        onPositionChange={handleInspectorPositionChange}
                        onPropsChange={handleInspectorPropsChange}
                        onLayer={handleInspectorLayer}
                        onAlign={handleInspectorAlign}
                        onEffect={handleInspectorEffect}
                        onDuplicate={handleDuplicateBlock}
                        onDelete={deleteSelectedBlock}
                        onBeginInlineEdit={() => {
                          if (selectedBlock) beginInlineEdit(selectedBlock);
                        }}
                      />
                    </CollapsibleToolSection>
                  </div>
                  <Card className="border border-primary/25 bg-background/80 shadow-[0_24px_42px_rgba(15,118,255,0.18)] backdrop-blur relative overflow-hidden">
                    <CanvasToolbar
                      onUndo={undo}
                      onRedo={redo}
                      onDelete={deleteSelectedBlock}
                      onDuplicate={handleDuplicateBlock}
                      onClearAll={clearAllBlocks}
                      onInsertOrb={() => addBlock("Orb", { w: 140, h: 140, x: 720, y: 20 })}
                      canUndo={canUndo}
                      canRedo={canRedo}
                      hasSelection={!!selectedBlock}
                    />
                    <CardHeader className={`flex flex-col gap-1 sm:gap-2 ${
                      isMobile ? "pt-12 pb-2" : "sm:flex-row sm:items-center sm:justify-between pt-16"
                    } relative z-20`}>
                      <div>
                        <CardTitle className={isMobile ? "text-sm" : "text-base"}>
                          Design canvas
                        </CardTitle>
                        {!isMobile && (
                          <CardDescription className="text-xs">
                            Drag components onto the grid and snap them into place.
                          </CardDescription>
                        )}
                      </div>
                      <div className={`text-[11px] sm:text-xs text-muted-foreground ${
                        isMobile ? "truncate" : ""
                      }`}>
                        Selected:{" "}
                        {selectedBlock
                          ? `${selectedBlock.type}${isMobile ? "" : ` · #${selectedBlock.id}`}`
                          : "None"}
                      </div>
                    </CardHeader>
                    <CardContent className={`space-y-2 sm:space-y-4 ${
                      isMobile ? "p-2 sm:p-4" : "p-4"
                    }`}>
                      <div
                        ref={canvasRef}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        className={`relative rounded-lg border overflow-hidden bg-background/30 ${
                          isMobile
                            ? "h-[300px] sm:h-[400px]"
                            : isTablet
                            ? "h-[calc(100vh-240px)]"
                            : "h-[calc(100vh-200px)]"
                        }`}
                        style={{
                          backgroundImage:
                            "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
                          backgroundSize: `${GRID}px ${GRID}px`,
                        }}
                      >
                        <iframe
                          key={previewKey}
                          title="design-live-preview"
                          src="/sandbox/generated"
                          className="pointer-events-none absolute inset-0 h-full w-full"
                        />
                        <div className="absolute inset-0">
                          {blocks.map((b) => {
                            const isSel = selectedId === b.id;
                            const editableMeta = EDITABLE_CONTENT[b.type];
                            const isEditing = editingBlock?.id === b.id;
                            const style: CSSProperties = {
                              left: b.x,
                              top: b.y,
                              width: b.w,
                              height: b.h,
                              zIndex: b.z,
                              position: "absolute",
                              background: b.props?.bg,
                              boxShadow: b.props?.boxShadow,
                              outline: b.props?.outline
                                ? `2px solid ${b.props?.outlineColor || "#00e5ff"}`
                                : undefined,
                              borderColor: b.props?.borderColor,
                            };
                            const showBorder = b.props?.bordered !== false;
                            const Preview = (() => {
                              switch (b.type) {
                                case "Section":
                                  return (
                                    <div className="h-full w-full rounded-lg border border-dashed border-white/10 bg-background/60 p-3">
                                      <div
                                        className="text-sm font-semibold"
                                        style={textStyleFromProps(b.props)}
                                      >
                                        {(b.props?.heading as string) ??
                                          EDITABLE_CONTENT.Section.defaultValue}
                                      </div>
                                      <div className="mt-2 text-[11px] text-muted-foreground">
                                        Section content area
                                      </div>
                                    </div>
                                  );
                                case "Divider":
                                  return (
                                    <div className="w-full">
                                      <div className="mx-3 h-px bg-muted" />
                                    </div>
                                  );
                                case "Text": {
                                  const textValue =
                                    (b.props?.text as string) ??
                                    EDITABLE_CONTENT.Text.defaultValue;
                                  return (
                                    <div
                                      className="flex h-full w-full items-center px-2 text-xs text-foreground/90"
                                      style={textStyleFromProps(b.props)}
                                    >
                                      {textValue}
                                    </div>
                                  );
                                }
                                case "Heading": {
                                  const headingText =
                                    (b.props?.text as string) ??
                                    EDITABLE_CONTENT.Heading.defaultValue;
                                  return (
                                    <div
                                      className="flex h-full w-full items-center px-2 text-sm font-semibold"
                                      style={textStyleFromProps(b.props)}
                                    >
                                      {headingText}
                                    </div>
                                  );
                                }
                                case "Image":
                                  return b.props?.src ? (
                                    <img
                                      src={b.props.src}
                                      alt=""
                                      className="object-contain w-full h-full"
                                    />
                                  ) : (
                                    <div className="grid place-items-center h-full w-full bg-muted/20">
                                      <div className="text-[10px] text-muted-foreground">
                                        Image
                                      </div>
                                    </div>
                                  );
                                case "Button": {
                                  const btnText =
                                    (b.props?.text as string) ??
                                    EDITABLE_CONTENT.Button.defaultValue;
                                  return (
                                    <div className="grid h-full place-items-center">
                                      <button
                                        className="px-3 py-1 rounded-md border bg-background shadow-sm"
                                        style={textStyleFromProps(b.props)}
                                      >
                                        {btnText}
                                      </button>
                                    </div>
                                  );
                                }
                                case "Card":
                                  return (
                                    <div className="h-full w-full rounded-md border bg-background/80" />
                                  );
                                case "Map":
                                  return (
                                    <div className="h-full w-full bg-[repeating-linear-gradient(45deg,rgba(0,0,0,.2)_0,rgba(0,0,0,.2)_2px,transparent_2px,transparent_6px)]" />
                                  );
                                case "Dropdown":
                                  return (
                                    <div className="grid place-items-center h-full">
                                      <div className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[11px]">
                                        Select <span>���</span>
                                      </div>
                                    </div>
                                  );
                                case "Tabs": {
                                  const tabsText =
                                    (b.props?.items as string) ??
                                    EDITABLE_CONTENT.Tabs.defaultValue;
                                  const tabs = tabsText
                                    .split(/\n+/)
                                    .map((t) => t.trim())
                                    .filter(Boolean);
                                  return (
                                    <div
                                      className="flex h-full items-center gap-1 px-2 text-[11px]"
                                      style={textStyleFromProps(b.props)}
                                    >
                                      {tabs.map((tab, idx) => (
                                        <span
                                          key={idx}
                                          className={`rounded px-2 py-0.5 ${idx === 0 ? "bg-muted" : "border"}`}
                                        >
                                          {tab}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                }
                                case "Accordion": {
                                  const itemsText =
                                    (b.props?.items as string) ??
                                    EDITABLE_CONTENT.Accordion.defaultValue;
                                  const items = itemsText
                                    .split(/\n+/)
                                    .map((item) => item.trim())
                                    .filter(Boolean);
                                  return (
                                    <div
                                      className="px-2 text-[11px]"
                                      style={textStyleFromProps(b.props)}
                                    >
                                      {items.map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="mb-1 rounded border px-2 py-1"
                                        >
                                          {item}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                case "Carousel":
                                  return (
                                    <div className="flex gap-2 px-2 py-1">
                                      <div className="h-6 w-8 rounded bg-muted" />
                                      <div className="h-6 w-8 rounded bg-muted" />
                                      <div className="h-6 w-8 rounded bg-muted" />
                                    </div>
                                  );
                                case "Orb":
                                  return (
                                    <EchoOrb
                                      bare
                                      className="w-full h-full"
                                      pattern={
                                        (readStorage("orb.pattern") as any) ||
                                        "classic"
                                      }
                                    />
                                  );
                                case "TextInput":
                                  return (
                                    <div className="grid place-items-center h-full">
                                      <input
                                        className="rounded border px-2 py-1 text-[11px]"
                                        placeholder="Text"
                                      />
                                    </div>
                                  );
                                case "TextArea":
                                  return (
                                    <div className="grid place-items-center h-full">
                                      <textarea
                                        className="rounded border px-2 py-1 text-[11px]"
                                        rows={2}
                                        placeholder="Message"
                                      />
                                    </div>
                                  );
                                case "Checkbox":
                                  return (
                                    <div className="grid place-items-center h-full">
                                      <label className="inline-flex items-center gap-2 text-[11px]">
                                        <input type="checkbox" /> Check
                                      </label>
                                    </div>
                                  );
                                case "List": {
                                  const listText =
                                    (b.props?.items as string) ??
                                    EDITABLE_CONTENT.List.defaultValue;
                                  const items = listText
                                    .split(/\n+/)
                                    .map((item) => item.trim())
                                    .filter(Boolean);
                                  return (
                                    <ul
                                      className="h-full w-full list-disc space-y-1 px-4 py-2 text-xs"
                                      style={textStyleFromProps(b.props)}
                                    >
                                      {items.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                      ))}
                                    </ul>
                                  );
                                }
                                case "Gallery":
                                  return (
                                    <div className="grid grid-cols-3 gap-1 p-1">
                                      <div className="h-6 bg-muted" />
                                      <div className="h-6 bg-muted" />
                                      <div className="h-6 bg-muted" />
                                    </div>
                                  );
                                case "Calendar":
                                  return (
                                    <div className="p-1 grid grid-cols-7 gap-1 text-[10px]">
                                      {["S", "M", "T", "W", "T", "F", "S"].map(
                                        (d) => (
                                          <div
                                            key={d}
                                            className="text-center font-semibold"
                                          >
                                            {d}
                                          </div>
                                        ),
                                      )}
                                      {Array.from({ length: 21 }).map(
                                        (_, i) => (
                                          <div
                                            key={i}
                                            className="rounded bg-muted/30"
                                          />
                                        ),
                                      )}
                                    </div>
                                  );
                                case "CodeSnippet":
                                  return (
                                    <div className="h-full w-full p-1 text-[10px] font-mono overflow-hidden">
                                      <div className="mb-1 text-[10px] opacity-70">
                                        {b.props?.language || "code"}
                                      </div>
                                      <pre className="whitespace-pre-wrap overflow-hidden">
                                        {b.props?.code || ""}
                                      </pre>
                                    </div>
                                  );
                                default:
                                  return (
                                    <div className="h-full flex items-center justify-center rounded border border-dashed border-primary/40 bg-primary/5 text-[10px] uppercase tracking-[0.2em] text-primary/80 select-none">
                                      {b.type}
                                    </div>
                                  );
                              }
                            })();
                            return (
                              <div
                                key={b.id}
                                style={style}
                                onPointerDown={(e) => {
                                  if (isEditing) return;
                                  setSelectedId(b.id);
                                  onPointerDown(e, b.id);
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setSelectedId(b.id);
                                  if (isEditing) return;
                                  setMenu({
                                    open: true,
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                                }}
                                onDoubleClick={(e) => {
                                  if (!editableMeta) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  beginInlineEdit(b);
                                }}
                                className={`group pointer-events-auto rounded-md ${showBorder ? "border border-primary/30" : "border border-transparent"} bg-transparent text-[11px] cursor-move shadow-sm transition ${isSel ? "ring-2 ring-primary/70" : "hover:border-primary/40"} ${isEditing ? "ring-2 ring-primary/80 shadow-lg" : ""}`}
                              >
                                <div className="absolute inset-0 pointer-events-none rounded-md border border-white/10 group-hover:border-primary/50" />
                                <div
                                  className={`relative h-full w-full ${isEditing ? "pointer-events-auto" : "pointer-events-none"}`}
                                >
                                  {isEditing && editableMeta ? (
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        commitInlineEdit();
                                      }}
                                      className="flex h-full flex-col gap-2 rounded-md bg-background/95 p-2 text-xs shadow-lg"
                                    >
                                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        {editableMeta.label}
                                      </div>
                                      {editingBlock?.multiline ? (
                                        <textarea
                                          value={editingValue}
                                          onChange={(e) =>
                                            setEditingValue(e.target.value)
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Escape") {
                                              e.preventDefault();
                                              cancelInlineEdit();
                                            }
                                            if (
                                              (e.ctrlKey || e.metaKey) &&
                                              e.key === "Enter"
                                            ) {
                                              e.preventDefault();
                                              commitInlineEdit();
                                            }
                                          }}
                                          className="min-h-[60px] flex-1 rounded border bg-background px-2 py-1 text-sm leading-6"
                                          autoFocus
                                        />
                                      ) : (
                                        <input
                                          value={editingValue}
                                          onChange={(e) =>
                                            setEditingValue(e.target.value)
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Escape") {
                                              e.preventDefault();
                                              cancelInlineEdit();
                                            }
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              commitInlineEdit();
                                            }
                                          }}
                                          className="rounded border bg-background px-2 py-1 text-sm"
                                          autoFocus
                                        />
                                      )}
                                      <div className="mt-auto flex justify-end gap-2">
                                        <button
                                          type="button"
                                          className="rounded border px-2 py-1 text-[11px] uppercase tracking-wide"
                                          onClick={cancelInlineEdit}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="submit"
                                          className="rounded bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <div className="h-full w-full">
                                      {Preview}
                                    </div>
                                  )}
                                </div>
                                {!isEditing && (
                                  <button
                                    onPointerDown={(e) => onResizeDown(e, b.id)}
                                    className="absolute -right-1 -bottom-1 h-3 w-3 rounded-sm bg-primary shadow"
                                    title="Resize"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {menu.open && (
                          <div
                            style={{ left: menu.x, top: menu.y }}
                            className="fixed z-50 min-w-[180px] rounded-md border bg-popover p-1 text-xs shadow-lg"
                          >
                            <button
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                              onClick={() => {
                                handleInspectorLayer("front");
                                setMenu({ open: false, x: 0, y: 0 });
                              }}
                            >
                              Bring to front
                            </button>
                            <button
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                              onClick={() => {
                                handleInspectorLayer("back");
                                setMenu({ open: false, x: 0, y: 0 });
                              }}
                            >
                              Send to back
                            </button>
                            <button
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                              onClick={() => {
                                handleInspectorLayer("up");
                                setMenu({ open: false, x: 0, y: 0 });
                              }}
                            >
                              Move forward
                            </button>
                            <button
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                              onClick={() => {
                                handleInspectorLayer("down");
                                setMenu({ open: false, x: 0, y: 0 });
                              }}
                            >
                              Move backward
                            </button>
                            <div className="h-px my-1 bg-muted" />
                            <div className="px-2 py-1 text-[11px] font-medium opacity-70">
                              Arrange
                            </div>
                            <div className="grid grid-cols-2 gap-1 px-2 pb-1">
                              <button
                                className="text-left px-2 py-1 rounded hover:bg-accent"
                                onClick={() => {
                                  handleInspectorAlign("left");
                                  setMenu({ open: false, x: 0, y: 0 });
                                }}
                              >
                                Align left
                              </button>
                              <button
                                className="text-left px-2 py-1 rounded hover:bg-accent"
                                onClick={() => {
                                  handleInspectorAlign("center");
                                  setMenu({ open: false, x: 0, y: 0 });
                                }}
                              >
                                Center H
                              </button>
                              <button
                                className="text-left px-2 py-1 rounded hover:bg-accent"
                                onClick={() => {
                                  handleInspectorAlign("right");
                                  setMenu({ open: false, x: 0, y: 0 });
                                }}
                              >
                                Align right
                              </button>
                              <button
                                className="text-left px-2 py-1 rounded hover:bg-accent"
                                onClick={() => {
                                  handleInspectorAlign("top");
                                  setMenu({ open: false, x: 0, y: 0 });
                                }}
                              >
                                Align top
                              </button>
                              <button
                                className="text-left px-2 py-1 rounded hover:bg-accent"
                                onClick={() => {
                                  handleInspectorAlign("middle");
                                  setMenu({ open: false, x: 0, y: 0 });
                                }}
                              >
                                Center V
                              </button>
                              <button
                                className="text-left px-2 py-1 rounded hover:bg-accent"
                                onClick={() => {
                                  handleInspectorAlign("bottom");
                                  setMenu({ open: false, x: 0, y: 0 });
                                }}
                              >
                                Align bottom
                              </button>
                            </div>
                            <div className="h-px my-1 bg-muted" />
                            <label className="flex items-center justify-between gap-2 px-2 py-1.5">
                              <span>Fill color</span>
                              <input
                                type="color"
                                onChange={(e) => {
                                  handleInspectorPropsChange({
                                    bg: e.target.value,
                                  });
                                }}
                              />
                            </label>
                            <label className="flex items-center justify-between gap-2 px-2 py-1.5">
                              <span>Border</span>
                              <input
                                type="checkbox"
                                checked={
                                  !!blocks.find((b) => b.id === selectedId)
                                    ?.props?.bordered !== false
                                }
                                onChange={(e) => {
                                  handleInspectorPropsChange({
                                    bordered: e.target.checked,
                                  });
                                }}
                              />
                            </label>
                            <label className="flex items-center justify-between gap-2 px-2 py-1.5">
                              <span>Border color</span>
                              <input
                                type="color"
                                onChange={(e) => {
                                  handleInspectorPropsChange({
                                    borderColor: e.target.value,
                                    bordered: true,
                                  });
                                }}
                              />
                            </label>
                            <label className="flex items-center justify-between gap-2 px-2 py-1.5">
                              <span>Outline</span>
                              <input
                                type="checkbox"
                                checked={
                                  !!blocks.find((b) => b.id === selectedId)
                                    ?.props?.outline
                                }
                                onChange={(e) => {
                                  handleInspectorPropsChange({
                                    outline: e.target.checked,
                                  });
                                }}
                              />
                            </label>
                            <label className="flex items-center justify-between gap-2 px-2 py-1.5">
                              <span>Outline color</span>
                              <input
                                type="color"
                                onChange={(e) => {
                                  handleInspectorPropsChange({
                                    outlineColor: e.target.value,
                                    outline: true,
                                  });
                                }}
                              />
                            </label>
                            {selectedBlock &&
                              EDITABLE_CONTENT[selectedBlock.type] && (
                                <>
                                  <div className="h-px my-1 bg-muted" />
                                  <div className="px-2 py-1 text-[11px] font-medium opacity-70">
                                    Typography
                                  </div>
                                  <label className="flex items-center justify-between gap-2 px-2 py-1.5">
                                    <span>Font size</span>
                                    <input
                                      type="number"
                                      min={10}
                                      max={96}
                                      value={
                                        selectedBlock.props?.fontSize ?? 16
                                      }
                                      onChange={(e) => {
                                        const size =
                                          Number(e.target.value) || 16;
                                        handleInspectorPropsChange({
                                          fontSize: size,
                                        });
                                      }}
                                      className="w-16 rounded border bg-background px-2 py-1 text-right text-[11px]"
                                    />
                                  </label>
                                  <label className="flex items-center justify-between gap-2 px-2 py-1.5">
                                    <span>Font weight</span>
                                    <select
                                      value={
                                        selectedBlock.props?.fontWeight ||
                                        "normal"
                                      }
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        handleInspectorPropsChange({
                                          fontWeight:
                                            value === "normal"
                                              ? undefined
                                              : value,
                                        });
                                      }}
                                      className="w-24 rounded border bg-background px-2 py-1 text-[11px]"
                                    >
                                      <option value="normal">Normal</option>
                                      <option value="500">Medium</option>
                                      <option value="600">Semibold</option>
                                      <option value="700">Bold</option>
                                    </select>
                                  </label>
                                  <label className="flex items-center justify-between gap-2 px-2 py-1.5">
                                    <span>Text color</span>
                                    <input
                                      type="color"
                                      value={
                                        selectedBlock.props?.color || "#e2e8f0"
                                      }
                                      onChange={(e) => {
                                        handleInspectorPropsChange({
                                          color: e.target.value,
                                        });
                                      }}
                                    />
                                  </label>
                                  <label className="flex items-center justify-between gap-2 px-2 py-1.5">
                                    <span>Align</span>
                                    <select
                                      value={
                                        selectedBlock.props?.textAlign || "left"
                                      }
                                      onChange={(e) => {
                                        handleInspectorPropsChange({
                                          textAlign: e.target.value,
                                        });
                                      }}
                                      className="w-24 rounded border bg-background px-2 py-1 text-[11px]"
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                    </select>
                                  </label>
                                </>
                              )}
                            <button
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                              onClick={() => {
                                handleInspectorEffect("drop-shadow");
                                setMenu({ open: false, x: 0, y: 0 });
                              }}
                            >
                              Drop shadow
                            </button>
                            <button
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                              onClick={() => {
                                handleInspectorEffect("glow");
                                setMenu({ open: false, x: 0, y: 0 });
                              }}
                            >
                              Glow
                            </button>
                            <button
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                              onClick={() => {
                                const blk = blocks.find(
                                  (b) => b.id === selectedId,
                                );
                                if (!blk) return;
                                const snippet =
                                  blk.type === "Calendar"
                                    ? `import { useState } from 'react'\nexport default function Calendar(){ /* basic calendar */ return (<div className=\"grid grid-cols-7 gap-1\">{Array.from({length:30}).map((_,i)=> <div key={i} className=\"rounded hover:bg-muted cursor-pointer\">{i+1}</div>)}</div>); }`
                                    : `export default function ${blk.type}(){ return (<div>${blk.type}</div>); }`;
                                setCodeDraft(snippet);
                                setCodeOpen(true);
                                setMenu({ open: false, x: 0, y: 0 });
                              }}
                            >
                              Edit code for block
                            </button>
                            <div className="h-px my-1 bg-muted" />
                            <button
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-destructive"
                              onClick={deleteSelectedBlock}
                            >
                              Delete
                            </button>
                            <button
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                              onClick={() =>
                                setMenu({ open: false, x: 0, y: 0 })
                              }
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="interact" className={isMobile ? "px-2" : ""}>
                {currentTask === "Scorecard" ? (
                  <div className={`grid gap-3 sm:gap-6`}>
                    <Suspense
                      fallback={
                        <div className="p-4 sm:p-6 text-xs sm:text-sm">
                          Loading scorecard…
                        </div>
                      }
                    >
                      <ScorecardPanel />
                    </Suspense>
                    {code && (
                      <Suspense
                        fallback={
                          <div className="p-4 sm:p-6 text-xs sm:text-sm">
                            Loading automation panel…
                          </div>
                        }
                      >
                        <AutomationPanel
                          generatedCode={code}
                          moduleName="Generated Module"
                        />
                      </Suspense>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardHeader className={`space-y-2 sm:space-y-3 ${isMobile ? "p-3" : "p-6"}`}>
                      <div className={`flex ${
                        isMobile ? "flex-col gap-2" : "flex-wrap items-center justify-between gap-3"
                      }`}>
                        <div className={`flex ${
                          isMobile ? "flex-col gap-1" : "min-w-0 items-center gap-2"
                        }`}>
                          <div>
                            <CardTitle className={isMobile ? "text-base" : "text-xl"}>
                              Live Operations
                            </CardTitle>
                            {!isMobile && (
                              <CardDescription className="text-xs">
                                Coordinate runtime preview, guard rails, and
                                engagements.
                              </CardDescription>
                            )}
                          </div>
                          <Badge variant={statusBadgeVariant} className={isMobile ? "w-fit text-xs" : ""}>
                            {statusLabel}
                          </Badge>
                        </div>
                        <div className={`flex flex-wrap items-center gap-1 sm:gap-2 ${
                          isMobile ? "w-full flex-col" : ""
                        }`}>
                          <Button
                            size={isMobile ? "xs" : "sm"}
                            onClick={handleStartLive}
                            disabled={interactionState === "live"}
                            className={isMobile ? "w-full" : ""}
                          >
                            {isMobile ? "Start" : "Start session"}
                          </Button>
                          <Button
                            size={isMobile ? "xs" : "sm"}
                            variant="secondary"
                            onClick={handlePauseLive}
                            disabled={interactionState !== "live"}
                            className={isMobile ? "w-full" : ""}
                          >
                            Pause
                          </Button>
                          <Button
                            size={isMobile ? "xs" : "sm"}
                            variant="outline"
                            onClick={handleSyncPreview}
                            disabled={syncingPreview}
                            className={isMobile ? "w-full" : ""}
                          >
                            {syncingPreview ? "Syncing…" : isMobile ? "Sync" : "Sync preview"}
                          </Button>
                          <Button
                            size={isMobile ? "xs" : "sm"}
                            variant="outline"
                            onClick={() =>
                              window.open("/sandbox/generated", "_blank")
                            }
                            className={isMobile ? "w-full" : ""}
                          >
                            {isMobile ? "Preview" : "Open preview"}
                          </Button>
                          {!isMobile && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  toast({
                                    title: "Red Phoenix diagnostic",
                                    description:
                                      "Splash screen will appear briefly in test mode.",
                                  });
                                  if (typeof window !== "undefined") {
                                    window.dispatchEvent(
                                      new CustomEvent("guard:test-red-phoenix", {
                                        detail: {
                                          message: "Red Phoenix systems check",
                                        },
                                      }),
                                    );
                                  }
                                }}
                              >
                                Test Red Phoenix
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleEscalate}
                                disabled={escalating || guardUnavailable}
                              >
                                {escalating ? "Escalating…" : "Escalate"}
                              </Button>
                              {guardStatus?.alert === "defcon1" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleClearAlert}
                                  disabled={clearingAlert || guardUnavailable}
                                >
                                  {clearingAlert ? "Clearing…" : "Clear alert"}
                                </Button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                      {!isMobile && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Last sync: {lastSyncLabel}</span>
                          <span>
                            Destination path:
                            <code className="ml-1 rounded bg-muted/40 px-1 py-0.5 text-[11px]">
                              {destPath || "not set"}
                            </code>
                          </span>
                          <span>
                            Guard: {guardDetail}
                            {guardSinceLabel ? ` (since ${guardSinceLabel})` : ""}
                          </span>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className={`flex flex-col gap-2 sm:gap-4 ${isMobile ? "p-3" : "p-6"}`}>
                      <div className={`grid w-full gap-2 sm:gap-3 ${
                        isMobile
                          ? "grid-cols-1"
                          : "sm:grid-cols-[minmax(220px,260px)_minmax(260px,1fr)]"
                      }`}>
                        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                          <span>Project</span>
                          <select
                            value={projectName}
                            onChange={(e) => {
                              const v = (e.target as HTMLSelectElement).value;
                              let name = v;
                              if (v === "__new__") {
                                const input =
                                  window.prompt("Project name", projectName) ||
                                  projectName;
                                name =
                                  (input || projectName).toString().trim() ||
                                  projectName;
                              }
                              setProjectName(name);
                              try {
                                if (/^client\//.test(destPath))
                                  setDestPath(`client/projects/${name}.tsx`);
                              } catch {}
                            }}
                            className={mergeControlClasses("h-8 text-xs")}
                          >
                            <option value="Playground">Playground</option>
                            {projectName && projectName !== "Playground" ? (
                              <option value={projectName}>{projectName}</option>
                            ) : null}
                            <option value="__new__">New���</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                          <span>Destination file</span>
                          <input
                            value={destPath}
                            onChange={(e) => setDestPath(e.target.value)}
                            className={mergeControlClasses("h-8 text-xs")}
                          />
                        </label>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Active selection: {selected || "None"}
                      </div>
                      <div
                        className="relative overflow-hidden rounded-lg border"
                        style={{
                          width: "100%",
                        }}
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-2 text-center text-xs font-semibold opacity-80">
                          {projectName}
                        </div>
                        <iframe
                          ref={iframeRef}
                          key={previewKey}
                          title="preview"
                          src="/sandbox/generated"
                          className="h-[calc(100vh-210px)] w-full bg-white"
                        ></iframe>
                      </div>
                      {cssExport && (
                        <div className="rounded-md border bg-muted/15 p-2 text-[11px]">
                          <div className="mb-1 font-medium">
                            Latest CSS overrides
                          </div>
                          <pre className="max-h-40 overflow-auto whitespace-pre-wrap">
                            {cssExport}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="code" className={`min-h-[${
                isMobile ? "400px" : "calc(100vh-140px)"
              }] ${isMobile ? "px-2" : ""}`}>
                <Card className={`flex flex-col border border-primary/25 shadow-[0_32px_75px_rgba(15,118,255,0.18)] backdrop-blur-md ${
                  isMobile ? "h-auto" : "h-full"
                }`}>
                  <CardHeader>
                    <CardTitle>Code</CardTitle>
                    <CardDescription>
                      Explore project files. Click a file to open in a tab.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="flex-1 overflow-hidden">
                      <ErrorBoundary
                        fallback={
                          <div className="rounded border p-2 text-xs text-red-600">
                            Failed to render file viewer.
                          </div>
                        }
                      >
                        <CodeExplorer
                          editablePaths={["/" + destPath.replace(/^\/+/, "")]}
                          onOpenGithub={() =>
                            setGithubDialog((prev) => ({ ...prev, open: true }))
                          }
                          initialActivePath={"/" + destPath.replace(/^\/+/, "")}
                          filesOverride={codeOverrides}
                        />
                      </ErrorBoundary>
                    </div>
                    <div className="pt-0">
                      <div className="text-xs font-medium mb-1">Notes</div>
                      <textarea
                        defaultValue={readStorage("studio.codeNotes") || ""}
                        onChange={(e) => {
                          writeStorage("studio.codeNotes", e.target.value);
                        }}
                        placeholder="Notes for this work session..."
                        className="w-full h-24 rounded-md border bg-background p-2 text-xs"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seed" className={`p-0 ${isMobile ? "px-2" : ""}`}>
                <Tabs defaultValue="generator" className={`w-full flex flex-col ${
                  isMobile ? "h-auto" : "h-full"
                }`}>
                  <TabsList className="rounded-none border-b w-full justify-start">
                    <TabsTrigger value="generator">Generator</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="feedback">Feedback</TabsTrigger>
                    <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
                  </TabsList>

                  <TabsContent value="generator" className="flex-1 overflow-auto p-4">
                    <NewStudioLayout initialIdea="" />
                  </TabsContent>

                  <TabsContent value="analytics" className="flex-1 overflow-auto p-4">
                    <Suspense fallback={<div className="p-4">Loading analytics...</div>}>
                      <AI3AnalyticsDashboard userId="current-user" />
                    </Suspense>
                  </TabsContent>

                  <TabsContent value="feedback" className="flex-1 overflow-auto p-4">
                    <Suspense fallback={<div className="p-4">Loading feedback panel...</div>}>
                      <div className="max-w-2xl">
                        <AI3FeedbackPanel
                          sessionId="demo-session"
                          onSubmitSuccess={() => setTab("seed")}
                        />
                      </div>
                    </Suspense>
                  </TabsContent>

                  <TabsContent value="collaboration" className="flex-1 overflow-auto p-4">
                    <Suspense fallback={<div className="p-4">Loading collaboration tools...</div>}>
                      <div className="max-w-2xl">
                        <AI3CollaborationPanel sessionId="demo-session" />
                      </div>
                    </Suspense>
                  </TabsContent>
                </Tabs>
                {/* Old UI hidden - replaced with NewStudioLayout above */}
                <div className="hidden">
                  <PlannerStageTracker stage={plannerStage} />
                  <PlannerProjectSetup
                    stage={plannerStage}
                    projectName={projectName}
                    projectSlug={projectSlug}
                    projectRoot={projectRoot}
                    onProjectNameChange={handleProjectNameInput}
                    onProjectSlugChange={handleProjectSlugInput}
                    onSubmit={handleProjectSetupSubmit}
                    busy={scriptRunning}
                  />
                  <PlannerScriptPanel
                    script={scriptText}
                    onScriptChange={handleScriptChange}
                    onCompile={() => generateFromScript()}
                    onReset={handleScriptReset}
                    result={scriptResult}
                    error={scriptError}
                    compiling={scriptRunning}
                    autoCompile={autoCompileScript}
                    onToggleAutoCompile={setAutoCompileScript}
                    currentFingerprint={scriptFingerprint}
                    compileDisabled={plannerStage === "setup"}
                    compileDisabledReason={
                      plannerStage === "setup"
                        ? "Enter project details and continue to planning to enable compilation."
                        : null
                    }
                  />
                  <PlannerScaffoldPreview
                    stage={plannerStage}
                    scaffold={scaffoldPlan}
                    onIntegrate={applyScaffold}
                    integrating={scaffoldApplying}
                  />
                  <EchoCoderPanel />
                  <Card>
                    <CardHeader>
                      <CardTitle>Module Drop‑in</CardTitle>
                      <CardDescription>
                        Drop a folder or .tar archive in Chat & History or use
                        Search. Compare left (module) vs right (project).
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {modules.length === 0 ? (
                        <div className="h-[calc(100vh-280px)] min-h-[420px]">
                          <div className="sticky top-[68px] z-20 mb-2 flex flex-wrap items-center gap-2 rounded-md border bg-background/80 backdrop-blur px-2 py-1 text-xs">
                            <span className="opacity-70">Toolbar</span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              title="Load a module to enable"
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent("module:prescan"),
                                )
                              }
                            >
                              Pre‑scan
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              title="Load a module to enable"
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent("module:secscan"),
                                )
                              }
                            >
                              Security scan
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res = await fetch(
                                    "/api/zaro/snapshot",
                                    {
                                      method: "POST",
                                    },
                                  );
                                  const j = await res.json();
                                  if (res.ok) {
                                    toast({
                                      title: "Snapshot saved",
                                      description:
                                        j.snapshotPath?.replace(/^.*\//, "") ||
                                        "OK",
                                    });
                                    logLine(
                                      `[SNAPSHOT] ${j.snapshotPath || ""}`,
                                    );
                                  } else {
                                    toast({
                                      title: "Snapshot failed",
                                      description: j.error || "Error",
                                      variant: "destructive",
                                    });
                                  }
                                } catch (e: any) {
                                  toast({
                                    title: "Snapshot error",
                                    description: e?.message || String(e),
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Snapshot
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res = await fetch(
                                    "/api/zaro/integrity",
                                    {
                                      method: "POST",
                                    },
                                  );
                                  const j = await res.json();
                                  if (res.ok || j.ok) {
                                    const changes = (j.changes || [])
                                      .slice(0, 5)
                                      .map((c: any) => `${c.change}: ${c.path}`)
                                      .join("\n");
                                    toast({
                                      title: "Integrity",
                                      description:
                                        `${(j.changes || []).length} change(s)` +
                                        (changes ? `\n${changes}` : ""),
                                    });
                                    logLine(
                                      `[INTEGRITY] changes=${(j.changes || []).length}`,
                                    );
                                  } else {
                                    toast({
                                      title: "Integrity failed",
                                      description: j.error || "Error",
                                      variant: "destructive",
                                    });
                                  }
                                } catch (e: any) {
                                  toast({
                                    title: "Integrity error",
                                    description: e?.message || String(e),
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Integrity
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    "Restore latest snapshot? This will overwrite files.",
                                  )
                                )
                                  return;
                                try {
                                  const res = await fetch("/api/zaro/restore", {
                                    method: "POST",
                                  });
                                  const j = await res.json();
                                  if (res.ok && j.ok) {
                                    toast({
                                      title: "Restored",
                                      description: `${j.restored || 0} files from ${j.snapshot || ""}`,
                                    });
                                    logLine(
                                      `[RESTORE] restored=${j.restored || 0} snapshot=${j.snapshot || ""}`,
                                    );
                                    window.location.reload();
                                  } else {
                                    toast({
                                      title: "Restore failed",
                                      description: j.error || "Error",
                                      variant: "destructive",
                                    });
                                  }
                                } catch (e: any) {
                                  toast({
                                    title: "Restore error",
                                    description: e?.message || String(e),
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Restore
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              title="Load a module to enable"
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent("module:intent"),
                                )
                              }
                            >
                              Intent
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              title="Load a module to enable"
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent("module:dryrun"),
                                )
                              }
                            >
                              Dry‑run
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              disabled
                              title="Load a module to enable"
                              onClick={onOpenPackage}
                            >
                              Package
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDbOpen(true)}
                            >
                              DB Transfer
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            No module loaded yet. Drop files or a .tar in Chat &
                            History.
                          </div>
                        </div>
                      ) : (
                        <div className="h-[calc(100vh-280px)] min-h-[420px]">
                          <div className="sticky top-[68px] z-20 mb-2 flex flex-wrap items-center gap-2 rounded-md border bg-background/80 backdrop-blur px-2 py-1 text-xs">
                            <span className="opacity-70">Toolbar</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent("module:prescan"),
                                )
                              }
                            >
                              Pre‑scan
                            </Button>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={archiveUnused}
                                onChange={(e) =>
                                  setArchiveUnused(e.target.checked)
                                }
                              />
                              <span>Archive unused</span>
                            </label>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setReplaceOpen(true)}
                            >
                              Replace/Install
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent("module:secscan"),
                                )
                              }
                            >
                              Security scan
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res = await fetch(
                                    "/api/zaro/snapshot",
                                    {
                                      method: "POST",
                                    },
                                  );
                                  const j = await res.json();
                                  if (res.ok) {
                                    toast({
                                      title: "Snapshot saved",
                                      description:
                                        j.snapshotPath?.replace(/^.*\//, "") ||
                                        "OK",
                                    });
                                    logLine(
                                      `[SNAPSHOT] ${j.snapshotPath || ""}`,
                                    );
                                  } else {
                                    toast({
                                      title: "Snapshot failed",
                                      description: j.error || "Error",
                                      variant: "destructive",
                                    });
                                  }
                                } catch (e: any) {
                                  toast({
                                    title: "Snapshot error",
                                    description: e?.message || String(e),
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Snapshot
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res = await fetch(
                                    "/api/zaro/integrity",
                                    {
                                      method: "POST",
                                    },
                                  );
                                  const j = await res.json();
                                  if (res.ok || j.ok) {
                                    const changes = (j.changes || [])
                                      .slice(0, 5)
                                      .map((c: any) => `${c.change}: ${c.path}`)
                                      .join("\n");
                                    toast({
                                      title: "Integrity",
                                      description:
                                        (j.changes?.length || 0) +
                                        " change(s)" +
                                        (changes ? `\n${changes}` : ""),
                                    });
                                    logLine(
                                      `[INTEGRITY] changes=${(j.changes || []).length}`,
                                    );
                                  } else {
                                    toast({
                                      title: "Integrity failed",
                                      description: j.error || "Error",
                                      variant: "destructive",
                                    });
                                  }
                                } catch (e: any) {
                                  toast({
                                    title: "Integrity error",
                                    description: e?.message || String(e),
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Integrity
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    "Restore latest snapshot? This will overwrite files.",
                                  )
                                )
                                  return;
                                try {
                                  const res = await fetch("/api/zaro/restore", {
                                    method: "POST",
                                  });
                                  const j = await res.json();
                                  if (res.ok && j.ok) {
                                    toast({
                                      title: "Restored",
                                      description: `${j.restored} files from ${j.snapshot}`,
                                    });
                                    logLine(
                                      `[RESTORE] restored=${j.restored || 0} snapshot=${j.snapshot || ""}`,
                                    );
                                    window.location.reload();
                                  } else {
                                    toast({
                                      title: "Restore failed",
                                      description: j.error || "Error",
                                      variant: "destructive",
                                    });
                                  }
                                } catch (e: any) {
                                  toast({
                                    title: "Restore error",
                                    description: e?.message || String(e),
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Restore
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent("module:intent"),
                                )
                              }
                            >
                              Intent
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent("module:dryrun"),
                                )
                              }
                            >
                              Dry‑run
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={onOpenPackage}
                            >
                              Package
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDbOpen(true)}
                            >
                              DB Transfer
                            </Button>
                          </div>
                          <Dialog
                            open={replaceOpen}
                            onOpenChange={setReplaceOpen}
                          >
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Replace/Install Module File
                                </DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-3 text-xs">
                                <label className="grid gap-1">
                                  Project target file
                                  <input
                                    value={projTargetQuery}
                                    onChange={(e) =>
                                      setProjTargetQuery(e.target.value)
                                    }
                                    placeholder="Search target..."
                                    className="rounded-md border bg-background px-2 py-1 text-xs"
                                  />
                                  <select
                                    value={projTarget}
                                    onChange={(e) =>
                                      setProjTarget(e.target.value)
                                    }
                                    className="rounded-md border bg-background px-2 py-1"
                                  >
                                    <option value="">Select…</option>
                                    {Object.keys(getProjectFilesMap())
                                      .filter((p) =>
                                        /^(\/client|\/shared|\/server)\//.test(
                                          p,
                                        ),
                                      )
                                      .filter((p) =>
                                        p
                                          .toLowerCase()
                                          .includes(
                                            projTargetQuery.toLowerCase(),
                                          ),
                                      )
                                      .sort()
                                      .map((p) => (
                                        <option key={p} value={p}>
                                          {p}
                                        </option>
                                      ))}
                                  </select>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="grid gap-1">
                                    Source module
                                    <select
                                      value={srcModuleIdx}
                                      onChange={(e) => {
                                        setSrcModuleIdx(
                                          parseInt(e.target.value),
                                        );
                                        setSrcEntry("");
                                      }}
                                      className="rounded-md border bg-background px-2 py-1"
                                    >
                                      {modules.map((m, i) => (
                                        <option key={i} value={i}>
                                          {m.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="grid gap-1">
                                    Entry file
                                    <input
                                      value={srcEntryQuery}
                                      onChange={(e) =>
                                        setSrcEntryQuery(e.target.value)
                                      }
                                      placeholder="Search entry..."
                                      className="rounded-md border bg-background px-2 py-1 text-xs"
                                    />
                                    <select
                                      value={srcEntry}
                                      onChange={(e) =>
                                        setSrcEntry(e.target.value)
                                      }
                                      className="rounded-md border bg-background px-2 py-1"
                                    >
                                      <option value="">Select����</option>
                                      {Object.keys(
                                        modules[srcModuleIdx]?.files || {},
                                      )
                                        .filter((p) =>
                                          /\.(tsx|ts|jsx|js)$/.test(p),
                                        )
                                        .filter((p) =>
                                          p
                                            .toLowerCase()
                                            .includes(
                                              srcEntryQuery.toLowerCase(),
                                            ),
                                        )
                                        .sort()
                                        .map((p) => (
                                          <option key={p} value={p}>
                                            {p}
                                          </option>
                                        ))}
                                    </select>
                                  </label>
                                </div>
                                <label className="inline-flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={archiveUnused}
                                    onChange={(e) =>
                                      setArchiveUnused(e.target.checked)
                                    }
                                  />{" "}
                                  Archive unused/unconnected into UnUsed_archive
                                </label>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setReplaceOpen(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button size="sm" onClick={onReplaceInstall}>
                                    Replace
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <ResizablePanelGroup direction="horizontal">
                            <ResizablePanel defaultSize={45} minSize={20}>
                              <div className="h-full flex flex-col">
                                <div className="text-xs font-semibold mb-1">
                                  Imported Module
                                </div>
                                <div className="flex-1 min-h-0">
                                  <ErrorBoundary
                                    fallback={
                                      <div className="rounded border p-2 text-xs text-red-600">
                                        Failed to render module viewer.
                                      </div>
                                    }
                                  >
                                    <CodeExplorer
                                      filesOverride={latestModuleFiles}
                                      showPreview
                                      autoOpenFirst
                                      onOpenGithub={() =>
                                        setGithubDialog((prev) => ({
                                          ...prev,
                                          open: true,
                                        }))
                                      }
                                    />
                                  </ErrorBoundary>
                                </div>
                              </div>
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={55} minSize={20}>
                              <div className="h-full flex flex-col">
                                <div className="text-xs font-semibold mb-1">
                                  Current Project
                                </div>
                                <div className="flex-1 min-h-0">
                                  <ErrorBoundary
                                    fallback={
                                      <div className="rounded border p-2 text-xs text-red-600">
                                        Failed to render project viewer.
                                      </div>
                                    }
                                  >
                                    <CodeExplorer
                                      editablePaths={[
                                        "/" + destPath.replace(/^\/+/, ""),
                                      ]}
                                      onOpenGithub={() =>
                                        setGithubDialog((prev) => ({
                                          ...prev,
                                          open: true,
                                        }))
                                      }
                                      initialActivePath={
                                        "/" + destPath.replace(/^\/+/, "")
                                      }
                                      filesOverride={codeOverrides}
                                    />
                                  </ErrorBoundary>
                                </div>
                              </div>
                            </ResizablePanel>
                          </ResizablePanelGroup>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="tier1" className={isMobile ? "px-2" : ""}>
                <Suspense
                  fallback={
                    <div className="p-4 sm:p-6 text-xs sm:text-sm">
                      Loading Tier 1 Enterprise features…
                    </div>
                  }
                >
                  <Tier1EnterprisePanel />
                </Suspense>
              </TabsContent>

              <TabsContent value="tier2" className={isMobile ? "px-2" : ""}>
                <Suspense
                  fallback={
                    <div className="p-4 sm:p-6 text-xs sm:text-sm">
                      Loading Tier 2 Enterprise features…
                    </div>
                  }
                >
                  <Tier2EnterprisePanel />
                </Suspense>
              </TabsContent>

              <TabsContent value="tier3" className={isMobile ? "px-2" : ""}>
                <Suspense
                  fallback={
                    <div className="p-4 sm:p-6 text-xs sm:text-sm">
                      Loading Tier 3 Enterprise features…
                    </div>
                  }
                >
                  <Tier3EnterprisePanel />
                </Suspense>
              </TabsContent>

              <TabsContent value="tier4" className={isMobile ? "px-2" : ""}>
                <Suspense
                  fallback={
                    <div className="p-4 sm:p-6 text-xs sm:text-sm">
                      Loading Tier 4 Enterprise features…
                    </div>
                  }
                >
                  <Tier4EnterprisePanel />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent className={applyExpand ? "max-w-5xl" : "max-w-md"}>
            <DialogHeader>
              <DialogTitle>Apply to Codebase</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <label className="grid gap-1">
                <span className="text-[11px]">Destination path</span>
                <input
                  value={destPath}
                  onChange={(e) => setDestPath(e.target.value)}
                  className="rounded-md border bg-background px-2 py-1 text-xs"
                />
              </label>
              {applySuggestions.length > 0 && (
                <div className="text-[11px]">
                  <div className="mb-1 opacity-70">Suggestions</div>
                  <div className="flex flex-wrap gap-1">
                    {applySuggestions.map((s) => (
                      <button
                        key={s}
                        className="px-2 py-0.5 rounded border hover:bg-accent"
                        onClick={() => setDestPath(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={includeCss}
                  onChange={(e) => setIncludeCss(e.target.checked)}
                />{" "}
                Include CSS overrides
              </label>
              {undoContent && (
                <p className="text-[11px] opacity-80">
                  Undo available for last apply in this session.
                </p>
              )}
              <div className="flex justify-between gap-2">
                <div className="inline-flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open("/sandbox/generated", "_blank")}
                  >
                    Launch
                  </Button>
                  <Button variant="outline" onClick={() => setApplyOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setApplyExpand((v) => !v)}
                  >
                    {applyExpand ? "Collapse" : "Expand"}
                  </Button>
                </div>
                <div className="inline-flex gap-2">
                  <Button variant="outline" onClick={updateCssFile}>
                    Update CSS file
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      alert(
                        "To GO LIVE, use Netlify MCP Deploy from the MCP popover (top bar).",
                      )
                    }
                  >
                    GO LIVE
                  </Button>
                  <Button
                    className="shadow-neon"
                    onClick={() => {
                      setApplyOpen(false);
                      applyToCodebase();
                    }}
                  >
                    Save / Commit
                  </Button>
                </div>
              </div>
              {applyExpand && (
                <div className="mt-3">
                  <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={45} minSize={20}>
                      <div className="h-[60vh] min-h-[360px]">
                        <ErrorBoundary
                          fallback={
                            <div className="rounded border p-2 text-xs text-red-600">
                              Failed to render module viewer.
                            </div>
                          }
                        >
                          <CodeExplorer
                            filesOverride={latestModuleFiles}
                            showPreview
                            autoOpenFirst
                            onOpenGithub={() =>
                              setGithubDialog((prev) => ({
                                ...prev,
                                open: true,
                              }))
                            }
                          />
                        </ErrorBoundary>
                      </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={55} minSize={20}>
                      <div className="h-[60vh] min-h-[360px]">
                        <ErrorBoundary
                          fallback={
                            <div className="rounded border p-2 text-xs text-red-600">
                              Failed to render project viewer.
                            </div>
                          }
                        >
                          <CodeExplorer
                            editablePaths={["/" + destPath.replace(/^\/+/, "")]}
                            initialActivePath={
                              "/" + destPath.replace(/^\/+/, "")
                            }
                            onOpenGithub={() =>
                              setGithubDialog((prev) => ({
                                ...prev,
                                open: true,
                              }))
                            }
                          />
                        </ErrorBoundary>
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!applyError}
          onOpenChange={(o) => !o && setApplyError(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Apply failed</DialogTitle>
            </DialogHeader>
            <div className="text-xs whitespace-pre-wrap max-h-[70vh] overflow-auto rounded border bg-muted/20 p-2">
              {applyError}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Code Editor</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-xs inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={codeSync}
                  onChange={(e) => setCodeSync(e.target.checked)}
                />{" "}
                Sync with Canvas
              </label>
              <textarea
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value)}
                className="w-full h-[50vh] rounded-md border bg-background p-2 font-mono text-xs"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCodeOpen(false)}>
                  Close
                </Button>
                <Button
                  className="shadow-neon"
                  onClick={() => {
                    setCode(codeDraft);
                    setCodeOpen(false);
                  }}
                >
                  Apply to Editor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={prescanOpen} onOpenChange={setPrescanOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Module pre‑scan</DialogTitle>
            </DialogHeader>
            <div className="text-xs whitespace-pre-wrap max-h-[60vh] overflow-auto rounded border bg-muted/20 p-2">
              {prescanText || "No analysis"}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={secscanOpen} onOpenChange={setSecscanOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Security scan
                <span
                  className={`ml-2 text-[11px] px-2 py-0.5 rounded ${secscanStatus === "green" ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300" : secscanStatus === "yellow" ? "bg-amber-600/20 text-amber-700 dark:text-amber-300" : "bg-red-600/20 text-red-700 dark:text-red-300"}`}
                >
                  {secscanStatus.toUpperCase()}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="text-xs whitespace-pre-wrap max-h-[60vh] overflow-auto rounded border bg-muted/20 p-2">
              {secscanText || "No issues found."}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={intentOpen} onOpenChange={setIntentOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Intent manifest</DialogTitle>
            </DialogHeader>
            <div className="text-xs whitespace-pre-wrap max-h-[60vh] overflow-auto rounded border bg-muted/20 p-2 mb-2">
              {intentJson || "No manifest"}
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    const r = await fetch("/api/write-file", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        relPath: "client/echo/intent-manifest.json",
                        contents: intentJson,
                      }),
                    });
                    const j = await r.json();
                    if (r.ok && j.ok) {
                      toast({
                        title: "Intent saved",
                        description:
                          j.path || "client/echo/intent-manifest.json",
                      });
                    } else {
                      toast({
                        title: "Save failed",
                        description: j.error || "Error",
                        variant: "destructive",
                      });
                    }
                  } catch (e: any) {
                    toast({
                      title: "Save error",
                      description: e?.message || String(e),
                      variant: "destructive",
                    });
                  }
                }}
              >
                Save to client/echo/intent-manifest.json
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={dryOpen} onOpenChange={setDryOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Dry‑run (no writes)</DialogTitle>
            </DialogHeader>
            <div className="text-xs whitespace-pre-wrap max-h-[60vh] overflow-auto rounded border bg-muted/20 p-2">
              {dryText || "No preview"}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={packOpen} onOpenChange={setPackOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Build distribution package</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-2">
                  <span className="w-24 text-xs opacity-70">Name</span>
                  <input
                    value={packName}
                    onChange={(e) => onPackNameChange(e.target.value)}
                    className="flex-1 rounded border bg-background px-2 py-1 text-xs"
                    placeholder="package name"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <span className="w-24 text-xs opacity-70">Channel</span>
                  <div className="inline-flex items-center gap-2">
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name="ch"
                        checked={packChannel === "testers"}
                        onChange={() => onChannelChange("testers")}
                      />{" "}
                      <span>Testers</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name="ch"
                        checked={packChannel === "end-users"}
                        onChange={() => onChannelChange("end-users")}
                      />{" "}
                      <span>End‑users</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name="ch"
                        checked={packChannel === "custom"}
                        onChange={() => onChannelChange("custom")}
                      />{" "}
                      <span>Custom</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(packRoles).map(([role, enabled]) => (
                  <label
                    key={role}
                    className="inline-flex items-center gap-2 rounded border px-2 py-1"
                  >
                    <input
                      type="checkbox"
                      checked={!!enabled}
                      onChange={() => toggleRole(role)}
                    />
                    <span className="text-xs">
                      {role}{" "}
                      <span className="opacity-60">
                        ({packRoleCounts[role] || 0})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={packExcludeBinaries}
                    onChange={toggleExcludeBinaries}
                  />{" "}
                  <span className="text-xs">Exclude binary���like files</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={packIncludeManifest}
                    onChange={onIncludeManifestChange}
                  />{" "}
                  <span className="text-xs">Include manifest.json</span>
                </label>
              </div>
              <div className="text-xs opacity-70">
                Selected files: {packCount}
              </div>
              <div>
                <Button
                  disabled={packBusy || packCount === 0}
                  onClick={onBuildPackage}
                >
                  {packBusy ? "Building…" : "Build package"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={dbOpen} onOpenChange={setDbOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>DB Transfer (Neon → self‑hosted)</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid gap-2">
                <label className="text-xs">
                  Neon (source) connection string
                </label>
                <input
                  value={dbSrc}
                  onChange={(e) => setDbSrc(e.target.value)}
                  placeholder="postgresql://user:pass@host/db"
                  className="rounded border bg-background px-2 py-1 text-xs"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">
                  Target (self‑hosted) connection string
                </label>
                <input
                  value={dbDst}
                  onChange={(e) => setDbDst(e.target.value)}
                  placeholder="postgresql://user:pass@host:5432/db"
                  className="rounded border bg-background px-2 py-1 text-xs"
                />
              </div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={dbSchemaOnly}
                  onChange={() => setDbSchemaOnly((v) => !v)}
                />{" "}
                <span className="text-xs">Schema only</span>
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={buildDbTransferScript}
                >
                  Generate script
                </Button>
                {dbScript && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard?.writeText(dbScript);
                        toast({ title: "Copied script" });
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([dbScript], {
                          type: "text/x-sh",
                        });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = "db-transfer.sh";
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                      }}
                    >
                      Download .sh
                    </Button>
                  </>
                )}
              </div>
              {dbScript && (
                <pre className="text-[11px] whitespace-pre-wrap rounded border bg-muted/20 p-2 max-h-64 overflow-auto">
                  {dbScript}
                </pre>
              )}
              <div className="text-xs text-muted-foreground">
                Requires pg_dump/pg_restore installed where you run it. Secrets
                are not stored server‑side.
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={controlsOpen} onOpenChange={setControlsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Orb Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Speed</span>
                  <span>{speed.toFixed(2)}</span>
                </div>
                <Slider
                  value={[speed]}
                  min={0}
                  max={2}
                  step={0.01}
                  onValueChange={(v) => setSpeed(v[0])}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Wobble</span>
                  <span>{wobble.toFixed(2)}</span>
                </div>
                <Slider
                  value={[wobble]}
                  min={0}
                  max={2}
                  step={0.01}
                  onValueChange={(v) => setWobble(v[0])}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Compactness</span>
                  <span>{compactness.toFixed(2)}</span>
                </div>
                <Slider
                  value={[compactness]}
                  min={0.5}
                  max={0.99}
                  step={0.01}
                  onValueChange={(v) => setCompactness(v[0])}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Ring speed</span>
                  <span>{ringSpeed.toFixed(2)}</span>
                </div>
                <Slider
                  value={[ringSpeed]}
                  min={0}
                  max={2}
                  step={0.01}
                  onValueChange={(v) => setRingSpeed(v[0])}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Ring randomness</span>
                  <span>{ringRandomness.toFixed(2)}</span>
                </div>
                <Slider
                  value={[ringRandomness]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(v) => setRingRandomness(v[0])}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Ring count</span>
                  <span>{ringCount}</span>
                </div>
                <Slider
                  value={[ringCount]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(v) => setRingCount(v[0])}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Orb size (radius)</span>
                  <span>{radius.toFixed(2)}</span>
                </div>
                <Slider
                  value={[radius]}
                  min={1.2}
                  max={3.0}
                  step={0.01}
                  onValueChange={(v) => setRadius(v[0])}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Ring particles</span>
                  <span>{ringParticles}</span>
                </div>
                <Slider
                  value={[ringParticles]}
                  min={200}
                  max={2000}
                  step={50}
                  onValueChange={(v) => setRingParticles(v[0])}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Glow particles</span>
                  <span>{glowParticles}</span>
                </div>
                <Slider
                  value={[glowParticles]}
                  min={100}
                  max={3000}
                  step={50}
                  onValueChange={(v) => setGlowParticles(v[0])}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Glow azimuth</span>
                    <span>{glowAz}°</span>
                  </div>
                  <Slider
                    value={[glowAz]}
                    min={0}
                    max={360}
                    step={1}
                    onValueChange={(v) => setGlowAz(v[0])}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Glow elevation</span>
                    <span>{glowEl}°</span>
                  </div>
                  <Slider
                    value={[glowEl]}
                    min={-90}
                    max={90}
                    step={1}
                    onValueChange={(v) => setGlowEl(v[0])}
                  />
                </div>
              </div>
              <label className="mt-2 inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={omniGlow}
                  onChange={(e) => setOmniGlow(e.target.checked)}
                />{" "}
                Omni glow (all directions)
              </label>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Glow speed</span>
                  <span>{glowSpeed.toFixed(2)}</span>
                </div>
                <Slider
                  value={[glowSpeed]}
                  min={0}
                  max={3}
                  step={0.01}
                  onValueChange={(v) => setGlowSpeed(v[0])}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Glow size</span>
                  <span>{glowSize.toFixed(3)}</span>
                </div>
                <Slider
                  value={[glowSize]}
                  min={0.01}
                  max={0.08}
                  step={0.001}
                  onValueChange={(v) => setGlowSize(v[0])}
                />
              </div>
              <div className="flex items-center gap-3 text-xs">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showRings}
                    onChange={(e) => setShowRings(e.target.checked)}
                  />{" "}
                  Rings
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={helix}
                    onChange={(e) => setHelix(e.target.checked)}
                  />{" "}
                  Double helix
                </label>
                <label className="flex items-center gap-2">
                  Color A{" "}
                  <input
                    type="color"
                    value={colorA}
                    onChange={(e) => setColorA(e.target.value)}
                    className="h-6 w-10 bg-transparent"
                  />
                </label>
                <label className="flex items-center gap-2">
                  Color B{" "}
                  <input
                    type="color"
                    value={colorB}
                    onChange={(e) => setColorB(e.target.value)}
                    className="h-6 w-10 bg-transparent"
                  />
                </label>
                <label className="flex items-center gap-2">
                  Glow{" "}
                  <input
                    type="color"
                    value={glowColor}
                    onChange={(e) => setGlowColor(e.target.value)}
                    className="h-6 w-10 bg-transparent"
                  />
                </label>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Helix speed</span>
                  <span>{helixSpeed.toFixed(2)}</span>
                </div>
                <Slider
                  value={[helixSpeed]}
                  min={0}
                  max={3}
                  step={0.01}
                  onValueChange={(v) => setHelixSpeed(v[0])}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </ErrorBoundary>
  );
}

function ChatPanel({
  className,
  currentTask,
  onTask,
  layoutTemplate,
  setLayoutTemplate,
  onPlanSend,
  modules,
  setModules,
  onShowSeed,
  role,
  setRole,
  githubDialog,
  setGithubDialog,
}: {
  className?: string;
  currentTask: string;
  onTask: (t: string) => void;
  layoutTemplate: string;
  setLayoutTemplate: (v: string) => void;
  onPlanSend: (text: string) => void;
  modules: { name: string; files: Record<string, string> }[];
  setModules: Dispatch<
    SetStateAction<{ name: string; files: Record<string, string> }[]>
  >;
  onShowSeed: () => void;
  role: string;
  setRole: (v: string) => void;
  githubDialog: GithubDialogState;
  setGithubDialog: Dispatch<SetStateAction<GithubDialogState>>;
}) {
  type Msg = { role: "system" | "user"; text: string; time: number };
  const [history, setHistory] = useState<Msg[]>(() => {
    try {
      const raw = readStorage("studio.chat");
      return raw ? (JSON.parse(raw) as Msg[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [panelView, setPanelView] = useState<"chat" | "history" | "logs">(
    "chat",
  );
  useEffect(() => {
    writeStorage("studio.chat", JSON.stringify(history));
  }, [history]);

  // Server logs
  const [logQ, setLogQ] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  async function searchLogs(q: string) {
    try {
      const r = await fetch(`/api/logs/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (r.ok && j.ok) {
        setLogs(j.results || []);
      }
    } catch {}
  }
  useEffect(() => {
    searchLogs("");
  }, []);

  function send() {
    const txt = input.trim();
    if (!txt) return;
    setHistory((h) => [...h, { role: "user", text: txt, time: Date.now() }]);
    onPlanSend(txt);
    setInput("");
  }

  async function handleDrop(e: ReactDragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    for (const f of files) {
      try {
        const text = await f.text();
        const snippet = text.length > 1200 ? text.slice(0, 1200) + "\n…" : text;
        setHistory((h) => [
          ...h,
          {
            role: "system",
            text: `Attached file: ${f.name} (${f.type || "text"}, ${f.size} bytes)`,
            time: Date.now(),
          },
          { role: "user", text: snippet, time: Date.now() },
        ]);
      } catch {
        setHistory((h) => [
          ...h,
          {
            role: "system",
            text: `Could not read ${f.name}`,
            time: Date.now(),
          },
        ]);
      }
    }
  }

  const [seedHover, setSeedHover] = useState(false);
  const dirInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = dirInputRef.current;
    if (el) {
      try {
        el.setAttribute("webkitdirectory", "");
        el.setAttribute("directory", "");
      } catch {}
    }
  }, []);

  async function readFileText(f: File): Promise<string> {
    try {
      return await f.text();
    } catch {
      return "";
    }
  }
  async function readFileBytes(f: File): Promise<Uint8Array> {
    const ab = await f.arrayBuffer();
    return new Uint8Array(ab);
  }
  function notifyImportSummary(
    name: string,
    files: Record<string, string> | null | undefined,
    source: string,
  ) {
    const fileMap = files ?? {};
    const paths = Object.keys(fileMap);
    const folders = new Set<string>();
    for (const raw of paths) {
      const clean = raw.replace(/^\/+/, "");
      if (!clean) continue;
      const parts = clean.split("/");
      if (parts.length >= 2) folders.add(`${parts[0]}/${parts[1]}`);
      else if (parts[0]) folders.add(parts[0]);
    }
    const visible = Array.from(folders).slice(0, 4);
    const more = folders.size - visible.length;
    const locations = visible.length
      ? visible.join(", ") + (more > 0 ? `, +${more} more` : "")
      : "root";
    const count = paths.length;
    const countLabel = `${count} file${count === 1 ? "" : "s"}`;
    toast({
      title: "Import complete",
      description: `${name} — ${countLabel}\nLocations: ${locations}\nSource: ${source}`,
    });
  }
  async function onSeedFiles(files: FileList | File[]) {
    const arr = Array.from(files as any as File[]);
    const filesMap: Record<string, string> = {};
    // handle .tar specially (single archive)
    if (arr.length === 1 && /\.tar$/i.test(arr[0].name)) {
      const { parseTar, tarToFilesMap } = await import("@/lib/tar");
      const bytes = await readFileBytes(arr[0]);
      const entries = parseTar(bytes);
      const m = tarToFilesMap(entries);
      const name = arr[0].name.replace(/\.tar$/i, "");
      setModules((ms) => [...ms, { name, files: m }]);
      logLine(
        `[IMPORT] module=${name} files=${Object.keys(m).length} src=local-tar`,
      );
      notifyImportSummary(name, m, "Local .tar archive");
      onShowSeed();
      return;
    }
    const reads = arr.map(async (f) => {
      const rel = (f as any).webkitRelativePath || f.name;
      filesMap["/" + rel.replace(/^\/+/, "")] = await readFileText(f);
    });
    await Promise.all(reads);
    const name = `Module ${modules.length + 1}`;
    setModules((ms) => [...ms, { name, files: filesMap }]);
    const fileCount = Object.keys(filesMap).length;
    logLine(`[IMPORT] module=${name} files=${fileCount} src=local-files`);
    notifyImportSummary(name, filesMap, "Local file selection");
    onShowSeed();
  }
  async function onSeedUrl(url: string) {
    const u = url.trim();
    if (!u) return;
    try {
      if (/\.(tar\.gz|tgz)(\?|$)/i.test(u)) {
        const r = await fetch("/api/tar/remote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: u }),
        });
        const j = await r.json();
        if (!r.ok || !j.ok) {
          alert(j.error || "Could not import archive");
          return;
        }
        const moduleName = j.name || "module";
        const moduleFiles = j.files || {};
        setModules((ms) => [...ms, { name: moduleName, files: moduleFiles }]);
        logLine(
          `[IMPORT] module=${moduleName} files=${Object.keys(moduleFiles).length} src=remote`,
        );
        notifyImportSummary(moduleName, moduleFiles, "Remote archive (tar.gz)");
        onShowSeed();
        return;
      }
      if (!/\.tar(\?|$)/i.test(u)) {
        alert("Only .tar, .tar.gz or .tgz supported");
        return;
      }
      const r = await fetch(u);
      if (!r.ok) {
        alert("Download failed");
        return;
      }
      const ab = await r.arrayBuffer();
      const { parseTar, tarToFilesMap } = await import("@/lib/tar");
      const entries = parseTar(new Uint8Array(ab));
      const files = tarToFilesMap(entries);
      const name = (u.split("/").pop() || "module")
        .replace(/\?.*$/, "")
        .replace(/\.tar$/i, "");
      setModules((ms) => [...ms, { name, files }]);
      logLine(
        `[IMPORT] module=${name} files=${Object.keys(files).length} src=url`,
      );
      notifyImportSummary(name, files, "Remote URL (.tar)");
      onShowSeed();
    } catch (e) {
      alert("Could not import archive");
    }
  }

  return (
    <Card className={(className ? className + " " : "") + "flex flex-col"}>
      <CardHeader className="p-3 pb-2">
        <div
          className="flex flex-col gap-1"
          onDragOver={(e) => {
            e.preventDefault();
            setSeedHover(true);
          }}
          onDragLeave={() => setSeedHover(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSeedHover(false);
            if (e.dataTransfer?.files) onSeedFiles(e.dataTransfer.files);
          }}
        >
          <div className="w-full">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Coder Panel</CardTitle>
              <div className="ml-auto inline-flex items-center gap-1 rounded-md border p-0.5 text-[11px]">
                <button
                  className={
                    (panelView === "chat" ? "bg-accent " : "") +
                    "px-2 py-0.5 rounded"
                  }
                  onClick={() => setPanelView("chat")}
                >
                  Chat
                </button>
                <button
                  className={
                    (panelView === "history" ? "bg-accent " : "") +
                    "px-2 py-0.5 rounded"
                  }
                  onClick={() => setPanelView("history")}
                >
                  History
                </button>
                <button
                  className={
                    (panelView === "logs" ? "bg-accent " : "") +
                    "px-2 py-0.5 rounded"
                  }
                  onClick={() => setPanelView("logs")}
                >
                  Logs
                </button>
              </div>
              <Button
                className="h-7 w-7 ml-2"
                variant="outline"
                size="icon"
                onClick={() =>
                  setGithubDialog((prev) => ({ ...prev, open: true }))
                }
                title="Import from GitHub"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="text-[11px] mt-1 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Role:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={mergeControlClasses(
                "rounded-md h-7 px-2 py-1 text-[11px] bg-background/70 pr-6",
              )}
            >
              <option value="viewer">viewer</option>
              <option value="editor">editor</option>
              <option value="superadmin">superadmin</option>
            </select>
            <span className="ml-3 text-muted-foreground">File Viewer:</span>
            <label className="text-[11px]">
              <input
                ref={dirInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) onSeedFiles(e.target.files);
                  if (e.target) (e.target as HTMLInputElement).value = "";
                }}
                className="hidden"
              />
              <span
                className={mergeControlClasses(
                  "inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 py-1 leading-6 cursor-pointer whitespace-nowrap bg-background/70",
                  seedHover ? "ring-2 ring-primary/60" : "",
                )}
                role="button"
                aria-label="Browse workspace files"
                title="Browse files"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="sr-only">Browse files</span>
              </span>
            </label>
            <div
              className={mergeControlClasses(
                "flex-1 h-10 grid place-items-center text-[11px] min-w-[200px] rounded-md border-dashed cursor-pointer text-muted-foreground bg-background/60",
                seedHover ? "ring-2 ring-primary/60" : "",
              )}
              onClick={() => dirInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setSeedHover(true);
              }}
              onDragLeave={() => setSeedHover(false)}
              onDrop={(e) => {
                e.preventDefault();
                setSeedHover(false);
                if (e.dataTransfer?.files) onSeedFiles(e.dataTransfer.files);
              }}
            >
              Drop
            </div>
          </div>
          <div className="flex items-center gap-2 flex-nowrap text-[11px] mt-1">
            <span className="text-muted-foreground">Logs:</span>
            <input
              value={logQ}
              onChange={(e) => setLogQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") searchLogs(logQ);
              }}
              placeholder="search logs"
              className={mergeControlClasses(
                "rounded-md w-40 h-7 px-2 py-1 text-[11px]",
              )}
            />
            <Button
              className="h-7 px-2"
              variant="outline"
              size="sm"
              onClick={() => searchLogs(logQ)}
              aria-label="Search logs"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="sr-only">Search logs</span>
            </Button>
            <Button
              className="h-7 px-1 text-[11px]"
              variant="default"
              size="sm"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("deploy:netlify"))
              }
              title="Deploy to Netlify"
            >
              Deploy
            </Button>
            <Button
              className="h-7 px-2"
              variant="secondary"
              size="sm"
              onClick={async () => {
                try {
                  const r = await fetch("/api/zaro/snapshot", {
                    method: "POST",
                  });
                  const j = await r.json();
                  alert(
                    r.ok
                      ? `Snapshot: ${j.snapshotPath || "ok"}`
                      : "Snapshot failed",
                  );
                } catch {
                  alert("Snapshot error");
                }
              }}
            >
              Snapshot
            </Button>
            <Button
              className="h-7 px-2"
              variant="outline"
              size="sm"
              onClick={async () => {
                if (confirm("Restore latest snapshot?")) {
                  try {
                    const r = await fetch("/api/zaro/restore", {
                      method: "POST",
                    });
                    await r.json();
                    alert(r.ok ? "Restored" : "Restore failed");
                    if (r.ok) location.reload();
                  } catch {
                    alert("Restore error");
                  }
                }
              }}
            >
              Restore
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <div className="flex-1 min-h-0 overflow-auto rounded-md border bg-muted/20 p-2 text-xs space-y-2 break-words">
          {panelView === "logs" && logs.length > 0 && (
            <div className="space-y-1">
              {logs.map((line, i) => {
                const idx = line.indexOf(" ");
                const ts = idx > 0 ? line.slice(0, idx) : "";
                const msg = idx > 0 ? line.slice(idx + 1) : line;
                const dt = ts ? new Date(ts) : null;
                return (
                  <div key={i} className="text-foreground">
                    <span className="opacity-60">
                      [{dt ? dt.toLocaleString() : ""}]{" "}
                    </span>
                    {msg}
                  </div>
                );
              })}
            </div>
          )}
          {panelView !== "logs" && history.length > 0 && (
            <div className="pt-2 border-t mt-2">
              {history
                .filter((m) =>
                  panelView === "history" ? true : m.role !== "system",
                )
                .map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === "user" ? "text-foreground" : "text-primary"
                    }
                  >
                    <span className="opacity-60">
                      [{new Date(m.time).toLocaleTimeString()}]{" "}
                    </span>
                    {m.text}
                  </div>
                ))}
            </div>
          )}
          {logs.length === 0 && history.length === 0 && (
            <div className="text-muted-foreground">No messages yet.</div>
          )}
        </div>

        <div className="mt-2 grid gap-2">
          <div className="text-xs flex items-center gap-2">
            <label className="inline-flex items-center gap-2">
              Layout template
              <select
                value={layoutTemplate}
                onChange={(e) => setLayoutTemplate(e.target.value)}
                className="rounded-md border bg-background px-2 py-1"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="ml-auto">
              <Button size="icon" onClick={send} aria-label="Send">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 3l5 5h-3v8h-4V8H7l5-5z" />
                </svg>
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Describe your page or change request"
              className="flex-1 rounded-md border bg-background px-3 py-3 text-base h-12"
            />
          </div>
        </div>
      </CardContent>

      <Dialog
        open={githubDialog.open}
        onOpenChange={(next) =>
          setGithubDialog((prev) => ({ ...prev, open: next }))
        }
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from GitHub</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 text-xs">
            <label className="grid gap-1">
              Repository (owner/repo or URL)
              <input
                value={githubDialog.repo}
                onChange={(e) =>
                  setGithubDialog((prev) => ({ ...prev, repo: e.target.value }))
                }
                className="rounded-md border bg-background px-2 py-1"
                placeholder="owner/repo or https://github.com/owner/repo"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                Branch (optional)
                <input
                  value={githubDialog.branch}
                  onChange={(e) =>
                    setGithubDialog((prev) => ({
                      ...prev,
                      branch: e.target.value,
                    }))
                  }
                  className="rounded-md border bg-background px-2 py-1"
                  placeholder="main"
                />
              </label>
              <label className="grid gap-1">
                Subdirectory (optional)
                <input
                  value={githubDialog.subdir}
                  onChange={(e) =>
                    setGithubDialog((prev) => ({
                      ...prev,
                      subdir: e.target.value,
                    }))
                  }
                  className="rounded-md border bg-background px-2 py-1"
                  placeholder="e.g. apps/web"
                />
              </label>
            </div>
            <label className="grid gap-1">
              GitHub token (optional, stored locally)
              <input
                value={githubDialog.token}
                onChange={(e) => {
                  const next = e.target.value;
                  setGithubDialog((prev) => ({ ...prev, token: next }));
                  writeStorage("gh.token", next);
                }}
                className="rounded-md border bg-background px-2 py-1"
                placeholder="ghp_..."
              />
            </label>
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setGithubDialog((prev) => ({ ...prev, open: false }))
                }
              >
                Cancel
              </Button>
              <Button
                disabled={githubDialog.busy || !githubDialog.repo}
                onClick={async () => {
                  setGithubDialog((prev) => ({ ...prev, busy: true }));
                  try {
                    const parseInput = (input: string) => {
                      let url = input.trim().replace(/^git\+/, "");
                      if (/^git@github\.com:/.test(url))
                        url = url.replace(
                          /^git@github\.com:/,
                          "https://github.com/",
                        );
                      if (url.includes("github.com")) {
                        try {
                          const u = new URL(
                            url.includes("://") ? url : `https://${url}`,
                          );
                          const parts = u.pathname
                            .replace(/^\//, "")
                            .replace(/\.git$/, "")
                            .split("/");
                          const owner = parts[0];
                          const repo = parts[1];
                          let branch = githubDialog.branch.trim();
                          let subdir = githubDialog.subdir.trim();
                          const idxTree = parts.indexOf("tree");
                          if (idxTree >= 0) {
                            branch = branch || parts[idxTree + 1] || "";
                            subdir =
                              subdir || parts.slice(idxTree + 2).join("/");
                          }
                          return { owner, repo, branch, subdir };
                        } catch {}
                      }
                      const m = url.match(/^[\w.-]+\/[\w.-]+$/);
                      if (m) {
                        const [owner, repo] = url.split("/");
                        return {
                          owner,
                          repo,
                          branch: githubDialog.branch.trim(),
                          subdir: githubDialog.subdir.trim(),
                        };
                      }
                      return null;
                    };
                    const parsed = parseInput(githubDialog.repo);
                    if (!parsed || !parsed.owner || !parsed.repo) {
                      alert(
                        "Could not parse repository. Use owner/repo or a full GitHub URL.",
                      );
                      setGithubDialog((prev) => ({ ...prev, busy: false }));
                      return;
                    }
                    const owner = parsed.owner;
                    const repo = parsed.repo;
                    const branchSel = parsed.branch;
                    const subdirSel = parsed.subdir;

                    const headers: Record<string, string> = {
                      Accept: "application/vnd.github+json",
                    };
                    if (githubDialog.token)
                      headers["Authorization"] = `Bearer ${githubDialog.token}`;
                    headers["X-GitHub-Api-Version"] = "2022-11-28";

                    const repoRes = await fetch(
                      `https://api.github.com/repos/${owner}/${repo}`,
                      { headers },
                    );
                    if (!repoRes.ok) {
                      alert("Repo not found or no access");
                      return;
                    }
                    let repoJson: any = {};
                    try {
                      repoJson = await repoRes.json();
                    } catch {
                      repoJson = {};
                    }
                    const branch =
                      (branchSel && branchSel.length > 0
                        ? branchSel
                        : repoJson.default_branch) || "main";

                    // get tree sha
                    const refRes = await fetch(
                      `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
                      { headers },
                    );
                    if (!refRes.ok) {
                      alert("Could not list repo tree (branch may be wrong)");
                      return;
                    }
                    let treeJson: any = null;
                    try {
                      treeJson = await refRes.json();
                    } catch {
                      treeJson = { tree: [] };
                    }
                    const allow =
                      /\.(ts|tsx|js|jsx|css|md|markdown|json|html|txt)$/i;
                    const prefix = (() => {
                      const t = (subdirSel || "").trim();
                      if (!t) return "";
                      if (t.includes("..")) return "";
                      return t.replace(/^\/+|\/+$/g, "") + "/";
                    })();
                    const filesMap: Record<string, string> = {};
                    const treeList = Array.isArray(treeJson?.tree)
                      ? treeJson.tree
                      : [];
                    const items: any[] = [];
                    for (const t of treeList) {
                      try {
                        if (!t || t.type !== "blob") continue;
                        const pth = typeof t.path === "string" ? t.path : "";
                        if (!pth) continue;
                        if (prefix && !pth.startsWith(prefix)) continue;
                        if (
                          !/(\.ts|\.tsx|\.js|\.jsx|\.css|\.md|\.markdown|\.json|\.html|\.txt)$/i.test(
                            pth,
                          )
                        )
                          continue;
                        items.push(t);
                      } catch {
                        /* skip */
                      }
                    }
                    // limit to avoid rate limits
                    if (items.length === 0) {
                      alert(
                        "No matching files found (try a different subdirectory or branch).",
                      );
                      return;
                    }
                    async function fetchOne(it: any): Promise<void> {
                      const p = typeof it.path === "string" ? it.path : "";
                      if (!p) return;
                      let txt = "";
                      try {
                        const safePathRaw = p
                          .split("/")
                          .map(encodeURIComponent)
                          .join("/");
                        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${safePathRaw}`;
                        const raw = await fetch(rawUrl).catch(
                          () => null as any,
                        );
                        if (raw && raw.ok) {
                          txt = await raw.text();
                        } else {
                          const safePath = p
                            .split("/")
                            .map(encodeURIComponent)
                            .join("/");
                          const contentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${safePath}?ref=${encodeURIComponent(branch)}`;
                          const r = await fetch(contentUrl, { headers }).catch(
                            () => null as any,
                          );
                          if (r && r.ok) {
                            let j: any = null;
                            try {
                              j = await r.json();
                            } catch {
                              j = null;
                            }
                            if (
                              j &&
                              typeof j.content === "string" &&
                              (j.encoding === "base64" ||
                                /[^\x00-\x7F]/.test(j.content))
                            ) {
                              const b64 = (j.content as string).replace(
                                /\n/g,
                                "",
                              );
                              txt = base64ToString(b64);
                            } else if (j && j.download_url) {
                              const rr = await fetch(j.download_url, {}).catch(
                                () => null as any,
                              );
                              if (rr && rr.ok) txt = await rr.text();
                            } else if (typeof j === "string") {
                              txt = j as string;
                            }
                          }
                        }
                      } catch {}
                      if (!txt) {
                        try {
                          const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${it.sha}`;
                          const rr = await fetch(blobUrl, {
                            headers: {
                              ...headers,
                              Accept: "application/vnd.github.raw",
                            },
                          }).catch(() => null as any);
                          if (rr && rr.ok) txt = await rr.text();
                        } catch {}
                      }
                      if (typeof txt === "string" && txt.length >= 0) {
                        filesMap["/" + p] = txt;
                      }
                    }

                    async function mapLimit<T>(
                      arr: T[],
                      limit: number,
                      fn: (t: T) => Promise<void>,
                    ) {
                      let i = 0;
                      const workers = Array.from(
                        { length: Math.min(limit, arr.length) },
                        () =>
                          (async () => {
                            while (true) {
                              const idx = i++;
                              if (idx >= arr.length) break;
                              await fn(arr[idx]!);
                            }
                          })(),
                      );
                      await Promise.all(workers);
                    }

                    const capped = items.slice(0, 400);
                    await mapLimit(capped, 8, fetchOne);
                    const name =
                      `GitHub: ${owner}/${repo}` +
                      (subdirSel ? `/${subdirSel}` : "") +
                      `@${branch}`;
                    setModules((ms) => [...ms, { name, files: filesMap }]);
                    setGithubDialog((prev) => ({ ...prev, open: false }));
                    onShowSeed();
                  } catch (err) {
                    alert((err as Error).message || "Import failed");
                  } finally {
                    setGithubDialog((prev) => ({ ...prev, busy: false }));
                  }
                }}
              >
                {githubDialog.busy ? "Importing…" : "Import"}
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Tip: create a fine‑grained PAT with repo read permissions for
              private repos. Token is saved only in your browser localStorage.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
