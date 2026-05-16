import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Database,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader,
} from "lucide-react";
import { toast } from "sonner";

interface IngestionProgress {
  totalTerms: number;
  processedTerms: number;
  supabaseSuccess: number;
  supabaseErrors: number;
  pineconeSuccess: number;
  pineconeErrors: number;
  overallProgress: number;
  currentPhase: "fetching" | "embedding" | "supabase" | "pinecone" | "complete";
  message: string;
  errors: string[];
  startTime: number;
  estimatedTimeRemaining: number;
  embeddingsGenerated?: number;
  embeddingsFailed?: number;
}

interface IngestionStatus {
  status: "idle" | "in_progress";
  progress?: IngestionProgress;
  error?: string;
}

export function TermsVectorIngestionPanel() {
  const [status, setStatus] = useState<IngestionStatus>({ status: "idle" });
  const [termsCount, setTermsCount] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Fetch terms count on mount
  useEffect(() => {
    const fetchTermsCount = async () => {
      try {
        const response = await fetch("/api/terms/count");

        if (!response.ok) {
          console.warn(
            "[TermsIngestion] Terms count unavailable (status: " +
              response.status +
              ")",
          );
          setTermsCount(0);
          return;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          setTermsCount(0);
          return;
        }

        const data = await response.json();
        if (data.success) {
          setTermsCount(data.totalTerms);
        } else {
          setTermsCount(0);
        }
      } catch (error) {
        // API unavailable - set default value and continue
        setTermsCount(0);
      }
    };

    fetchTermsCount();
  }, []);

  // Poll for progress
  useEffect(() => {
    if (!isPolling) return;

    const poll = async () => {
      try {
        const response = await fetch("/api/terms/ingestion/progress");

        if (!response.ok) {
          console.error(
            "[TermsIngestion] Progress polling failed:",
            response.status,
            response.statusText,
          );
          setIsPolling(false);
          return;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error(
            "[TermsIngestion] Progress response is not JSON:",
            contentType,
          );
          setIsPolling(false);
          return;
        }

        const data = await response.json();

        setStatus(data);

        if (data.status === "in_progress") {
          if (data.progress?.currentPhase === "complete") {
            setIsPolling(false);
            if (data.progress?.errors?.length === 0) {
              toast.success(
                `✓ Ingestion complete! ${data.progress?.supabaseSuccess + data.progress?.pineconeSuccess} terms processed`,
              );
            } else {
              toast.warning(
                `Ingestion complete with ${data.progress?.errors?.length || 0} errors`,
              );
            }
          }
        } else {
          setIsPolling(false);
        }
      } catch (error) {
        console.error("[TermsIngestion] Error polling progress:", error);
      }
    };

    const interval = setInterval(poll, 1000);
    setPollingInterval(interval);

    return () => clearInterval(interval);
  }, [isPolling]);

  const handleStartIngestion = async () => {
    try {
      setIsPolling(true);
      toast.loading("Starting ingestion...");

      const response = await fetch("/api/terms/ingest/start", {
        method: "POST",
      });

      if (!response.ok) {
        toast.error(`HTTP ${response.status}: Failed to start ingestion`);
        setIsPolling(false);
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        toast.error("Server returned invalid response format");
        setIsPolling(false);
        return;
      }

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || "Failed to start ingestion");
        setIsPolling(false);
        return;
      }

      toast.success("Ingestion started! Monitoring progress...");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[TermsIngestion] Error starting ingestion:", error);
      toast.error(`Failed to start ingestion: ${errorMsg}`);
      setIsPolling(false);
    }
  };

  const progress = status.progress;
  const isRunning = status.status === "in_progress";

  return (
    <Card className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Terms Vector Ingestion
          </h3>
          {isRunning ? (
            <Badge className="bg-amber-500 text-white">
              <Loader className="w-3 h-3 mr-1 animate-spin" />
              Ingesting
            </Badge>
          ) : progress?.currentPhase === "complete" ? (
            <Badge className="bg-green-500 text-white">
              <CheckCircle className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          ) : (
            <Badge variant="outline">Ready</Badge>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Push {termsCount?.toLocaleString() || "all"} uploaded terms to
          Supabase pgvector and Pinecone
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Total Terms
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {termsCount?.toLocaleString() || "—"}
          </div>
        </div>

        {progress && (
          <>
            {progress.currentPhase === "embedding" && (
              <>
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
                  <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                    Embeddings Generated
                  </div>
                  <div className="text-lg font-bold text-amber-900 dark:text-amber-100">
                    {progress.embeddingsGenerated?.toLocaleString() || "0"} ✓
                  </div>
                </div>

                {progress.embeddingsFailed !== undefined &&
                  progress.embeddingsFailed > 0 && (
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
                      <div className="text-xs text-red-700 dark:text-red-300 font-medium">
                        Embedding Errors
                      </div>
                      <div className="text-lg font-bold text-red-900 dark:text-red-100">
                        {progress.embeddingsFailed.toLocaleString()}
                      </div>
                    </div>
                  )}
              </>
            )}

            {progress.currentPhase === "supabase" && (
              <>
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Processed
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {progress.processedTerms.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
                  <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    Supabase Ingesting
                  </div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {progress.supabaseSuccess.toLocaleString()}
                  </div>
                </div>
              </>
            )}

            {progress.currentPhase === "pinecone" && (
              <>
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
                  <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    Supabase
                  </div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {progress.supabaseSuccess.toLocaleString()} ✓
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30">
                  <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                    Pinecone Ingesting
                  </div>
                  <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                    {progress.pineconeSuccess.toLocaleString()}
                  </div>
                </div>
              </>
            )}

            {progress.currentPhase === "complete" && (
              <>
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
                  <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    Supabase
                  </div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {progress.supabaseSuccess.toLocaleString()} ✓
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30">
                  <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                    Pinecone
                  </div>
                  <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                    {progress.pineconeSuccess.toLocaleString()} ✓
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {progress.message}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {progress.overallProgress}%
            </div>
          </div>
          <Progress value={progress.overallProgress} className="h-2" />
        </div>
      )}

      {/* Phase Indicator */}
      {progress && (
        <div className="flex gap-1 text-xs">
          {(
            [
              "fetching",
              "embedding",
              "supabase",
              "pinecone",
              "complete",
            ] as const
          ).map((phase) => (
            <div
              key={phase}
              className={`flex-1 py-1 px-2 rounded text-center font-medium capitalize transition-all ${
                phase === progress.currentPhase
                  ? "bg-amber-500 text-white shadow-lg"
                  : ["fetching", "embedding", "supabase", "pinecone"].indexOf(
                        phase,
                      ) <
                      [
                        "fetching",
                        "embedding",
                        "supabase",
                        "pinecone",
                        "complete",
                      ].indexOf(progress.currentPhase)
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              {phase === "fetching" && "1️⃣"}
              {phase === "embedding" && "2️⃣"}
              {phase === "supabase" && "3️⃣"}
              {phase === "pinecone" && "4️⃣"}
              {phase === "complete" && "✓"}
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {progress?.errors && progress.errors.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                {progress.errors.length} error
                {progress.errors.length !== 1 ? "s" : ""}
              </div>
              <div className="text-xs text-red-800 dark:text-red-200 space-y-1">
                {progress.errors.slice(0, 3).map((error, idx) => (
                  <div key={idx} className="truncate">
                    • {error}
                  </div>
                ))}
                {progress.errors.length > 3 && (
                  <div className="text-red-700 dark:text-red-300">
                    + {progress.errors.length - 3} more
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isRunning && (
        <div className="flex gap-2">
          <Button
            onClick={handleStartIngestion}
            disabled={!termsCount || termsCount === 0}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium"
          >
            <Zap className="w-4 h-4 mr-2" />
            Start Ingestion Now
          </Button>

          <Button
            variant="outline"
            disabled={!termsCount || termsCount === 0}
            className="flex-1"
            onClick={() => {
              toast.info(
                "Terms are ready for ingestion. Click 'Start Ingestion Now' to begin pushing to Supabase + Pinecone.",
              );
            }}
          >
            <Database className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>
      )}

      {isRunning && (
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
            <div className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-100">
              <Clock className="w-4 h-4" />
              Ingestion in progress. Do not close this window.
            </div>
            {progress?.currentPhase === "embedding" && (
              <div className="text-xs text-amber-800 dark:text-amber-200 mt-2">
                💡 Generating embeddings is the longest phase. This involves
                calling OpenAI API for each term to create semantic vectors.
              </div>
            )}
          </div>

          {progress && (
            <div className="text-xs text-slate-600 dark:text-slate-400 flex justify-between">
              <span>
                Elapsed: {Math.round((Date.now() - progress.startTime) / 1000)}s
              </span>
              {progress.overallProgress > 0 &&
                progress.overallProgress < 100 && (
                  <span>
                    ~
                    {Math.round(
                      (Date.now() - progress.startTime) /
                        (progress.overallProgress / 100) /
                        1000 -
                        (Date.now() - progress.startTime) / 1000,
                    )}
                    s remaining
                  </span>
                )}
            </div>
          )}
        </div>
      )}

      {/* Summary when complete */}
      {progress?.currentPhase === "complete" && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-900 dark:text-green-100">
            <CheckCircle className="w-4 h-4" />
            Ingestion Complete
          </div>
          <div className="text-sm text-green-800 dark:text-green-200">
            <div>
              ✓ Supabase pgvector: {progress.supabaseSuccess.toLocaleString()}{" "}
              terms
            </div>
            <div>
              ✓ Pinecone: {progress.pineconeSuccess.toLocaleString()} terms
            </div>
            {progress.errors.length > 0 && (
              <div className="text-yellow-700 dark:text-yellow-300 mt-1">
                ⚠ {progress.errors.length} error(s) during ingestion
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
        <p className="font-medium mb-1">How it works:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
          <li>Generates embeddings for each term</li>
          <li>Stores in Supabase pgvector for semantic search</li>
          <li>Stores in Pinecone for high-performance queries</li>
          <li>Enables Echo to understand and use all uploaded terms</li>
        </ul>
      </div>
    </Card>
  );
}
