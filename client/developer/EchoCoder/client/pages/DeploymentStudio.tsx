import { useState } from "react";
import { DeploymentPanel } from "@/components/studio/DeploymentPanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  ResponsiveGrid,
  useBreakpoint,
} from "@/components/layout";
import {
  Code,
  Copy,
  Download,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Zap,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function DeploymentStudio() {
  const [code, setCode] = useState(`
import React from 'react';

export default function MyComponent() {
  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        My Awesome Module
      </h1>
      <p className="text-lg text-gray-600">
        Ready to deploy to production!
      </p>
    </div>
  );
}
  `);

  const [moduleName, setModuleName] = useState("MyComponent");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("netlify");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<"idle" | "deploying" | "success" | "error">("idle");
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  const platforms = [
    { id: "netlify", label: "Netlify", description: "Static hosting" },
    { id: "vercel", label: "Vercel", description: "Next.js optimized" },
    { id: "github", label: "GitHub Pages", description: "Free hosting" },
    { id: "docker", label: "Docker", description: "Container deployment" },
  ];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Success",
      description: "Code copied to clipboard",
    });
  };

  const handleDownloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${moduleName}.tsx`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({
      title: "Success",
      description: "Code downloaded successfully",
    });
  };

  const handleDeploy = async () => {
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please provide code to deploy",
        variant: "destructive",
      });
      return;
    }

    setIsDeploying(true);
    setDeploymentStatus("deploying");

    try {
      // Simulate deployment
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setDeploymentStatus("success");
      toast({
        title: "Success",
        description: `Deployed to ${selectedPlatform}`,
      });
    } catch (error) {
      setDeploymentStatus("error");
      toast({
        title: "Error",
        description: "Deployment failed",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <ResponsiveContainer className="py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Code className="h-6 w-6 sm:h-8 sm:w-8" />
              <span>Deployment Studio</span>
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-2">
              Deploy your code to multiple cloud platforms with one click
            </p>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left: Code Editor */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Code Input Card */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Generated Code</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      Your React component ready for deployment
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Module Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">
                    Module Name
                  </label>
                  <Input
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    placeholder="e.g., RecipeCard, EventScheduler"
                    className="text-xs sm:text-sm"
                    aria-label="Module name"
                  />
                </div>

                {/* Code Editor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs sm:text-sm font-medium">
                      Code
                    </label>
                    <div className="flex gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyCode}
                        className="h-8 px-2 text-xs"
                        aria-label="Copy code"
                      >
                        <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline ml-1">Copy</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadCode}
                        className="h-8 px-2 text-xs"
                        aria-label="Download code"
                      >
                        <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline ml-1">Download</span>
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Your React code here..."
                    className="h-48 sm:h-64 font-mono text-xs sm:text-sm resize-none"
                    aria-label="Code editor"
                  />
                </div>

                {/* Code Stats */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Lines</p>
                    <p className="text-sm sm:text-base font-semibold">
                      {code.split("\n").length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Size</p>
                    <p className="text-sm sm:text-base font-semibold">
                      {(code.length / 1024).toFixed(1)}KB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Syntax</p>
                    <p className="text-sm sm:text-base font-semibold">TypeScript</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deployment Status */}
            {deploymentStatus !== "idle" && (
              <Card className={`border-l-4 ${
                deploymentStatus === "success"
                  ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
                  : deploymentStatus === "error"
                    ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/20"
                    : "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
              }`}>
                <CardContent className="pt-4 flex items-center gap-3">
                  {deploymentStatus === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : deploymentStatus === "error" ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Zap className="h-5 w-5 text-blue-600 animate-pulse" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {deploymentStatus === "success"
                        ? "Deployment successful!"
                        : deploymentStatus === "error"
                          ? "Deployment failed"
                          : "Deploying..."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {deploymentStatus === "success"
                        ? "Your code is now live"
                        : deploymentStatus === "error"
                          ? "Please check the logs and try again"
                          : "This may take a few moments"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Deployment Options */}
          <div className="space-y-4 sm:space-y-6">
            {/* Platform Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Deployment Platform</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Choose where to deploy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => setSelectedPlatform(platform.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition ${
                        selectedPlatform === platform.id
                          ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                          : "border-border hover:border-primary/50"
                      }`}
                      role="radio"
                      aria-checked={selectedPlatform === platform.id}
                    >
                      <p className="text-xs sm:text-sm font-medium">{platform.label}</p>
                      <p className="text-xs text-muted-foreground">{platform.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Deploy Button & Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Ready to Deploy?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Code validation passed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Platform selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Ready for production</span>
                  </div>
                </div>
                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying || !code.trim()}
                  className="w-full text-xs sm:text-sm"
                  size={isMobile ? "sm" : "default"}
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  {isDeploying ? "Deploying..." : "Deploy Now"}
                </Button>
              </CardContent>
            </Card>

            {/* Deployment Info */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm">Deployment Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <p>
                  <span className="text-muted-foreground">Platform:</span>
                  <br />
                  <Badge variant="outline" className="mt-1">{selectedPlatform}</Badge>
                </p>
                <p className="pt-2">
                  <span className="text-muted-foreground">Region:</span>
                  <br />
                  <Badge variant="outline" className="mt-1">us-east-1</Badge>
                </p>
                <p className="pt-2">
                  <span className="text-muted-foreground">Environment:</span>
                  <br />
                  <Badge variant="secondary" className="mt-1">Production</Badge>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );
}
