import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Palette,
  Layers,
  FileCode2,
  Settings,
  Share2,
  Download,
  Upload,
  Grid3x3,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  Eye,
  Zap,
} from "lucide-react";
import FigmaAuthDialog from "@/components/figma/FigmaAuthDialog";
import FigmaWorkspaceBrowser from "@/components/figma/FigmaWorkspaceBrowser";
import CanvasRenderer from "@/components/figma/CanvasRenderer";
import CanvasToolsPanel from "@/components/figma/CanvasToolsPanel";
import InspectorPanel from "@/components/figma/InspectorPanel";
import LayerManager from "@/components/figma/LayerManager";
import AIAssetLabUI from "@/components/figma/AIAssetLabUI";
import DesignSystemPanel from "@/components/figma/DesignSystemPanel";
import InteractionPanel from "@/components/figma/InteractionPanel";
import AnimationTimeline from "@/components/figma/AnimationTimeline";
import DevicePreview from "@/components/figma/DevicePreview";
import {
  figmaApiService,
  type FigmaOAuthToken,
} from "@/services/figmaApiService";
import {
  figmaWorkspaceService,
  type WorkspaceFile,
  type WorkspaceAsset,
} from "@/services/figmaWorkspaceService";
import { canvasEngine, type ToolType } from "@/services/CanvasEngine";
import { toast } from "@/hooks/use-toast";

export default function FigmaDesignEnvironment() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("design");
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<WorkspaceAsset[]>([]);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasMode, setCanvasMode] = useState<
    "design" | "prototype" | "inspect"
  >("design");
  const [selectedTool, setSelectedTool] = useState<ToolType>("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showLayers, setShowLayers] = useState(true);
  const [showTools, setShowTools] = useState(true);
  const [showAssetLab, setShowAssetLab] = useState(false);
  const [workspaceStats, setWorkspaceStats] = useState<any>(null);

  useEffect(() => {
    const isAuth = figmaApiService.isAuthenticated();
    setIsAuthenticated(isAuth);

    if (isAuth) {
      loadWorkspaceStats();
    }
  }, []);

  const loadWorkspaceStats = () => {
    const stats = figmaWorkspaceService.getStats();
    setWorkspaceStats(stats);
  };

  const handleAuthComplete = (token: FigmaOAuthToken) => {
    setIsAuthenticated(true);
    loadWorkspaceStats();
    toast({
      title: "Connected",
      description: "Successfully connected to Figma workspace",
    });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedFile(null);
    setSelectedAssets([]);
    canvasEngine.setState({ elements: [], selectedIds: [] });
    loadWorkspaceStats();
    toast({
      title: "Disconnected",
      description: "Disconnected from Figma",
    });
  };

  const handleExportDesign = async () => {
    try {
      const json = canvasEngine.exportJSON();
      const dataBlob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `figma-design-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Exported",
        description: "Design exported as JSON",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConvertToCode = () => {
    const state = canvasEngine.getState();
    if (state.elements.length === 0) {
      toast({
        title: "Error",
        description: "Add shapes to your canvas before converting",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Converting...",
      description: "Design to Code conversion in progress",
    });
  };

  useEffect(() => {
    if (activeTab === "prototype") {
      setCanvasMode("prototype");
    } else if (activeTab === "design-system") {
      setCanvasMode("inspect");
    } else {
      setCanvasMode("design");
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/5 flex flex-col">
      {/* Top Toolbar */}
      <div className="sticky top-16 z-30 border-b border-primary/10 bg-background/75 backdrop-blur">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Palette className="w-6 h-6 text-cyan-400" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Figma Design Environment
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">{canvasMode.toUpperCase()}</Badge>
              <Button onClick={handleExportDesign} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleConvertToCode} variant="outline" size="sm">
                <FileCode2 className="w-4 h-4 mr-2" />
                To Code
              </Button>
              {isAuthenticated && (
                <Button onClick={handleLogout} variant="outline" size="sm">
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {!isAuthenticated ? (
          <div className="h-full flex items-center justify-center">
            <FigmaAuthDialog
              isOpen={!isAuthenticated}
              onAuthComplete={handleAuthComplete}
            />
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-5 rounded-none border-b border-primary/10">
              <TabsTrigger value="design" className="rounded-none">
                Design Canvas
              </TabsTrigger>
              <TabsTrigger value="workspace" className="rounded-none">
                Workspace
              </TabsTrigger>
              <TabsTrigger value="assets" className="rounded-none">
                <Zap className="w-4 h-4 mr-2" />
                AI Assets
              </TabsTrigger>
              <TabsTrigger value="design-system" className="rounded-none">
                <Layers className="w-4 h-4 mr-2" />
                Design System
              </TabsTrigger>
              <TabsTrigger value="prototype" className="rounded-none">
                <Eye className="w-4 h-4 mr-2" />
                Prototype
              </TabsTrigger>
            </TabsList>

            {/* Design Tab */}
            <TabsContent value="design" className="flex-1 overflow-hidden p-4">
              <div className="grid grid-cols-12 gap-4 h-full">
                {/* Left - Tools */}
                {showTools && (
                  <div className="col-span-2">
                    <CanvasToolsPanel
                      selectedTool={selectedTool}
                      onToolChange={setSelectedTool}
                      selectedIds={selectedIds}
                      onElementsAdded={() => {}}
                    />
                  </div>
                )}

                {/* Center - Canvas */}
                <div
                  className={`${showTools ? "col-span-7" : "col-span-8"} flex flex-col gap-3`}
                >
                  <CanvasRenderer
                    zoom={canvasZoom}
                    onZoomChange={setCanvasZoom}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                  />
                </div>

                {/* Right - Layers & Inspector */}
                <div
                  className={`${showTools ? "col-span-3" : "col-span-4"} flex flex-col gap-3 overflow-hidden`}
                >
                  <Tabs defaultValue="layers" className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="layers" className="text-xs">
                        Layers
                      </TabsTrigger>
                      <TabsTrigger value="inspector" className="text-xs">
                        Inspector
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent
                      value="layers"
                      className="flex-1 overflow-hidden"
                    >
                      <LayerManager
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                      />
                    </TabsContent>
                    <TabsContent
                      value="inspector"
                      className="flex-1 overflow-hidden"
                    >
                      <InspectorPanel selectedIds={selectedIds} />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </TabsContent>

            {/* Workspace Tab */}
            <TabsContent value="workspace" className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <Card className="border border-primary/20 bg-background/75 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Grid3x3 className="w-4 h-4" />
                        Workspace Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Files</p>
                        <p className="text-lg font-bold">
                          {workspaceStats?.totalFiles || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Assets</p>
                        <p className="text-lg font-bold">
                          {workspaceStats?.totalAssets || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Components
                        </p>
                        <p className="text-lg font-bold">
                          {workspaceStats?.componentCount || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="col-span-2">
                  <FigmaWorkspaceBrowser
                    onFileSelect={(file) => {
                      if ("components" in file) {
                        setSelectedFile(file as WorkspaceFile);
                      }
                    }}
                    onAssetSelect={(asset) => {
                      if (!selectedAssets.find((a) => a.id === asset.id)) {
                        setSelectedAssets([
                          ...selectedAssets,
                          asset as WorkspaceAsset,
                        ]);
                      }
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Assets Tab */}
            <TabsContent value="assets" className="flex-1 overflow-hidden p-4">
              <AIAssetLabUI />
            </TabsContent>

            {/* Design System Tab */}
            <TabsContent
              value="design-system"
              className="flex-1 overflow-auto p-4"
            >
              <DesignSystemPanel />
            </TabsContent>

            {/* Prototype Tab */}
            <TabsContent value="prototype" className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div className="h-[720px]">
                  <DevicePreview />
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="h-[760px]">
                    <InteractionPanel />
                  </div>
                  <div className="h-[760px]">
                    <AnimationTimeline />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
