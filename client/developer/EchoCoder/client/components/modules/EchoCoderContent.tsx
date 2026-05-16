import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Code2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Zap,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { generateModuleWithAI, fixModuleWithAI } from "@/services/echocoderAI";
import {
  getAllModules,
  getModulesByCategory,
  ModuleInfo,
} from "@/lib/moduleDiscovery";
import { HelpButton } from "@/components/help/HelpButton";

export function EchoCoderContent() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [generating, setGenerating] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [description, setDescription] = useState("");
  const [moduleToFix, setModuleToFix] = useState("");
  const [fixError, setFixError] = useState("");

  useEffect(() => {
    setModules(getAllModules());
  }, []);

  const handleGenerateModule = async () => {
    if (!moduleName.trim() || !description.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both module name and description",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      await generateModuleWithAI({
        moduleName: moduleName.trim(),
        description: description.trim(),
      });

      toast({
        title: "Module generated!",
        description: `${moduleName} module created successfully. Refresh the page to see it.`,
      });

      setModuleName("");
      setDescription("");
      setModules(getAllModules());
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
        description: "Please select a module and describe the error",
        variant: "destructive",
      });
      return;
    }

    setFixing(true);
    try {
      await fixModuleWithAI(moduleToFix.trim(), fixError.trim());

      toast({
        title: "Module fixed!",
        description: `${moduleToFix} has been repaired. Refresh the page to see changes.`,
      });

      setModuleToFix("");
      setFixError("");
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

  const coreModules = getModulesByCategory(false);
  const generatedModules = getModulesByCategory(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Code2 className="h-8 w-8 text-cyan-500" />
            EchoCoder
          </h1>
          <p className="text-muted-foreground">
            AI-powered module generator. Describe what you need, and EchoCoder
            creates it for you.
          </p>
        </div>
        <HelpButton defaultGuideId="echocoder-overview" label="Help" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Generate Module Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-500" />
              Generate New Module
            </CardTitle>
            <CardDescription>
              Use AI to create a new module based on your description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Module Name</label>
              <Input
                placeholder="e.g., Analytics, Notifications, Inventory"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="mt-1"
                disabled={generating}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe what this module should do. Include features, data structure, and UI preferences. Be as detailed as possible."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 min-h-[120px]"
                disabled={generating}
              />
            </div>

            <div className="p-3 rounded bg-blue-900/30 border border-blue-700 text-xs text-blue-200">
              💡 Tip: Describe specific features, integrations, and data fields
              you need for best results.
            </div>

            <Button
              onClick={handleGenerateModule}
              disabled={generating}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {generating ? "Generating..." : "Generate Module"}
            </Button>
          </CardContent>
        </Card>

        {/* Fix Module Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              Fix Existing Module
            </CardTitle>
            <CardDescription>
              Ask EchoCoder to fix bugs or improve existing modules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <label className="text-sm font-medium">Issue Description</label>
              <Textarea
                placeholder="Describe the error, bug, or improvement needed. Include error messages if available."
                value={fixError}
                onChange={(e) => setFixError(e.target.value)}
                className="mt-1 min-h-[120px]"
                disabled={fixing}
              />
            </div>

            <div className="p-3 rounded bg-orange-900/30 border border-orange-700 text-xs text-orange-200">
              ⚡ EchoCoder will analyze the error and apply fixes automatically.
            </div>

            <Button
              onClick={handleFixModule}
              disabled={fixing}
              variant="secondary"
              className="w-full"
              size="lg"
            >
              {fixing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {fixing ? "Fixing..." : "Fix Module"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Generated Modules Section */}
      {generatedModules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Generated Modules ({generatedModules.length})
            </CardTitle>
            <CardDescription>Modules created with EchoCoder AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {generatedModules.map((module) => (
                <Card
                  key={module.id}
                  className="border-yellow-600/30 bg-yellow-900/10"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">
                          {module.name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {module.description}
                        </CardDescription>
                      </div>
                      <Badge className="bg-yellow-600/40">Generated</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => (window.location.href = module.route)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Open Module
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Core Modules Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-cyan-500" />
            Available Modules ({coreModules.length})
          </CardTitle>
          <CardDescription>
            Core modules available in your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {coreModules.map((module) => (
              <Card
                key={module.id}
                className="cursor-pointer hover:bg-accent/30 transition"
              >
                <CardHeader className="pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {module.icon} {module.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {module.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => (window.location.href = module.route)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-700/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5" />
            Tips for Best Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Be Specific:</strong> Describe exactly what you need -
            features, data fields, integrations, and user flows.
          </p>
          <p>
            <strong>Include Examples:</strong> Mention similar features or
            integrations you want to reference.
          </p>
          <p>
            <strong>Clear Use Cases:</strong> Explain who will use this module
            and what problems it solves.
          </p>
          <p>
            <strong>Refresh After Generation:</strong> Refresh the page after
            generating a new module to see it in the list.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EchoCoderPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="container px-4 py-8">
        <EchoCoderContent />
      </section>
    </main>
  );
}
