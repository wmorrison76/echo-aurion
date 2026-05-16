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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

  useEffect(() => {
    const isEnabled = localStorage.getItem("echocoder.enabled") === "true";
    setEnabled(isEnabled);
  }, []);

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
            EchoCoder is currently disabled. Enable it from Settings to access backend development tools.
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
              <CardDescription>Code generation & automation</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">Enabled</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="tools" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
          </TabsList>

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
                  Generates complete project structure with boilerplate code, configuration files, and documentation templates.
                </p>
              </div>
              <div className="p-3 rounded bg-accent/20 border border-border">
                <h4 className="font-medium mb-2">Code Analyzer</h4>
                <p className="text-muted-foreground text-xs">
                  Analyzes your codebase to identify dependencies, file connections, and structural patterns.
                </p>
              </div>
              <div className="p-3 rounded bg-accent/20 border border-border">
                <h4 className="font-medium mb-2">Performance Optimizer</h4>
                <p className="text-muted-foreground text-xs">
                  Provides recommendations for code optimization, bundle size reduction, and performance improvements.
                </p>
              </div>
              <div className="p-3 rounded bg-accent/20 border border-border">
                <h4 className="font-medium mb-2">Configuration Manager</h4>
                <p className="text-muted-foreground text-xs">
                  Manages build configurations, environment variables, deployment settings, and runtime options.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("open-panel", {
                detail: { id: "settings", tab: "developer" },
              })
            );
          }}
        >
          Configure EchoCoder Settings
        </Button>
      </CardContent>
    </Card>
  );
}
