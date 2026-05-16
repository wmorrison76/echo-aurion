import React, { useState } from "react";
import { Share2, X, Check, Lock, Eye, Edit } from "lucide-react";
import { cn } from "@/lib/glass";

export interface PanelShare {
  id: string;
  sharedWith: Array<{
    userId: string;
    username: string;
    role: "viewer" | "editor";
    sharedAt: number;
  }>;
  isPublic?: boolean;
  publicLink?: string;
}

interface PanelSharingManagerProps {
  panelId: string;
  panelTitle: string;
  currentShares?: PanelShare;
  onShare?: (shares: PanelShare) => void;
  teamMembers?: Array<{ id: string; name: string; role: string }>;
}

const TEAM_MEMBERS = [
  { id: "user-1", name: "John Smith", role: "Manager" },
  { id: "user-2", name: "Sarah Johnson", role: "Chef" },
  { id: "user-3", name: "Mike Brown", role: "Manager" },
  { id: "user-4", name: "Lisa Davis", role: "Host" },
  { id: "user-5", name: "Robert Wilson", role: "Chef" },
  { id: "user-6", name: "Emily Chen", role: "Server" },
];

export function PanelSharingManager({
  panelId,
  panelTitle,
  currentShares,
  onShare,
  teamMembers = TEAM_MEMBERS,
}: PanelSharingManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"viewer" | "editor">(
    "viewer",
  );
  const [shares, setShares] = useState<PanelShare>(
    currentShares || {
      id: panelId,
      sharedWith: [],
      isPublic: false,
    },
  );

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const addShare = () => {
    if (!selectedUserId) return;

    const member = teamMembers.find((m) => m.id === selectedUserId);
    if (!member) return;

    // Check if already shared
    if (shares.sharedWith.some((s) => s.userId === selectedUserId)) {
      // Update role instead
      const updated = {
        ...shares,
        sharedWith: shares.sharedWith.map((s) =>
          s.userId === selectedUserId ? { ...s, role: selectedRole } : s,
        ),
      };
      setShares(updated);
      onShare?.(updated);
    } else {
      // Add new share
      const updated = {
        ...shares,
        sharedWith: [
          ...shares.sharedWith,
          {
            userId: selectedUserId,
            username: member.name,
            role: selectedRole,
            sharedAt: Date.now(),
          },
        ],
      };
      setShares(updated);
      onShare?.(updated);
    }

    setSelectedUserId(null);
    setSelectedRole("viewer");
  };

  const removeShare = (userId: string) => {
    const updated = {
      ...shares,
      sharedWith: shares.sharedWith.filter((s) => s.userId !== userId),
    };
    setShares(updated);
    onShare?.(updated);
  };

  const togglePublic = () => {
    const updated = {
      ...shares,
      isPublic: !shares.isPublic,
      publicLink: !shares.isPublic
        ? `https://luccca.io/share/${panelId}-${Math.random().toString(36).substr(2, 9)}`
        : undefined,
    };
    setShares(updated);
    onShare?.(updated);
  };

  return (
    <div>
      {/* Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-8 h-8 rounded transition-all text-foreground/60 hover:text-foreground hover:bg-primary/10"
        title="Share this panel with team"
        type="button"
      >
        <Share2 size={16} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border/50 rounded-lg shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="border-b border-border/30 bg-background/95 backdrop-blur p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Share "{panelTitle}"
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-primary/10 rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Public Link */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-foreground">
                    Public Access
                  </label>
                  <button
                    onClick={togglePublic}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      shares.isPublic
                        ? "bg-green-500/30"
                        : "bg-background/60 border border-border/30",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-foreground transition-transform",
                        shares.isPublic ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                </div>
                {shares.isPublic && shares.publicLink && (
                  <div className="bg-primary/5 border border-primary/20 rounded p-2">
                    <p className="text-xs text-foreground/70 mb-2">
                      Anyone with this link can view:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shares.publicLink}
                        readOnly
                        className="flex-1 px-2 py-1 bg-background/60 border border-border/30 rounded text-xs text-foreground"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(shares.publicLink || "");
                        }}
                        className="px-2 py-1 bg-primary/20 hover:bg-primary/30 rounded text-xs font-medium transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Team Sharing */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Team Members
                </label>

                {/* Add Member */}
                <div className="space-y-2 mb-4">
                  <div className="flex gap-2">
                    <select
                      value={selectedUserId || ""}
                      onChange={(e) => setSelectedUserId(e.target.value || null)}
                      className="flex-1 px-3 py-2 bg-background/60 border border-border/30 rounded text-sm text-foreground"
                    >
                      <option value="">Select team member...</option>
                      {teamMembers
                        .filter(
                          (m) =>
                            !shares.sharedWith.some((s) => s.userId === m.id),
                        )
                        .map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name} ({member.role})
                          </option>
                        ))}
                    </select>
                    <select
                      value={selectedRole}
                      onChange={(e) =>
                        setSelectedRole(e.target.value as "viewer" | "editor")
                      }
                      className="px-3 py-2 bg-background/60 border border-border/30 rounded text-sm text-foreground"
                    >
                      <option value="viewer">View</option>
                      <option value="editor">Edit</option>
                    </select>
                    <button
                      onClick={addShare}
                      disabled={!selectedUserId}
                      className="px-4 py-2 bg-primary/30 hover:bg-primary/50 disabled:opacity-50 text-foreground rounded text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <Check size={14} />
                      Add
                    </button>
                  </div>
                </div>

                {/* Shared Members List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {shares.sharedWith.length === 0 ? (
                    <p className="text-xs text-foreground/50 text-center py-4">
                      Not shared with anyone yet
                    </p>
                  ) : (
                    shares.sharedWith.map((share) => (
                      <div
                        key={share.userId}
                        className="flex items-center justify-between p-2 bg-background/60 border border-border/30 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {share.username}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-foreground/60">
                            {share.role === "editor" ? (
                              <>
                                <Edit size={12} />
                                Can edit
                              </>
                            ) : (
                              <>
                                <Eye size={12} />
                                Can view
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeShare(share.userId)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <X size={16} className="text-red-500" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="bg-primary/5 border border-primary/20 rounded p-3">
                <p className="text-xs text-foreground/70">
                  💡 <strong>Tip:</strong> Team members with "Edit" permission
                  can modify this widget and see updates in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
