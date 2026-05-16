import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Zap,
  Settings,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  RefreshCw,
  Database,
  BookOpen,
  Shield,
  BarChart3,
} from "lucide-react";

interface AdminDashboardState {
  systemHealth: {
    activeUsers: number;
    systemLoad: number;
    memoryUsage: number;
    safeToDeploy: boolean;
  };
  knowledgeBase: {
    modulesIndexed: number;
    embeddingsCount: number;
    lastIndexed: string;
  };
  pdfLibrary: Array<{
    id: string;
    name: string;
    pages: number;
    size: string;
    uploadedAt: string;
  }>;
  deployments: Array<{
    id: string;
    status: "pending" | "deploying" | "complete" | "failed";
    requestedAt: string;
    completedAt?: string;
  }>;
}

/**
 * EchoAI Admin Dashboard
 * Manage knowledge base, PDFs, system health, and deployments
 */
export function EchoAdminDashboard() {
  const [state, setState] = useState<AdminDashboardState>({
    systemHealth: {
      activeUsers: 0,
      systemLoad: 0,
      memoryUsage: 0,
      safeToDeploy: true,
    },
    knowledgeBase: {
      modulesIndexed: 0,
      embeddingsCount: 0,
      lastIndexed: "",
    },
    pdfLibrary: [],
    deployments: [],
  });

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch system health
      const healthRes = await fetch("/api/echo-ai/system-health");
      const healthData = await healthRes.json();

      // Fetch PDFs
      const pdfRes = await fetch("/api/echo-ai/pdfs");
      const pdfData = await pdfRes.json();

      setState((prev) => ({
        ...prev,
        systemHealth: healthData.health || prev.systemHealth,
        pdfLibrary: pdfData.pdfs || prev.pdfLibrary,
      }));
    } catch (error) {
      console.error("Error loading dashboard:", error);
    }
  };

  const handleIndexModules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/echo-ai/index-modules", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          knowledgeBase: {
            modulesIndexed: data.result.modulesIndexed,
            embeddingsCount: data.result.embeddingsCreated,
            lastIndexed: new Date().toLocaleString(),
          },
        }));
      }
    } catch (error) {
      console.error("Error indexing modules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPdf = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", selectedFile);

      const res = await fetch("/api/echo-ai/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setSelectedFile(null);
        await loadDashboardData();
      }
    } catch (error) {
      console.error("Error uploading PDF:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePdf = async (pdfId: string) => {
    if (!confirm("Delete this PDF from knowledge base?")) return;

    try {
      const res = await fetch(`/api/echo-ai/pdf/${pdfId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadDashboardData();
      }
    } catch (error) {
      console.error("Error deleting PDF:", error);
    }
  };

  const getHealthStatus = () => {
    if (state.systemHealth.safeToDeploy) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <span>System Healthy</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle className="w-5 h-5" />
        <span>System Overloaded</span>
      </div>
    );
  };

  const getLoadColor = (load: number) => {
    if (load < 50) return "text-green-600";
    if (load < 75) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">EchoAI Admin</h1>
        <p className="text-muted-foreground mt-2">
          Manage knowledge base, PDFs, and system health
        </p>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {state.systemHealth.activeUsers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${getLoadColor(state.systemHealth.systemLoad)}`}
            >
              {state.systemHealth.systemLoad}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {state.systemHealth.memoryUsage}MB
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>{getHealthStatus()}</CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="knowledge" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="pdfs">PDF Library</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LUCCCA Module Index</CardTitle>
              <CardDescription>
                Scan and index all LUCCCA modules for knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Modules Indexed
                  </p>
                  <p className="text-2xl font-bold">
                    {state.knowledgeBase.modulesIndexed}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Embeddings Created
                  </p>
                  <p className="text-2xl font-bold">
                    {state.knowledgeBase.embeddingsCount}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Last Indexed: {state.knowledgeBase.lastIndexed || "Never"}
                </p>
                <Button
                  onClick={handleIndexModules}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Indexing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Re-index All Modules
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF Library Tab */}
        <TabsContent value="pdfs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PDF Library</CardTitle>
              <CardDescription>
                Upload and manage PDFs for AI learning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Section */}
              <div className="border-2 border-dashed rounded-lg p-6 space-y-4">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                <Button
                  onClick={handleUploadPdf}
                  disabled={!selectedFile || loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload PDF
                    </>
                  )}
                </Button>
              </div>

              {/* PDF List */}
              <div className="space-y-2">
                <h3 className="font-semibold">
                  Library ({state.pdfLibrary.length})
                </h3>
                {state.pdfLibrary.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{pdf.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {pdf.pages} pages • {pdf.size}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePdf(pdf.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deployments Tab */}
        <TabsContent value="deployments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hot Deployments</CardTitle>
              <CardDescription>
                Manage staged hot-loading of code changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {state.deployments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No deployments queued
                </p>
              ) : (
                <div className="space-y-2">
                  {state.deployments.map((deploy) => (
                    <div
                      key={deploy.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{deploy.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(deploy.requestedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          deploy.status === "complete"
                            ? "default"
                            : deploy.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {deploy.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure EchoAI system parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Max Concurrent Users
                </label>
                <input
                  type="number"
                  defaultValue={10}
                  className="w-full border rounded px-3 py-2 mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Safe Load Threshold (%)
                </label>
                <input
                  type="number"
                  defaultValue={85}
                  className="w-full border rounded px-3 py-2 mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Auto-Index Interval (minutes)
                </label>
                <input
                  type="number"
                  defaultValue={60}
                  className="w-full border rounded px-3 py-2 mt-2"
                />
              </div>

              <Button className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EchoAdminDashboard;
