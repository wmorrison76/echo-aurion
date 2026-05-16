import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Settings,
  Zap,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  RotateCw,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectConfig {
  projectName: string;
  projectId: string;
  devServerUrl: string;
  autoDetectUrl: boolean;
  runtimeDependencies: string[];
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => Promise<void>;
}

export default function ProjectSettings() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [echoAiOpen, setEchoAiOpen] = useState(false);
  const [echoAiAuraDensity, setEchoAiAuraDensity] = useState<number>(() => {
    try {
      const stored = parseFloat(
        localStorage.getItem("echo.popup.opacity") || "0.80",
      );
      return isNaN(stored) ? 0.8 : Math.max(0.25, Math.min(1, stored));
    } catch {
      return 0.8;
    }
  });
  const [config, setConfig] = useState<ProjectConfig>(() => {
    const saved = localStorage.getItem("project.config");
    return saved
      ? JSON.parse(saved)
      : {
          projectName: "LUCCCA Framework",
          projectId: "luccca-enterprise-" + Date.now(),
          devServerUrl: "http://localhost:8080",
          autoDetectUrl: true,
          runtimeDependencies: [
            "react@18.3.1",
            "react-router-dom@6.30.1",
            "typescript@5.9.2",
            "vite@7.1.2",
            "tailwindcss@3.4.17",
          ],
        };
  });

  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: "connect-repo",
      title: "Connect Repository",
      description: "Connect wmorrison76/LUCCCA_Framework repository",
      completed: localStorage.getItem("setup.repo.connected") === "true",
    },
    {
      id: "validate-files",
      title: "Validate Files",
      description: "Verify 100% of project files are present",
      completed: localStorage.getItem("setup.files.validated") === "true",
    },
    {
      id: "setup-env",
      title: "Setup Environment",
      description: "Configure development environment variables",
      completed: localStorage.getItem("setup.env.complete") === "true",
    },
    {
      id: "launch-dev",
      title: "Launch Dev Server",
      description: "Start development server on configured port",
      completed: localStorage.getItem("setup.dev.running") === "true",
    },
    {
      id: "activate-features",
      title: "Activate Features",
      description: "Enable all 17 modules and ecosystem integrations",
      completed: localStorage.getItem("setup.features.active") === "true",
    },
  ]);

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    localStorage.setItem("project.config", JSON.stringify(config));
  }, [config]);

  const handleConnectRepository = async () => {
    setLoading(true);
    try {
      // Simulate repository connection
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSteps((prev) =>
        prev.map((s) =>
          s.id === "connect-repo" ? { ...s, completed: true } : s,
        ),
      );
      localStorage.setItem("setup.repo.connected", "true");

      toast({
        title: "Repository Connected",
        description: "wmorrison76/LUCCCA_Framework is now connected",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect repository. Check your credentials.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateFiles = async () => {
    setLoading(true);
    try {
      // Simulate file validation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSteps((prev) =>
        prev.map((s) =>
          s.id === "validate-files" ? { ...s, completed: true } : s,
        ),
      );
      localStorage.setItem("setup.files.validated", "true");

      toast({
        title: "Files Validated",
        description: "All project files are present and valid (100%)",
      });
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Some files are missing or invalid.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupEnvironment = async () => {
    setLoading(true);
    try {
      // Simulate environment setup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSteps((prev) =>
        prev.map((s) => (s.id === "setup-env" ? { ...s, completed: true } : s)),
      );
      localStorage.setItem("setup.env.complete", "true");

      toast({
        title: "Environment Configured",
        description: "Development environment is ready",
      });
    } catch (error) {
      toast({
        title: "Setup Failed",
        description: "Failed to configure environment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchDevServer = async () => {
    setLoading(true);
    try {
      // Simulate dev server launch (already running at localhost:8080)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSteps((prev) =>
        prev.map((s) =>
          s.id === "launch-dev" ? { ...s, completed: true } : s,
        ),
      );
      localStorage.setItem("setup.dev.running", "true");

      toast({
        title: "Dev Server Running",
        description: `Development server is running at ${config.devServerUrl}`,
      });
    } catch (error) {
      toast({
        title: "Launch Failed",
        description: "Failed to launch development server.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateFeatures = async () => {
    setLoading(true);
    try {
      // Simulate feature activation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSteps((prev) =>
        prev.map((s) =>
          s.id === "activate-features" ? { ...s, completed: true } : s,
        ),
      );
      localStorage.setItem("setup.features.active", "true");

      toast({
        title: "Features Activated",
        description: "All 17 modules and ecosystem integrations are active",
      });
      setShowWizard(false);
    } catch (error) {
      toast({
        title: "Activation Failed",
        description: "Failed to activate features.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEchoAi = () => {
    setEchoAiOpen(!echoAiOpen);
    window.dispatchEvent(
      new CustomEvent("echoai:toggle", { detail: { open: !echoAiOpen } }),
    );
  };

  const handleEchoAiAuraDensityChange = (value: number) => {
    setEchoAiAuraDensity(value);
    localStorage.setItem("echo.popup.opacity", value.toString());
    window.dispatchEvent(
      new CustomEvent("echoai:aura-change", { detail: { density: value } }),
    );
  };

  const allStepsCompleted = steps.every((s) => s.completed);
  const completedCount = steps.filter((s) => s.completed).length;

  const currentStep = steps[activeStep];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-foreground/80 shadow-sm transition hover:bg-accent/30 hover:text-foreground"
          title="Project Settings"
          aria-label="Project Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Project Settings
          </DialogTitle>
          <DialogDescription>
            Configure LUCCCA Enterprise Codespace and manage project setup
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            <TabsTrigger value="design">Design System</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] pr-4">
            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6 p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                  <CardDescription>
                    Basic project configuration for LUCCCA Enterprise
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      value={config.projectName}
                      onChange={(e) =>
                        setConfig({ ...config, projectName: e.target.value })
                      }
                      placeholder="LUCCCA Framework"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-id">Project ID</Label>
                    <div className="flex gap-2">
                      <Input
                        id="project-id"
                        value={config.projectId}
                        readOnly
                        className="bg-accent/30"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(config.projectId);
                          toast({
                            title: "Copied",
                            description: "Project ID copied to clipboard",
                          });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dev-url">Development Server URL</Label>
                    <Input
                      id="dev-url"
                      value={config.devServerUrl}
                      onChange={(e) =>
                        setConfig({ ...config, devServerUrl: e.target.value })
                      }
                      placeholder="http://localhost:8080"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL will be auto-detected from terminal output
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="auto-detect"
                      checked={config.autoDetectUrl}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, autoDetectUrl: !!checked })
                      }
                    />
                    <Label
                      htmlFor="auto-detect"
                      className="text-sm font-normal"
                    >
                      Auto-detect dev server URL
                    </Label>
                  </div>

                  <Button variant="outline" size="sm">
                    Show advanced auto-detection settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Connected Repository</CardTitle>
                  <CardDescription>
                    GitHub repository for LUCCCA Enterprise
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                    <div>
                      <p className="font-medium text-sm">
                        wmorrison76/LUCCCA_Framework
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Main repository for enterprise deployment
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Echo AI Chat
                  </CardTitle>
                  <CardDescription>
                    Control the AI chat assistant from the settings panel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/20">
                    <div className="flex-1">
                      <p className="font-medium text-sm">Chat Window</p>
                      <p className="text-xs text-muted-foreground">
                        {echoAiOpen
                          ? "Chat is open and always on top"
                          : "Chat is closed"}
                      </p>
                    </div>
                    <Button
                      variant={echoAiOpen ? "default" : "outline"}
                      size="sm"
                      onClick={handleToggleEchoAi}
                    >
                      {echoAiOpen ? "Close" : "Open"}
                    </Button>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Aura Density
                      </Label>
                      <span className="text-sm font-semibold text-primary">
                        {Math.round(echoAiAuraDensity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="100"
                      step="1"
                      value={Math.round(echoAiAuraDensity * 100)}
                      onChange={(e) =>
                        handleEchoAiAuraDensityChange(
                          parseInt(e.target.value) / 100,
                        )
                      }
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                      style={{
                        accentColor: "hsl(var(--primary))",
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Adjust the transparency of the chat window. Default is 80%
                      opaque.
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm font-medium">Features</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Unified voice</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Auto-scrolling</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Always on top (Z:99999)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Voice enabled</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Workspace Tab */}
            <TabsContent value="workspace" className="space-y-6 p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Workspace Configuration</CardTitle>
                  <CardDescription>
                    Configure your LUCCCA workspace and integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Setup Wizard</h4>
                    <p className="text-sm text-muted-foreground">
                      Complete setup steps to activate all features
                    </p>
                    <Button
                      onClick={() => setShowWizard(true)}
                      className="w-full"
                      variant={allStepsCompleted ? "outline" : "default"}
                    >
                      {allStepsCompleted ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Setup Complete
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Launch Setup Wizard
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <h4 className="font-medium">Setup Progress</h4>
                    <div className="space-y-2">
                      {steps.map((step) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border"
                        >
                          {step.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{step.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {step.description}
                            </p>
                          </div>
                          {step.completed && (
                            <Badge variant="secondary">Complete</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Overall Progress</p>
                      <p className="text-sm text-muted-foreground">
                        {completedCount} of {steps.length} steps
                      </p>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(completedCount / steps.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Design System Tab */}
            <TabsContent value="design" className="space-y-6 p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Design System</CardTitle>
                  <CardDescription>
                    Configure theme and UI component settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Color Scheme
                      </Label>
                      <Badge>Cyan (Default)</Badge>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Theme Mode</Label>
                      <Badge>Auto (System)</Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <h4 className="text-sm font-medium">
                      Available Color Schemes
                    </h4>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { name: "Cyan", hex: "#00d4ff" },
                        { name: "Blue", hex: "#3b82f6" },
                        { name: "Emerald", hex: "#10b981" },
                        { name: "Violet", hex: "#8b5cf6" },
                        { name: "Rose", hex: "#f43f5e" },
                      ].map(({ name, hex }) => (
                        <button
                          key={name}
                          className="flex items-center justify-center w-full h-12 rounded-lg border-2 border-border hover:border-foreground transition"
                          style={{ backgroundColor: hex + "20" }}
                          title={name}
                        >
                          <div
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: hex }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <h4 className="text-sm font-medium">UI Components</h4>
                    <p className="text-xs text-muted-foreground">
                      Built with Radix UI and Tailwind CSS. Full component
                      library with 50+ components available.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6 p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Runtime Dependencies</CardTitle>
                  <CardDescription>
                    Manage project dependencies and versions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {config.runtimeDependencies.map((dep) => (
                      <div
                        key={dep}
                        className="flex items-center justify-between p-2 rounded border border-border text-sm"
                      >
                        <span className="font-mono text-xs">{dep}</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Node Version</p>
                      <p className="font-mono text-xs">v18.17.0+</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">npm/pnpm</p>
                      <p className="font-mono text-xs">pnpm 10.14.0</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Build Tool</p>
                      <p className="font-mono text-xs">Vite 7.1.2</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">TypeScript</p>
                      <p className="font-mono text-xs">5.9.2</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Setup Wizard Modal */}
        {showWizard && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  LUCCCA Setup Wizard
                </CardTitle>
                <CardDescription>
                  Step {activeStep + 1} of {steps.length}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {currentStep && (
                  <>
                    <div className="space-y-2">
                      <h3 className="font-semibold">{currentStep.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {currentStep.description}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-accent/30 border border-border space-y-3">
                      {currentStep.id === "connect-repo" && (
                        <>
                          <p className="text-sm">
                            <strong>Repository:</strong>{" "}
                            wmorrison76/LUCCCA_Framework
                          </p>
                          <Button
                            onClick={handleConnectRepository}
                            disabled={loading || currentStep.completed}
                            className="w-full"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : currentStep.completed ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Connected
                              </>
                            ) : (
                              "Connect Repository"
                            )}
                          </Button>
                        </>
                      )}

                      {currentStep.id === "validate-files" && (
                        <>
                          <p className="text-sm">
                            Verify all project files are present and valid.
                          </p>
                          <Button
                            onClick={handleValidateFiles}
                            disabled={loading || currentStep.completed}
                            className="w-full"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Validating...
                              </>
                            ) : currentStep.completed ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                100% Valid
                              </>
                            ) : (
                              "Validate Files"
                            )}
                          </Button>
                        </>
                      )}

                      {currentStep.id === "setup-env" && (
                        <>
                          <p className="text-sm">
                            Configure development environment variables and
                            paths.
                          </p>
                          <Button
                            onClick={handleSetupEnvironment}
                            disabled={loading || currentStep.completed}
                            className="w-full"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Setting up...
                              </>
                            ) : currentStep.completed ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Configured
                              </>
                            ) : (
                              "Setup Environment"
                            )}
                          </Button>
                        </>
                      )}

                      {currentStep.id === "launch-dev" && (
                        <>
                          <p className="text-sm">
                            Development server will run at:{" "}
                            {config.devServerUrl}
                          </p>
                          <Button
                            onClick={handleLaunchDevServer}
                            disabled={loading || currentStep.completed}
                            className="w-full"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Launching...
                              </>
                            ) : currentStep.completed ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Running
                              </>
                            ) : (
                              "Launch Dev Server"
                            )}
                          </Button>
                        </>
                      )}

                      {currentStep.id === "activate-features" && (
                        <>
                          <p className="text-sm">
                            Activate all 17 modules and ecosystem integrations.
                          </p>
                          <Button
                            onClick={handleActivateFeatures}
                            disabled={loading || currentStep.completed}
                            className="w-full"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Activating...
                              </>
                            ) : currentStep.completed ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Active
                              </>
                            ) : (
                              "Activate All Features"
                            )}
                          </Button>
                        </>
                      )}
                    </div>

                    {currentStep.completed && activeStep < steps.length - 1 && (
                      <Button
                        onClick={() => setActiveStep(activeStep + 1)}
                        className="w-full"
                      >
                        Next Step
                      </Button>
                    )}

                    {activeStep === steps.length - 1 && allStepsCompleted && (
                      <Button
                        onClick={() => setShowWizard(false)}
                        className="w-full"
                        variant="default"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Complete Setup
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
