import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings as SettingsIcon,
  Upload,
  FileText,
  Archive,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Code2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResponsiveContainer,
  ResponsiveGrid,
  useBreakpoint,
} from "@/components/layout";
import { detectConnectedFiles, shouldExcludeFile, getFileType } from "../../shared/file-scanner";
import type { FileEntry } from "../../shared/file-scanner";
import { isEchoCoderProtected } from "../../shared/echocoder-protected-files";

interface ImportSession {
  id: string;
  folderName: string;
  files: FileEntry[];
  totalSize: number;
  timestamp: number;
  progress: number;
  status: "scanning" | "analyzed" | "importing" | "completed" | "error";
}

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ImportSession | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [echoCoderEnabled, setEchoCoderEnabled] = useState(
    localStorage.getItem("echocoder.enabled") === "true"
  );
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  const connectedFiles = useMemo(() => {
    if (!currentSession) return [];
    return currentSession.files.filter((f) => f.isConnected);
  }, [currentSession]);

  const archivedFiles = useMemo(() => {
    if (!currentSession) return [];
    return currentSession.files.filter((f) => !f.isConnected);
  }, [currentSession]);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    try {
      const fileList: FileEntry[] = [];
      let totalSize = 0;

      for (const file of Array.from(files)) {
        const path = (file as any).webkitRelativePath || file.name;

        if (shouldExcludeFile(path) || isEchoCoderProtected(path)) {
          continue;
        }

        totalSize += file.size;

        const entry: FileEntry = {
          path,
          type: getFileType(path),
          size: file.size,
          isConnected: detectConnectedFiles(path).length > 0,
        };

        fileList.push(entry);
      }

      const session: ImportSession = {
        id: Date.now().toString(),
        folderName: (fileInputRef.current?.files?.[0] as any)?.webkitRelativePath?.split("/")[0] || "Folder",
        files: fileList,
        totalSize,
        timestamp: Date.now(),
        progress: 0,
        status: "analyzed",
      };

      setSessions([session, ...sessions]);
      setCurrentSession(session);
      toast({
        title: "Success",
        description: `Analyzed ${fileList.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze folder",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <ResponsiveContainer className="py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8" />
              <span>Settings</span>
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-2">
              Configure your platform preferences and integrations
            </p>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full gap-1 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
            <TabsTrigger value="general" className="text-xs sm:text-sm">
              General
            </TabsTrigger>
            <TabsTrigger value="import" className="text-xs sm:text-sm">
              Import
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm">
              Security
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs sm:text-sm">
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">General Settings</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Basic platform configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* EchoCoder Toggle */}
                <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">EchoCoder</p>
                    <p className="text-xs text-muted-foreground">Enable AI code generation</p>
                  </div>
                  <Button
                    variant={echoCoderEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEchoCoderEnabled(!echoCoderEnabled)}
                    className="text-xs"
                  >
                    {echoCoderEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import Settings */}
          <TabsContent value="import" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            {/* Upload Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Import Project</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Upload a project folder for analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  webkitdirectory="true"
                  onChange={handleFolderSelect}
                  disabled={isScanning}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  className="w-full text-xs sm:text-sm"
                  size={isMobile ? "sm" : "default"}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Select Folder
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Sessions List */}
            {sessions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Import Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div key={session.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium">{session.folderName}</p>
                            <p className="text-xs text-muted-foreground">
                              {session.files.length} files • {(session.totalSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Badge className="text-xs capitalize">{session.status}</Badge>
                        </div>
                        {session.status === "importing" && (
                          <Progress value={session.progress} className="mt-2 h-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Security</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Manage security and privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 sm:p-4 border rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium">API Keys</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Manage your API keys securely
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Advanced Settings</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Advanced configuration options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Advanced settings will appear here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveContainer>
  );
}
