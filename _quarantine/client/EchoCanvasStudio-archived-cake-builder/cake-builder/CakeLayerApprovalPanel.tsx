import React, { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Loader,
  Trash2,
} from "lucide-react";
import {
  CakeLayerQueueManager,
  type LayerGenerationJob,
  type QueueProgress,
} from "@/lib/cake-layer-queue";
import { CakeGenerationService } from "@/lib/cake-generation-service";

interface CakeLayerApprovalPanelProps {
  queue: CakeLayerQueueManager;
  generationService: CakeGenerationService;
  onApprovalComplete?: (allApproved: boolean) => void;
}

export default function CakeLayerApprovalPanel({
  queue,
  generationService,
  onApprovalComplete,
}: CakeLayerApprovalPanelProps) {
  const [progress, setProgress] = useState<QueueProgress>(queue.getProgress());
  const [expandedTier, setExpandedTier] = useState<number>(0);
  const [showOnlyPending, setShowOnlyPending] = useState(true);

  // Subscribe to queue progress updates
  useEffect(() => {
    queue.onProgress((newProgress) => {
      setProgress(newProgress);
    });
  }, [queue]);

  // Auto-scroll to next unapproved tier
  useEffect(() => {
    if (showOnlyPending && progress.pending > 0) {
      // Find first tier with pending jobs
      for (let i = 0; i < queue.exportState().totalTiers; i++) {
        const tierJobs = queue.getTierJobs(i);
        if (tierJobs.some((j) => j.status !== "approved")) {
          setExpandedTier(i);
          break;
        }
      }
    }
  }, [progress.pending, queue, showOnlyPending]);

  // Check if all approved and notify
  useEffect(() => {
    if (progress.allApproved && progress.total > 0) {
      onApprovalComplete?.(true);
    }
  }, [progress.allApproved, progress.total, onApprovalComplete]);

  const handleApproveJob = useCallback(
    (jobId: string) => {
      queue.approveJob(jobId);
    },
    [queue],
  );

  const handleRegenerateJob = useCallback(
    (jobId: string) => {
      generationService.regenerateJob(jobId);
    },
    [generationService],
  );

  const getTierJobs = (tierIndex: number) => {
    const jobs = queue.getTierJobs(tierIndex);
    if (showOnlyPending) {
      return jobs.filter((j) => j.status !== "approved");
    }
    return jobs;
  };

  const queueState = queue.exportState();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "20px",
        backgroundColor: "#0a0a0a",
        borderRadius: "8px",
        border: "1px solid #333",
        maxHeight: "80vh",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div>
        <h2
          style={{
            color: "#00f0ff",
            fontSize: "18px",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
        >
          🎂 Cake Layer Generation
        </h2>
        <p
          style={{
            color: "#888",
            fontSize: "12px",
            margin: 0,
          }}
        >
          {progress.allApproved
            ? "✓ All layers approved and ready for composition!"
            : `${progress.completed}/${progress.total} images generated • ${progress.approved} approved`}
        </p>
      </div>

      {/* Progress Bar */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span
            style={{ color: "#00f0ff", fontSize: "11px", fontWeight: "bold" }}
          >
            Generation Progress
          </span>
          <span style={{ color: "#888", fontSize: "11px" }}>
            {progress.percentComplete}%
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: "8px",
            backgroundColor: "#1a1a1a",
            borderRadius: "4px",
            overflow: "hidden",
            border: "1px solid #333",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress.percentComplete}%`,
              backgroundColor: progress.isQueueDone ? "#00f0ff" : "#00a8cc",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Approval Progress */}
      {progress.completed > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{ color: "#00f0ff", fontSize: "11px", fontWeight: "bold" }}
            >
              Approval Progress
            </span>
            <span style={{ color: "#888", fontSize: "11px" }}>
              {progress.percentApproved}%
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "#1a1a1a",
              borderRadius: "4px",
              overflow: "hidden",
              border: "1px solid #333",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress.percentApproved}%`,
                backgroundColor: "#4ade80",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Filter Toggle */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          paddingTop: "8px",
          borderTop: "1px solid #333",
        }}
      >
        <button
          onClick={() => setShowOnlyPending(!showOnlyPending)}
          style={{
            padding: "6px 12px",
            backgroundColor: showOnlyPending ? "#00f0ff" : "#1a1a1a",
            color: showOnlyPending ? "#000" : "#00f0ff",
            border: "1px solid " + (showOnlyPending ? "#00f0ff" : "#333"),
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            transition: "all 0.2s",
          }}
        >
          {showOnlyPending ? "Show All" : "Show Pending"}
        </button>
        {generationService.isQueueRunning() && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#888",
              fontSize: "11px",
            }}
          >
            <Loader
              size={12}
              style={{ animation: "spin 1s linear infinite" }}
            />
            Generating...
          </div>
        )}
      </div>

      {/* Tiers List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {Array.from({ length: queueState.totalTiers }).map((_, tierIndex) => {
          const tierJobs = getTierJobs(tierIndex);
          if (tierJobs.length === 0 && showOnlyPending) return null;

          const isExpanded = expandedTier === tierIndex;

          return (
            <div
              key={tierIndex}
              style={{
                border: "1px solid #333",
                borderRadius: "6px",
                overflow: "hidden",
                backgroundColor: "#1a1a1a",
              }}
            >
              {/* Tier Header */}
              <button
                onClick={() => setExpandedTier(isExpanded ? -1 : tierIndex)}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#1a1a1a",
                  border: "none",
                  borderBottom: isExpanded ? "1px solid #333" : "none",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#222";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#1a1a1a";
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      color: "#00f0ff",
                      fontWeight: "bold",
                      fontSize: "12px",
                    }}
                  >
                    Tier {tierIndex + 1}
                  </span>
                  <span style={{ color: "#666", fontSize: "11px" }}>
                    ({tierJobs.length} items)
                  </span>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {tierJobs.every((j) => j.status === "approved") && (
                    <CheckCircle size={16} style={{ color: "#4ade80" }} />
                  )}
                  <span
                    style={{
                      fontSize: "18px",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  >
                    ▼
                  </span>
                </div>
              </button>

              {/* Tier Jobs */}
              {isExpanded && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "12px",
                  }}
                >
                  {tierJobs.map((job) => (
                    <LayerJobCard
                      key={job.id}
                      job={job}
                      onApprove={() => handleApproveJob(job.id)}
                      onRegenerate={() => handleRegenerateJob(job.id)}
                      isGenerating={
                        generationService.getActiveJobId() === job.id
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      {progress.allApproved && progress.total > 0 && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "rgba(74, 222, 128, 0.1)",
            border: "1px solid #4ade80",
            borderRadius: "6px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "#4ade80",
              fontSize: "12px",
              fontWeight: "bold",
              margin: 0,
            }}
          >
            ✓ All layers approved! Ready to proceed to composition.
          </p>
        </div>
      )}

      {progress.failed > 0 && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "rgba(244, 63, 94, 0.1)",
            border: "1px solid #f43f5e",
            borderRadius: "6px",
          }}
        >
          <p
            style={{
              color: "#f43f5e",
              fontSize: "12px",
              fontWeight: "bold",
              margin: "0 0 8px 0",
            }}
          >
            ⚠ {progress.failed} generation(s) failed
          </p>
          <p
            style={{
              color: "#888",
              fontSize: "11px",
              margin: 0,
            }}
          >
            Regenerate failed items to try again
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Individual job card component
 */
function LayerJobCard({
  job,
  onApprove,
  onRegenerate,
  isGenerating,
}: {
  job: LayerGenerationJob;
  onApprove: () => void;
  onRegenerate: () => void;
  isGenerating: boolean;
}) {
  const typeLabel: Record<string, string> = {
    tier: "🎂 Cake Tier",
    frosting: "🧁 Frosting",
    filling: "🍴 Filling",
  };

  const statusColor: Record<string, string> = {
    pending: "#888",
    generating: "#00a8cc",
    completed: "#4ade80",
    approved: "#00f0ff",
    failed: "#f43f5e",
  };

  const statusIcon: Record<string, string> = {
    pending: "⏳",
    generating: "⚙",
    completed: "✓",
    approved: "✓✓",
    failed: "✕",
  };

  return (
    <div
      style={{
        padding: "12px",
        backgroundColor: "#0a0a0a",
        border: `1px solid ${statusColor[job.status]}`,
        borderRadius: "4px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "16px",
              animation:
                isGenerating || job.status === "generating"
                  ? "spin 1s linear infinite"
                  : "none",
            }}
          >
            {statusIcon[job.status]}
          </span>
          <span
            style={{
              color: statusColor[job.status],
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            {typeLabel[job.type]}
          </span>
        </div>
        <span
          style={{
            color: statusColor[job.status],
            fontSize: "10px",
            textTransform: "uppercase",
            fontWeight: "bold",
          }}
        >
          {job.status}
        </span>
      </div>

      {/* Prompt (truncated) */}
      <div
        style={{
          padding: "8px",
          backgroundColor: "#1a1a1a",
          borderRadius: "3px",
          maxHeight: "60px",
          overflowY: "auto",
        }}
      >
        <p
          style={{
            color: "#888",
            fontSize: "10px",
            margin: 0,
            lineHeight: "1.4",
          }}
        >
          {job.prompt.substring(0, 200)}
          {job.prompt.length > 200 ? "..." : ""}
        </p>
      </div>

      {/* Image Preview (if completed) */}
      {job.imageUrl && job.status !== "pending" && (
        <div
          style={{
            width: "100%",
            height: "120px",
            borderRadius: "4px",
            border: "1px solid #333",
            backgroundImage: `url(${job.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      {/* Error (if failed) */}
      {job.error && (
        <div
          style={{
            padding: "8px",
            backgroundColor: "rgba(244, 63, 94, 0.1)",
            border: "1px solid #f43f5e",
            borderRadius: "3px",
            display: "flex",
            gap: "6px",
            alignItems: "flex-start",
          }}
        >
          <AlertCircle
            size={14}
            style={{ color: "#f43f5e", marginTop: "2px" }}
          />
          <span style={{ color: "#f43f5e", fontSize: "10px" }}>
            {job.error}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      {job.status === "completed" && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onApprove}
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: "#4ade80",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "bold",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#22c55e";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#4ade80";
            }}
          >
            Approve ✓
          </button>
          <button
            onClick={onRegenerate}
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: "#1a1a1a",
              color: "#00f0ff",
              border: "1px solid #333",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#00f0ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#333";
            }}
          >
            <RefreshCw size={12} />
            Regenerate
          </button>
        </div>
      )}

      {job.status === "failed" && (
        <button
          onClick={onRegenerate}
          style={{
            padding: "8px",
            backgroundColor: "#f43f5e",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#be423f";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#f43f5e";
          }}
        >
          <RefreshCw size={12} />
          Retry Generation
        </button>
      )}

      {job.status === "approved" && (
        <div
          style={{
            padding: "8px",
            backgroundColor: "rgba(74, 222, 128, 0.1)",
            border: "1px solid #4ade80",
            borderRadius: "4px",
            textAlign: "center",
          }}
        >
          <span
            style={{ color: "#4ade80", fontSize: "11px", fontWeight: "bold" }}
          >
            ✓ Approved
          </span>
        </div>
      )}
    </div>
  );
}
