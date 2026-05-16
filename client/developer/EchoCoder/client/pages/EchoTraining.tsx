import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Brain,
  BarChart3,
  Settings,
  BookOpen,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

interface UploadProgress {
  id: string;
  name: string;
  size: number;
  category: string;
  uploadedAt: string;
  status: "uploading" | "processing" | "complete" | "error";
  progress?: number;
  error?: string;
}

interface KnowledgeStats {
  totalKnowledge: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  averageConfidence: number;
}

export default function EchoTraining() {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("general");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const categories = [
    "culinary",
    "hospitality",
    "financial",
    "operations",
    "marketing",
    "hr",
    "training",
    "technology",
    "general",
  ];

  // Load knowledge statistics on mount
  useEffect(() => {
    loadKnowledgeStats();
    const interval = setInterval(loadKnowledgeStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadKnowledgeStats = async () => {
    try {
      const response = await fetch("/api/echo-ai/knowledge-stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn(
          "Failed to load knowledge stats:",
          response.status,
          "Using default stats",
        );
        // Provide default stats if endpoint fails
        setStats({
          totalKnowledge: 0,
          byCategory: {},
          byType: {},
          averageConfidence: 0,
        });
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("Invalid content type:", contentType, "Using default stats");
        return;
      }

      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      } else if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.warn("Failed to load knowledge stats, using defaults:", error);
      // Provide sensible defaults when fetch fails
      setStats({
        totalKnowledge: 0,
        byCategory: {},
        byType: {},
        averageConfidence: 0,
      });
    }
  };

  const processFiles = async (filesToProcess: FileList | File[]) => {
    const filesArray = Array.from(filesToProcess);
    const validFiles: Array<{ file: File; id: string }> = [];

    // Validate all files first
    for (const file of filesArray) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file",
          description: `${file.name}: Only PDF files are supported`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > 150 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name}: PDF files must be under 150MB`,
          variant: "destructive",
        });
        continue;
      }

      const fileId = Math.random().toString();
      validFiles.push({ file, id: fileId });

      const newFile: UploadProgress = {
        id: fileId,
        name: file.name,
        size: file.size,
        category: selectedCategory,
        uploadedAt: new Date().toLocaleDateString(),
        status: "uploading",
        progress: 0,
      };

      setUploads((prev) => [...prev, newFile]);
    }

    // Process files sequentially (1 at a time) to prevent OOM crashes
    // Sequential processing is more stable than concurrent for large PDFs
    for (const { file, id } of validFiles) {
      await uploadPDF(file, id, selectedCategory);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;
    await processFiles(selectedFiles);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const uploadPDF = async (file: File, fileId: string, category: string) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      // Simulate progress updates while uploading/processing
      const progressInterval = setInterval(() => {
        setUploads((prev) =>
          prev.map((f) =>
            f.id === fileId && f.progress !== undefined && f.progress < 90
              ? {
                  ...f,
                  progress: Math.min(f.progress + Math.random() * 15, 90),
                }
              : f,
          ),
        );
      }, 800);

      const response = await fetch("/api/echo-ai/upload-pdf", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      let data: any = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (parseError) {
          console.warn("Failed to parse response JSON:", parseError);
          data = {};
        }
      }

      if (!response.ok) {
        const errorMsg = data?.error || `Upload failed (${response.status})`;
        throw new Error(errorMsg);
      }

      setUploads((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "complete",
                progress: 100,
              }
            : f,
        ),
      );

      toast({
        title: "Success",
        description: `${file.name} processed and knowledge extracted to "${category}" category`,
      });

      loadKnowledgeStats();
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to upload PDF";
      console.error("Upload error:", error);
      setUploads((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "error", error: errorMessage } : f,
        ),
      );

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const clearUploadHistory = () => {
    setUploads([]);
  };

  const enablePersistentLearning = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/echo-ai/enable-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });

      if (response.ok) {
        setLearningEnabled(true);
        toast({
          title: "Success",
          description:
            "Persistent learning enabled - Echo will now learn from interactions",
        });
      }
    } catch (error) {
      console.error("Failed to enable learning:", error);
      toast({
        title: "Error",
        description: "Failed to enable persistent learning",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Echo Training Center
            </h1>
          </div>
          <p className="text-muted-foreground">
            Upload PDFs to extract pure knowledge. Original files are completely
            removed after processing. Knowledge is stored anonymously and
            organized by category for Echo AI's learning.
          </p>
        </div>

        {/* Learning Status */}
        <Card className="mb-6 border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Learning Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Persistent Learning
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant={learningEnabled ? "default" : "secondary"}>
                    {learningEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {!learningEnabled && (
                    <Button
                      size="sm"
                      onClick={enablePersistentLearning}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Enable Now
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Knowledge Base</p>
                <Badge variant="outline">
                  {stats?.totalKnowledge || 0} Knowledge Items
                </Badge>
              </div>
            </div>

            {learningEnabled && (
              <div className="text-sm text-green-600 bg-green-500/10 p-3 rounded-md flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Echo is learning from PDFs, conversations, and interactions.
                  Each PDF extracts pure knowledge stored anonymously. Forecasts
                  are updated daily based on decision evaluation.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Extract Knowledge
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          {/* Extract Knowledge Tab */}
          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Extract Knowledge from PDFs</CardTitle>
                <CardDescription>
                  Pure knowledge is extracted and stored anonymously. Original
                  files are completely removed after processing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Knowledge Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Knowledge will be organized under this category for easier
                    retrieval
                  </p>
                </div>

                {/* Drop Zone */}
                <div
                  className="border-2 border-dashed border-cyan-500/30 rounded-lg p-8 text-center cursor-pointer hover:border-cyan-500/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                  <p className="text-lg font-medium mb-1">Drop PDFs here</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to select files
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports PDF files up to 150MB • Knowledge stored in "
                    {selectedCategory}" category
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Upload Queue */}
                {uploads.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">
                        Processing ({uploads.length})
                      </h3>
                      {!uploads.some(
                        (f) =>
                          f.status === "uploading" || f.status === "processing",
                      ) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={clearUploadHistory}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    {uploads.map((file) => (
                      <div key={file.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex-1">
                            <span>{file.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {file.category}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {file.status === "complete" ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : file.status === "error" ? (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              `${file.progress}%`
                            )}
                          </span>
                        </div>
                        {(file.status === "uploading" ||
                          file.status === "processing") && (
                          <Progress value={file.progress || 0} />
                        )}
                        {file.error && (
                          <p className="text-xs text-destructive mt-1">
                            {file.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guidelines Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium mb-1">✓ What to Upload</p>
                  <ul className="text-muted-foreground space-y-1 ml-4">
                    <li>• Documentation and guides</li>
                    <li>• Process documentation</li>
                    <li>• Reference materials</li>
                    <li>• Policy documents</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">✓ Tips for Better Learning</p>
                  <ul className="text-muted-foreground space-y-1 ml-4">
                    <li>• Use clear, structured documents</li>
                    <li>• Include headers and sections</li>
                    <li>• Add relevant metadata (titles, dates)</li>
                    <li>• Keep PDFs under 150MB</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Knowledge Base Tab */}
          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Base Overview</CardTitle>
                <CardDescription>
                  All knowledge is stored anonymously without original source
                  documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats && stats.totalKnowledge > 0 ? (
                  <div className="space-y-6">
                    {/* By Category */}
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Knowledge by Category
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(stats.byCategory).map(
                          ([category, count]) => (
                            <div
                              key={category}
                              className="p-4 border rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                            >
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                {category}
                              </p>
                              <p className="text-2xl font-bold text-cyan-400 mt-1">
                                {count}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {/* By Type */}
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Knowledge by Type
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(stats.byType).map(([type, count]) => (
                          <div
                            key={type}
                            className="p-4 border rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                          >
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">
                              {type}
                            </p>
                            <p className="text-2xl font-bold text-blue-400 mt-1">
                              {count}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      No knowledge extracted yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Upload PDFs to extract and store pure knowledge
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning System Statistics</CardTitle>
                <CardDescription>
                  Overview of Echo AI's knowledge base and learning system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg bg-accent/20">
                      <div className="text-3xl font-bold text-cyan-400">
                        {stats.totalKnowledge}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 uppercase">
                        Total Knowledge
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-accent/20">
                      <div className="text-3xl font-bold text-blue-400">
                        {Object.keys(stats.byCategory).length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 uppercase">
                        Categories
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-accent/20">
                      <div className="text-3xl font-bold text-purple-400">
                        {Object.keys(stats.byType).length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 uppercase">
                        Knowledge Types
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-accent/20">
                      <div className="text-3xl font-bold text-green-400">
                        {Math.round(stats.averageConfidence * 100)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 uppercase">
                        Avg Confidence
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Loading statistics...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Learning Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">
                      Pure Knowledge Storage
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Knowledge extracted from PDFs without storing source
                      documents
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">
                      Anonymous & Categorized
                    </p>
                    <p className="text-xs text-muted-foreground">
                      All knowledge is anonymous and organized by category for
                      easy retrieval
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">
                      Intelligent Forecasting
                    </p>
                    <p className="text-xs text-muted-foreground">
                      10-day forecasts, 2-day decision window, daily prediction
                      readjustment
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Environment Learning</p>
                    <p className="text-xs text-muted-foreground">
                      Learning from interactions, daily activities, and decision
                      outcomes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
