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
  Sparkles,
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
import QuickSyncPanel from "@/components/device/QuickSyncPanel";
import OutletProfilesPanel from "@/components/device/OutletProfilesPanel";
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
  const [currentSession, setCurrentSession] = useState<ImportSession | null>(
    null
  );
  const [isScanning, setIsScanning] = useState(false);
  const [echoCoderEnabled, setEchoCoderEnabled] = useState(
    localStorage.getItem("echocoder.enabled") === "true"
  );
  const echoAiChecklist = [
    "Confirm outlet + role before approving an order",
    "Review variance alerts on invoices and transfers",
    "Check waste reason tags for accuracy",
    "Validate par-based recommendations before reorder",
    "Review transfer acknowledgements across departments",
    "Sync device templates before shift start",
  ];

  const connectedFiles = useMemo(() => {
    if (!currentSession) return [];
    return currentSession.files.filter((f) => f.isConnected);
  }, [currentSession]);

  const archivedFiles = useMemo(() => {
    if (!currentSession) return [];
    return currentSession.files.filter((f) => !f.isConnected);
  }, [currentSession]);


  const handleFolderSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    try {
      const fileList: FileEntry[] = [];
      const fileContentMap = new Map<string, string>();
      let totalSize = 0;

      // Convert FileList to array and analyze
      for (const file of Array.from(files)) {
        const path = (file as any).webkitRelativePath || file.name;

        // Skip excluded files and protected EchoCoder files
        if (shouldExcludeFile(path) || isEchoCoderProtected(path)) {
          continue;
        }

        totalSize += file.size;

        const entry: FileEntry = {
          path,
          type: getFileType(path),
          size: file.size,
          dependencies: [],
          isConnected: false,
        };

        fileList.push(entry);

        // Try to read file content for analysis
        if (entry.type === "source" || entry.type === "config") {
          try {
            const content = await file.text();
            fileContentMap.set(path, content);
          } catch {
            // Skip if we can't read the content
          }
        }
      }

      // Analyze connections
      const analyzedFiles = detectConnectedFiles(
        fileList,
        fileContentMap,
        30
      );

      const session: ImportSession = {
        id: Date.now().toString(),
        folderName: Array.from(files)[0].webkitRelativePath?.split("/")[0] || "Project",
        files: analyzedFiles,
        totalSize,
        timestamp: Date.now(),
        progress: 100,
        status: "analyzed",
      };

      setCurrentSession(session);
      setSessions((prev) => [session, ...prev]);

      const connected = analyzedFiles.filter((f) => f.isConnected).length;
      const archived = analyzedFiles.filter((f) => !f.isConnected).length;

      toast({
        title: "Scan Complete",
        description: `Found ${analyzedFiles.length} files. ${connected} connected, ${archived} to archive.`,
      });
    } catch (error) {
      toast({
        title: "Scan Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleImport = async () => {
    if (!currentSession || currentSession.status === "importing") return;

    let session: ImportSession = {
      ...currentSession,
      status: "importing",
      progress: 0,
    };
    setCurrentSession(session);
    setSessions((prev) =>
      prev.map((s) => (s.id === session.id ? session : s))
    );

    try {
      // Call API to execute import
      const filesToImport = session.files.filter((f) => f.isConnected);

      console.log("Starting import with files:", filesToImport.length);

      // Build file contents map from selected files only
      const fileContents: Record<string, string> = {};
      let totalContentSize = 0;

      // Get file contents from the scan results if available
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      if (fileInput?.files) {
        // Only read files that are marked for import
        const filesToRead = Array.from(fileInput.files).filter((file) => {
          const relativePath = (file as any).webkitRelativePath || file.name;
          return filesToImport.some((f) => f.path === relativePath);
        });

        console.log(
          `Reading ${filesToRead.length} files for import (out of ${fileInput.files.length} total)`
        );

        for (const file of filesToRead) {
          const relativePath = (file as any).webkitRelativePath || file.name;
          try {
            const content = await file.text();
            fileContents[relativePath] = content;
            totalContentSize += file.size;

            // Log progress for large imports
            if (totalContentSize % 1000000 < file.size) {
              console.log(
                `Read ${(totalContentSize / 1024 / 1024).toFixed(2)}MB of files...`
              );
            }
          } catch (err) {
            console.warn(`Failed to read file: ${relativePath}`, err);
          }
        }

        console.log(
          `Total content size: ${(totalContentSize / 1024 / 1024).toFixed(2)}MB`
        );
      }

      const response = await fetch("/api/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: filesToImport,
          sessionId: session.id,
          fileContents,
        }),
      });

      console.log("Import response status:", response.status);
      const responseData = await response.json();
      console.log("Import response data:", responseData);

      if (!response.ok) {
        throw new Error(
          `Import failed: ${response.status} ${response.statusText} - ${
            responseData?.error || "Unknown error"
          }`
        );
      }

      // Simulate progress updates
      for (let i = 0; i <= 100; i += 20) {
        session = { ...session, progress: i };
        setCurrentSession(session);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Create archive of unused files
      const archivedFilesList = session.files.filter((f) => !f.isConnected);
      console.log("Creating archive with files:", archivedFilesList.length);

      // Build file contents map for archive
      const archiveFileContents: Record<string, string> = {};
      let archiveContentSize = 0;

      if (fileInput?.files && archivedFilesList.length > 0) {
        // Only read files that are marked for archiving
        const filesToArchive = Array.from(fileInput.files).filter((file) => {
          const relativePath = (file as any).webkitRelativePath || file.name;
          return archivedFilesList.some((f) => f.path === relativePath);
        });

        console.log(
          `Reading ${filesToArchive.length} files for archive (out of ${fileInput.files.length} total)`
        );

        for (const file of filesToArchive) {
          const relativePath = (file as any).webkitRelativePath || file.name;
          try {
            const content = await file.text();
            archiveFileContents[relativePath] = content;
            archiveContentSize += file.size;

            // Log progress for large archives
            if (archiveContentSize % 1000000 < file.size) {
              console.log(
                `Read ${(archiveContentSize / 1024 / 1024).toFixed(2)}MB of archive files...`
              );
            }
          } catch (err) {
            console.warn(
              `Failed to read file for archive: ${relativePath}`,
              err
            );
          }
        }

        console.log(
          `Archive content size: ${(archiveContentSize / 1024 / 1024).toFixed(2)}MB`
        );
      }

      const archiveResponse = await fetch("/api/import/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: archivedFilesList,
          sessionId: session.id,
          fileContents: archiveFileContents,
        }),
      });

      console.log("Archive response status:", archiveResponse.status);
      const archiveData = await archiveResponse.json();
      console.log("Archive response data:", archiveData);

      if (!archiveResponse.ok) {
        console.warn(
          "Archive creation failed:",
          archiveResponse.status,
          archiveData?.error || archiveResponse.statusText
        );
      }

      // Store archive metadata in localStorage for recovery
      const archiveMetadata = {
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        folderName: session.folderName,
        archivedFiles: archivedFilesList.map((f) => ({
          path: f.path,
          type: f.type,
          size: f.size,
        })),
        totalArchivedSize: archivedFilesList.reduce((sum, f) => sum + f.size, 0),
      };

      localStorage.setItem(
        `archive.${session.id}`,
        JSON.stringify(archiveMetadata)
      );

      // Store current session in sessionStorage for dashboard detection
      let finalSession = { ...session, progress: 100 };
      finalSession = { ...finalSession, status: "completed" as const };
      sessionStorage.setItem(
        "import.session.current",
        JSON.stringify(finalSession)
      );

      setCurrentSession(finalSession);
      setSessions((prev) =>
        prev.map((s) => (s.id === finalSession.id ? finalSession : s))
      );

      toast({
        title: "Import Complete",
        description: `Imported ${filesToImport.length} files. Archived ${archivedFilesList.length} unused files.`,
      });

      // Redirect to dashboard to load the imported project
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);

      // Redirect to board after successful import
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      session = { ...session, status: "error" };
      setCurrentSession(session);
      toast({
        title: "Import Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleEchoCoderToggle = () => {
    const newState = !echoCoderEnabled;
    setEchoCoderEnabled(newState);
    localStorage.setItem("echocoder.enabled", newState.toString());
    toast({
      title: "EchoCoder Updated",
      description: `Backend tool ${newState ? "enabled" : "disabled"}. Access from Studio.`,
    });
  };

  const resetEchoAiBanners = () => {
    [
      "echoai.banner.mobile-ordering",
      "echoai.banner.tablet-waste",
      "echoai.banner.tablet-transfer",
    ].forEach((key) => localStorage.removeItem(key));
    toast({
      title: "EchoAI^3 Banners Reset",
      description: "Usage checklist banners will reappear on devices.",
    });
  };

  const toggleFileInSession = (path: string) => {
    if (!currentSession) return;

    const updated = currentSession.files.map((f) =>
      f.path === path ? { ...f, isConnected: !f.isConnected } : f
    );

    setCurrentSession({
      ...currentSession,
      files: updated,
    });
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your project imports and tool configuration
            </p>
          </div>
        </div>

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">Project Import</TabsTrigger>
            <TabsTrigger value="tools">Tools & Integrations</TabsTrigger>
            <TabsTrigger value="devices">Devices & Sync</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            {/* Current Import Session */}
            {currentSession && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {currentSession.status === "importing" && (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    )}
                    {currentSession.status === "completed" && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {currentSession.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    {currentSession.folderName}
                  </CardTitle>
                  <CardDescription>
                    {currentSession.files.length} files found |{" "}
                    {(currentSession.totalSize / 1024 / 1024).toFixed(2)} MB
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentSession.status !== "importing" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Connected Files: {connectedFiles.length}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Will be imported
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-green-600/10">
                          {connectedFiles.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Archive Candidates: {archivedFiles.length}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Unused files to archive
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-amber-600/10">
                          {archivedFiles.length}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {currentSession.status === "importing" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Importing files...</p>
                        <span className="text-sm text-muted-foreground">
                          {currentSession.progress}%
                        </span>
                      </div>
                      <Progress value={currentSession.progress} />
                    </div>
                  )}

                  {currentSession.status === "analyzed" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleImport}
                        className="flex-1"
                        disabled={connectedFiles.length === 0}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Import Connected Files
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <Archive className="h-4 w-4 mr-2" />
                            Review Archive
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Files to Archive</DialogTitle>
                            <DialogDescription>
                              These files were not detected as connected. You can
                              review and adjust the selection.
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-96">
                            <div className="space-y-2 pr-4">
                              {archivedFiles.map((file) => (
                                <div
                                  key={file.path}
                                  className="flex items-start gap-3 p-2 rounded border border-border hover:bg-accent/30 cursor-pointer"
                                  onClick={() => toggleFileInSession(file.path)}
                                >
                                  <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {file.path}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {(file.size / 1024).toFixed(2)} KB
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}

                  {currentSession.status === "completed" && (
                    <div className="flex items-center gap-2 p-3 rounded bg-green-600/10 border border-green-600/30">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          Import successfully completed
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Redirecting to dashboard...
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Protection Notice */}
            <Card className="border-amber-600/30 bg-amber-600/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Protected Files
                </CardTitle>
                <CardDescription>
                  EchoCoder system files are automatically protected from overwrite during import
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  The following are protected and will not be imported:
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                  <li>EchoCoder components and tools</li>
                  <li>Studio workspace and automation</li>
                  <li>Settings and configuration pages</li>
                  <li>Core application structure</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  This ensures EchoCoder remains functional while integrating your project.
                </p>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Import Project Folder</CardTitle>
                <CardDescription>
                  Select your project folder from your desktop to begin. Protected EchoCoder files will be automatically excluded.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent/30 transition"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-medium">Click to select folder</h3>
                  <p className="text-sm text-muted-foreground">
                    or drag and drop your project folder here
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFolderSelect}
                    className="hidden"
                    disabled={isScanning}
                    {...({ webkitdirectory: "" } as any)}
                  />
                </div>

                {isScanning && (
                  <div className="flex items-center gap-2 mt-4 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning files...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Previous Sessions */}
            {sessions.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Import History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sessions.slice(1).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 rounded border border-border"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {session.folderName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">{session.files.length}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            {/* EchoCoder Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  EchoCoder Backend Tool
                </CardTitle>
                <CardDescription>
                  Backend developer tool for code generation and scaffolding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded border border-border bg-accent/30">
                  <div>
                    <p className="font-medium">Enable EchoCoder</p>
                    <p className="text-sm text-muted-foreground">
                      Access EchoCoder tools from the Studio workspace for code
                      generation, automation, and project scaffolding
                    </p>
                  </div>
                  <Button
                    variant={echoCoderEnabled ? "default" : "outline"}
                    onClick={handleEchoCoderToggle}
                    className="ml-4 flex-shrink-0"
                  >
                    {echoCoderEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>

                {echoCoderEnabled && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium text-sm">Available Features</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        Automated code scaffolding
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        File and folder generation
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        Project analysis and optimization
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        Automation task execution
                      </li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Other Tools */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Tools</CardTitle>
                <CardDescription>
                  Configure and manage other development tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded border border-border">
                    <div>
                      <p className="font-medium text-sm">Automation Engine</p>
                      <p className="text-xs text-muted-foreground">
                        Task queuing and execution
                      </p>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded border border-border">
                    <div>
                      <p className="font-medium text-sm">File Importer</p>
                      <p className="text-xs text-muted-foreground">
                        Project folder scanning and analysis
                      </p>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <QuickSyncPanel />
            <OutletProfilesPanel />
            <Card className="border border-slate-200/70 bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  EchoAI^3 Usage Checklist
                </CardTitle>
                <CardDescription>
                  Standard operational checks that should be reviewed on handheld devices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  {echoAiChecklist.map((item) => (
                    <div
                      key={item}
                      className="rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={resetEchoAiBanners}
                >
                  Reset handheld banners
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
