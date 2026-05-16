import React, { useState, useEffect } from "react";
import { Clock, RotateCcw, X, Loader } from "lucide-react";

export interface Version {
  id: string;
  version_number: number;
  created_at: string;
  created_by: string;
  change_description: string;
  is_published: boolean;
}

interface VersionHistoryPanelProps {
  designId: string;
  userId: string;
  onRestore: (versionId: string) => Promise<void>;
  onClose: () => void;
}

export default function VersionHistoryPanel({
  designId,
  userId,
  onRestore,
  onClose,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [designId, userId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/designs/${designId}/versions?userId=${userId}&limit=30`,
      );

      if (!response.ok) {
        throw new Error("Failed to load versions");
      }

      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    try {
      setRestoring(versionId);
      await onRestore(versionId);
      setRestoring(null);
      // Reload versions after restore
      await loadVersions();
    } catch (err) {
      setError("Failed to restore version");
      setRestoring(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      style={{
        backgroundColor: "#0b0f1a",
        border: "1px solid #333",
        borderRadius: "8px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxHeight: "600px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid #333",
          backgroundColor: "#0a0a0a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock size={16} style={{ color: "#c8a97e" }} />
          <h3
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "bold",
              margin: 0,
            }}
          >
            Version History
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "200px",
              color: "#666",
            }}
          >
            <Loader
              size={20}
              style={{ animation: "spin 1s linear infinite" }}
            />
          </div>
        ) : error ? (
          <div
            style={{
              padding: "12px",
              backgroundColor: "rgba(255, 0, 0, 0.1)",
              borderLeft: "3px solid #ff4444",
              color: "#ff8888",
              fontSize: "11px",
              borderRadius: "4px",
            }}
          >
            {error}
          </div>
        ) : versions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#666",
              fontSize: "11px",
              padding: "20px",
            }}
          >
            No versions yet. Start editing to create versions.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {versions.map((version, index) => (
              <div
                key={version.id}
                style={{
                  padding: "10px",
                  backgroundColor: "#2a2a2a",
                  borderRadius: "4px",
                  border: "1px solid #333",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "#333";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "#2a2a2a";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#c8a97e",
                        fontWeight: "500",
                        marginBottom: "4px",
                      }}
                    >
                      {version.change_description || `Version ${index + 1}`}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#888",
                      }}
                    >
                      {formatDate(version.created_at)}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestore(version.id)}
                    disabled={restoring !== null}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "4px 8px",
                      color: restoring === version.id ? "#999" : "#c8a97e",
                      cursor:
                        restoring === version.id ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      opacity: restoring === version.id ? 0.5 : 1,
                    }}
                    title="Restore this version"
                  >
                    {restoring === version.id ? (
                      <Loader
                        size={14}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <RotateCcw size={14} />
                    )}
                  </button>
                </div>

                {version.is_published && (
                  <div
                    style={{
                      marginTop: "6px",
                      display: "inline-block",
                      padding: "2px 6px",
                      backgroundColor: "rgba(200, 169, 126, 0.1)",
                      borderRadius: "3px",
                      fontSize: "9px",
                      color: "#c8a97e",
                      fontWeight: "500",
                    }}
                  >
                    Published
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
