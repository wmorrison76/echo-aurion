import React from "react";
import { toast } from "sonner";
import {
  useTrainingOrchestration,
  type TrainingMode,
} from "@/hooks/use-training-orchestration";
import { hibernationPrevention } from "@/lib/hibernation-prevention";
import { KnowledgeProgressDashboard } from "@/components/KnowledgeProgressDashboard";
import { TermJsonUploader } from "@/components/panels/TermJsonUploader";
import { TermsVectorIngestionPanel } from "@/components/panels/TermsVectorIngestionPanel";
import { PDFBatchUploader } from "@/components/panels/PDFBatchUploader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Database,
  FileText,
  Globe,
  Zap,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Loader,
} from "lucide-react";

interface TrainingSourceConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const TRAINING_SOURCES: Record<string, TrainingSourceConfig> = {
  "master-dictionary": {
    id: "master-dictionary",
    name: "Master Dictionary",
    description: "Core culinary terms and definitions (400+ terms)",
    icon: <BookOpen className="w-5 h-5" />,
    color: "from-blue-400 to-blue-600",
  },
  "pinecone-migration": {
    id: "pinecone-migration",
    name: "Pinecone Migration",
    description: "Migrate existing vectors from Pinecone to internal storage",
    icon: <Database className="w-5 h-5" />,
    color: "from-purple-400 to-purple-600",
  },
  "pdf-library": {
    id: "pdf-library",
    name: "PDF Library",
    description: "Import culinary books and reference materials",
    icon: <FileText className="w-5 h-5" />,
    color: "from-orange-400 to-orange-600",
  },
  "web-crawler": {
    id: "web-crawler",
    name: "Web Crawler",
    description: "Crawl recipes from 30+ global recipe platforms",
    icon: <Globe className="w-5 h-5" />,
    color: "from-green-400 to-green-600",
  },
  "recipe-imports": {
    id: "recipe-imports",
    name: "Recipe Imports",
    description: "Import recipes from your personal collection",
    icon: <Zap className="w-5 h-5" />,
    color: "from-yellow-400 to-yellow-600",
  },
};

export function EchoTrainingCenter() {
  const {
    session,
    isRunning,
    error,
    summary,
    initializeSession,
    startTraining,
  } = useTrainingOrchestration();

  const [mode, setMode] = React.useState<TrainingMode>("sequential");
  const [selectedSources, setSelectedSources] = React.useState<string[]>([
    "master-dictionary",
    "pinecone-migration",
  ]);
  const [showStartOptions, setShowStartOptions] = React.useState(!session);
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const [knowledgeStats, setKnowledgeStats] = React.useState<any>(null);
  const [isCrawlerRunning, setIsCrawlerRunning] = React.useState(false);
  const [crawlerProgress, setCrawlerProgress] = React.useState<any>(null);

  // Fetch knowledge statistics on mount
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/knowledge/stats");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          setKnowledgeStats(data.stats);
        }
      } catch (error) {
        console.error("[EchoTrainingCenter] Error fetching stats:", error);
        // Set default stats if fetch fails
        setKnowledgeStats({
          approvedItems: 0,
          masterDictionaryTerms: 0,
          totalVectors: 0,
        });
      }
    };

    fetchStats();
  }, []);

  // Track elapsed time and prevent hibernation during training
  React.useEffect(() => {
    if (!session) {
      hibernationPrevention.stop();
      return;
    }

    if (session.status === "running") {
      hibernationPrevention.start();
    } else {
      hibernationPrevention.stop();
    }

    const interval = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - session.startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(interval);
      hibernationPrevention.stop();
    };
  }, [session]);

  const handleStartTraining = React.useCallback(async () => {
    await initializeSession(mode);
    setShowStartOptions(false);

    setTimeout(async () => {
      await startTraining(mode, selectedSources as any);
    }, 500);
  }, [mode, selectedSources, initializeSession, startTraining]);

  const handleStartCrawler = React.useCallback(async () => {
    setIsCrawlerRunning(true);
    try {
      const response = await fetch("/api/echo/crawler/start-crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: ["recipes", "hospitality"],
          limit: 5000,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      toast.success(`Crawler started: ${data.sessionId}`);

      // Connect to crawler progress stream (SSE)
      const eventSource = new EventSource("/api/echo/crawler/progress");
      eventSource.onmessage = (event) => {
        try {
          const progress = JSON.parse(event.data);
          setCrawlerProgress(progress);
        } catch (error) {
          console.error("[EchoTrainingCenter] Error parsing progress:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("[EchoTrainingCenter] Progress stream error:", error);
        eventSource.close();
        setIsCrawlerRunning(false);
        toast.error("Crawler progress stream disconnected");
      };

      // Stop listening when crawler finishes
      const checkInterval = setInterval(async () => {
        try {
          const statsResponse = await fetch("/api/echo/crawler/stats");
          if (statsResponse.ok) {
            const stats = await statsResponse.json();
            if (stats.activeSessions && stats.activeSessions.length === 0) {
              clearInterval(checkInterval);
              eventSource.close();
              setIsCrawlerRunning(false);
              toast.success(
                `Crawler completed: ${stats.totalRecipes || 0} recipes found`,
              );
            }
          }
        } catch (error) {
          console.error(
            "[EchoTrainingCenter] Error checking crawler stats:",
            error,
          );
        }
      }, 2000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start crawler";
      toast.error(message);
      setIsCrawlerRunning(false);
    }
  }, []);

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((s) => s !== sourceId)
        : [...prev, sourceId],
    );
  };

  const selectAll = () => {
    setSelectedSources(Object.keys(TRAINING_SOURCES));
  };

  const deselectAll = () => {
    setSelectedSources([]);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "running":
        return <Zap className="w-5 h-5 text-blue-500 animate-pulse" />;
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // Show error if there's a fetch error
  if (error && !session && showStartOptions) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-[#c8a97e] bg-clip-text text-transparent">
            Echo AI Training Center
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Consolidate and train Echo with knowledge from multiple sources
          </p>
        </div>

        <div className="rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">
                Connection Error
              </h3>
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                The training service is currently unavailable. Please try again
                later or check your connection.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show startup screen if no session
  if (!session && showStartOptions) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-[#c8a97e] bg-clip-text text-transparent">
            Echo AI Training Center
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Consolidate and train Echo with knowledge from multiple sources
          </p>
        </div>

        {/* Knowledge Base Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-amber-50 dark:from-blue-950 dark:to-neutral-950">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Approved Items
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {knowledgeStats?.approvedItems?.toLocaleString() || "0"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Available for training
              </p>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Master Dictionary
              </p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {knowledgeStats?.masterDictionaryTerms?.toLocaleString() || "0"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Culinary terms
              </p>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Vectors
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {knowledgeStats?.totalVectors?.toLocaleString() || "0"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                In knowledge base
              </p>
            </div>
          </Card>
        </div>

        {/* JSON Term Uploader */}
        <TermJsonUploader />

        {/* Terms Vector Ingestion - Push to Supabase + Pinecone */}
        <TermsVectorIngestionPanel />

        {/* Web Crawler Section */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-lg">Web Crawler</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Crawl recipes from 30+ global recipe platforms
                </p>
              </div>
            </div>
          </div>

          {crawlerProgress && (
            <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Crawler Progress</span>
                <span className="text-sm font-bold text-blue-600">
                  {crawlerProgress.progress || 0}%
                </span>
              </div>
              <Progress value={crawlerProgress.progress || 0} className="h-2" />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {crawlerProgress.message || "Processing..."}
              </p>
              {crawlerProgress.itemsProcessed && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {crawlerProgress.itemsProcessed} items processed
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleStartCrawler}
            disabled={isCrawlerRunning}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isCrawlerRunning ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Crawler Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Web Crawler
              </>
            )}
          </Button>
        </Card>

        {/* PDF Upload Section */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="font-semibold text-lg">PDF Library Upload</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Import culinary books and reference materials
              </p>
            </div>
          </div>

          <PDFBatchUploader />
        </Card>

        {/* Mode Selection */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Training Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setMode("sequential")}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                mode === "sequential"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
              }`}
            >
              <div className="font-semibold text-gray-900 dark:text-white">
                Sequential
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                One source at a time. Slower but uses less resources.
              </div>
            </button>

            <button
              onClick={() => setMode("parallel")}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                mode === "parallel"
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950"
                  : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
              }`}
            >
              <div className="font-semibold text-gray-900 dark:text-white">
                Parallel
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                All sources at once. Faster but more resource intensive.
              </div>
            </button>
          </div>
        </Card>

        {/* Source Selection */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Select Training Sources</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Clear
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(TRAINING_SOURCES).map(([id, source]) => (
              <button
                key={id}
                onClick={() => toggleSource(id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedSources.includes(id)
                    ? `border-blue-500 bg-blue-50 dark:bg-blue-950`
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg bg-gradient-to-br ${source.color} text-white`}
                  >
                    {source.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {source.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {source.description}
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded border-2 ${
                      selectedSources.includes(id)
                        ? "bg-blue-500 border-blue-500"
                        : "border-gray-300"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="p-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-900 dark:text-red-100">
                  Error
                </div>
                <div className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Start Button */}
        <div className="flex gap-4">
          <Button
            onClick={handleStartTraining}
            disabled={selectedSources.length === 0}
            className="flex-1 h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-[#c8a97e] hover:from-blue-700 hover:to-[#b8976c]"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Training
          </Button>
        </div>
      </div>
    );
  }

  // Show training progress
  if (session) {
    return (
      <div className="space-y-6">
        {/* Header with Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Training in Progress</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Mode:{" "}
                {session.mode === "sequential" ? "Sequential" : "Parallel"} •
                Time: {formatTime(elapsedTime)}
              </p>
            </div>
            <Badge
              variant={
                session.status === "running"
                  ? "default"
                  : session.status === "completed"
                    ? "secondary"
                    : "destructive"
              }
              className="text-base py-1.5 px-3"
            >
              {session.status === "running"
                ? "🟢 Running"
                : session.status === "completed"
                  ? "✅ Complete"
                  : "❌ Error"}
            </Badge>
          </div>
        </div>

        {/* Overall Progress */}
        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Overall Progress</span>
            <span className="text-2xl font-bold text-blue-600">
              {session.overallProgress}%
            </span>
          </div>
          <Progress value={session.overallProgress} className="h-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {session.message}
          </p>
        </Card>

        {/* Training Sources Status */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Training Sources</h2>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(session.sources).map(([id, source]) => {
              const config = TRAINING_SOURCES[id];
              return (
                <Card
                  key={id}
                  className={`p-4 border-l-4 ${
                    source.status === "completed"
                      ? "border-l-green-500 bg-green-50 dark:bg-green-950"
                      : source.status === "running"
                        ? "border-l-blue-500 bg-blue-50 dark:bg-blue-950"
                        : source.status === "failed"
                          ? "border-l-red-500 bg-red-50 dark:bg-red-950"
                          : "border-l-gray-400 bg-gray-50 dark:bg-gray-900"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getStatusIcon(source.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold">{config?.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {source.message}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {source.processedItems}/{source.totalItems}
                        </Badge>
                      </div>
                      {source.totalItems > 0 && (
                        <div className="mt-3">
                          <Progress value={source.progress} className="h-2" />
                        </div>
                      )}
                      {source.error && (
                        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                          {source.error}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Summary when complete */}
        {session.status === "completed" && summary && (
          <Card className="p-6 space-y-3 bg-gradient-to-br from-green-50 to-amber-50 dark:from-green-950 dark:to-neutral-950">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Training Complete!</h2>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Items
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.totalProcessed}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Duration
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(summary.duration)}s
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Completed
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {summary.completedSources}/{summary.totalSources}
                </div>
              </div>
              {summary.totalFailed > 0 && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Failed
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {summary.totalFailed}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Knowledge Base Progress Dashboard */}
        <div className="mt-8 border-t pt-8">
          <KnowledgeProgressDashboard />
        </div>
      </div>
    );
  }

  return null;
}
