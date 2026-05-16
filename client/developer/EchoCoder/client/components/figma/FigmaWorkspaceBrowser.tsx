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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileCode2,
  Image as ImageIcon,
  Package,
  Palette,
  Search,
  Download,
  Upload,
  Clock,
  Loader2,
  Eye,
  Trash2,
} from "lucide-react";
import {
  figmaApiService,
  type FigmaFile,
  type FigmaComponent,
} from "@/services/figmaApiService";
import {
  figmaWorkspaceService,
  type WorkspaceFile,
  type WorkspaceAsset,
} from "@/services/figmaWorkspaceService";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FigmaWorkspaceBrowserProps {
  onFileSelect?: (file: FigmaFile | WorkspaceFile) => void;
  onAssetSelect?: (asset: FigmaComponent | WorkspaceAsset) => void;
}

export default function FigmaWorkspaceBrowser({
  onFileSelect,
  onAssetSelect,
}: FigmaWorkspaceBrowserProps) {
  const [activeTab, setActiveTab] = useState("workspace");
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [remoteFiles, setRemoteFiles] = useState<FigmaFile[]>([]);
  const [workspaceAssets, setWorkspaceAssets] = useState<WorkspaceAsset[]>([]);
  const [remoteComponents, setRemoteComponents] = useState<FigmaComponent[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<
    WorkspaceFile | FigmaFile | null
  >(null);

  useEffect(() => {
    loadWorkspaceData();
    if (figmaApiService.isAuthenticated()) {
      loadRemoteData();
    }
  }, []);

  const loadWorkspaceData = () => {
    const files = figmaWorkspaceService.getFiles();
    const assets = figmaWorkspaceService.getAssets();
    setWorkspaceFiles(files);
    setWorkspaceAssets(assets);
  };

  const loadRemoteData = async () => {
    try {
      setLoading(true);
      const files = await figmaApiService.getAllFiles();
      setRemoteFiles(files);

      const teams = await figmaApiService.getTeams();
      if (teams.length > 0) {
        const components = await figmaApiService.getTeamComponents(teams[0].id);
        setRemoteComponents(components);
      }
    } catch (error: any) {
      toast({
        title: "Failed to Load Files",
        description: error.message || "Could not fetch files from Figma",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async (figmaFile: FigmaFile) => {
    try {
      setLoading(true);

      const fileDetail = await figmaApiService.getFileDetail(figmaFile.key);
      const components = await figmaApiService.getFileComponents(figmaFile.key);

      const workspaceFile = figmaWorkspaceService.addFile({
        figmaFileKey: figmaFile.key,
        name: figmaFile.name,
        thumbnail: figmaFile.thumbnailUrl,
        lastModified: Date.now(),
        status: "synced",
        data: fileDetail,
        components: Object.keys(components),
        assets: [],
      });

      // Import components as assets
      Object.entries(components).forEach(([key, component]) => {
        figmaWorkspaceService.addAsset({
          name: (component as any).name,
          type: "COMPONENT",
          thumbnail: (component as any).thumbnailUrl,
          fileId: workspaceFile.id,
          figmaKey: key,
          metadata: {
            description: (component as any).description,
            nodeId: (component as any).nodeId,
          },
        });
      });

      loadWorkspaceData();

      toast({
        title: "File Imported",
        description: `${figmaFile.name} has been added to your workspace`,
      });

      onFileSelect?.(workspaceFile);
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Could not import file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    if (confirm("Delete this file from workspace?")) {
      figmaWorkspaceService.deleteFile(fileId);
      loadWorkspaceData();
      setSelectedFile(null);

      toast({
        title: "Deleted",
        description: "File removed from workspace",
      });
    }
  };

  const filteredWorkspaceFiles = workspaceFiles.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const filteredRemoteFiles = remoteFiles.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const filteredAssets = workspaceAssets.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="workspace" className="flex items-center gap-2">
            <FileCode2 className="w-4 h-4" />
            <span>My Files</span>
          </TabsTrigger>
          <TabsTrigger value="remote" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>Assets</span>
          </TabsTrigger>
        </TabsList>

        {/* Workspace Files Tab */}
        <TabsContent value="workspace" className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredWorkspaceFiles.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-40 text-center">
                <FileCode2 className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="font-medium text-foreground">No files yet</p>
                <p className="text-sm text-muted-foreground">
                  Import Figma files to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-96 border border-primary/10 rounded-lg">
              <div className="space-y-2 p-4">
                {filteredWorkspaceFiles.map((file) => (
                  <Card
                    key={file.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      selectedFile?.id === file.id && "border-primary",
                    )}
                    onClick={() => {
                      setSelectedFile(file);
                      onFileSelect?.(file);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {file.thumbnail && (
                          <img
                            src={file.thumbnail}
                            alt={file.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-foreground">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {file.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(file.lastModified).toLocaleDateString()}
                            </span>
                          </div>
                          {file.components.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {file.components.length} components
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Remote Files Tab */}
        <TabsContent value="remote" className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search Figma files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={loadRemoteData}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredRemoteFiles.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-40 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="font-medium text-foreground">No files found</p>
                <p className="text-sm text-muted-foreground">
                  Connect to Figma to see your files
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-96 border border-primary/10 rounded-lg">
              <div className="space-y-2 p-4">
                {filteredRemoteFiles.map((file) => (
                  <Card
                    key={file.key}
                    className="cursor-pointer transition-all hover:border-primary/50"
                    onClick={() => {
                      setSelectedFile(file);
                      onFileSelect?.(file);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {file.thumbnailUrl && (
                          <img
                            src={file.thumbnailUrl}
                            alt={file.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-foreground">
                            {file.name}
                          </p>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(file.lastModified).toLocaleDateString()}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImportFile(file);
                          }}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredAssets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-40 text-center">
                <Package className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="font-medium text-foreground">No assets</p>
                <p className="text-sm text-muted-foreground">
                  Import files to see components and assets
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-96 border border-primary/10 rounded-lg">
              <div className="grid grid-cols-2 gap-2 p-4">
                {filteredAssets.map((asset) => (
                  <Card
                    key={asset.id}
                    className="cursor-pointer transition-all hover:border-primary/50"
                    onClick={() => onAssetSelect?.(asset)}
                  >
                    <CardContent className="p-3">
                      {asset.thumbnail && (
                        <img
                          src={asset.thumbnail}
                          alt={asset.name}
                          className="w-full h-20 rounded object-cover mb-2"
                        />
                      )}
                      <p className="font-medium text-sm truncate text-foreground">
                        {asset.name}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {asset.type === "COMPONENT" && (
                          <Package className="w-3 h-3 text-blue-500" />
                        )}
                        {asset.type === "COMPONENT_SET" && (
                          <Palette className="w-3 h-3 text-purple-500" />
                        )}
                        {asset.type === "IMAGE" && (
                          <ImageIcon className="w-3 h-3 text-green-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {asset.type}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
