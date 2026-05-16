import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  FileText,
  Loader2,
  Share2,
  GitBranch,
  ExternalLink,
  Trash2,
} from "lucide-react";

interface AI3CollaborationPanelProps {
  sessionId: string;
  onClose?: () => void;
}

interface ShareToken {
  id: string;
  token: string;
  type: "view" | "comment" | "edit";
  created: string;
  expires?: string;
  accessCount: number;
}

interface SessionVersion {
  id: string;
  number: number;
  name: string;
  created: string;
}

interface TaskExport {
  id: string;
  platform: "jira" | "linear" | "github" | "asana";
  externalId: string;
  status: "pending" | "success" | "failed";
  created: string;
}

export const AI3CollaborationPanel: React.FC<AI3CollaborationPanelProps> = ({
  sessionId,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Share state
  const [shareTokens, setShareTokens] = useState<ShareToken[]>([]);
  const [shareEmail, setShareEmail] = useState("");
  const [shareType, setShareType] = useState<"view" | "comment" | "edit">("view");
  const [sharingLoading, setSharingLoading] = useState(false);

  // Versions state
  const [versions, setVersions] = useState<SessionVersion[]>([]);
  const [versionName, setVersionName] = useState("");
  const [versioningLoading, setVersioningLoading] = useState(false);

  // Exports state
  const [exports, setExports] = useState<TaskExport[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedExportPlatform, setSelectedExportPlatform] = useState<
    "jira" | "linear" | "github" | "asana"
  >("jira");

  const handleShare = async () => {
    try {
      setSharingLoading(true);
      setError(null);

      const response = await fetch("/api/ai3/collab/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          shareType,
          sharedWithEmail: shareEmail || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to share session");

      const data = await response.json();
      if (data.success) {
        setShareTokens([
          ...shareTokens,
          {
            id: data.data.shareToken,
            token: data.data.shareToken,
            type: shareType,
            created: new Date().toISOString(),
            accessCount: 0,
          },
        ]);
        setShareEmail("");
      }
    } catch (err) {
      setError("Failed to create share link");
    } finally {
      setSharingLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    try {
      setVersioningLoading(true);
      setError(null);

      const response = await fetch("/api/ai3/collab/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          snapshotName: versionName || `Version ${versions.length + 1}`,
        }),
      });

      if (!response.ok) throw new Error("Failed to create version");

      const data = await response.json();
      if (data.success) {
        setVersions([
          ...versions,
          {
            id: data.data.snapshotId,
            number: data.data.snapshotNumber,
            name: data.data.snapshotName,
            created: new Date().toISOString(),
          },
        ]);
        setVersionName("");
      }
    } catch (err) {
      setError("Failed to create version");
    } finally {
      setVersioningLoading(false);
    }
  };

  const handleExport = async (platform: "jira" | "linear" | "github" | "asana") => {
    try {
      setExportLoading(true);
      setError(null);

      const endpoint =
        platform === "jira"
          ? "/api/ai3/collab/export-jira"
          : platform === "linear"
            ? "/api/ai3/collab/export-linear"
            : "/api/ai3/collab/export-github";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          projectKey: "ECHO",
          teamId: "default",
        }),
      });

      if (!response.ok) throw new Error(`Failed to export to ${platform}`);

      const data = await response.json();
      if (data.success) {
        setExports([
          ...exports,
          {
            id: data.data.exportId,
            platform,
            externalId: data.data.taskKey || data.data.issueId,
            status: "pending",
            created: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setError(`Failed to export to ${platform}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleCopyShareLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Collaboration & Exports
        </CardTitle>
        <CardDescription>Share your work and export to external platforms</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 flex gap-2 p-3 rounded border border-destructive bg-destructive/5">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Tabs defaultValue="share" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="share">Share</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="exports">Exports</TabsTrigger>
          </TabsList>

          {/* Share Tab */}
          <TabsContent value="share" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Share Type</label>
                <div className="flex gap-2 mt-2">
                  {(["view", "comment", "edit"] as const).map((type) => (
                    <Button
                      key={type}
                      variant={shareType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShareType(type)}
                      disabled={sharingLoading}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Email (Optional)</label>
                <Input
                  placeholder="colleague@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  disabled={sharingLoading}
                  className="mt-2"
                />
              </div>

              <Button onClick={handleShare} disabled={sharingLoading} className="w-full">
                {sharingLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Link...
                  </>
                ) : (
                  "Create Share Link"
                )}
              </Button>
            </div>

            {shareTokens.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-medium">Active Links</h4>
                {shareTokens.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-2 rounded border bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <Badge className="mb-1">{share.type}</Badge>
                      <p className="text-xs font-mono text-muted-foreground truncate">
                        {`/share/${share.token.slice(0, 8)}...`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {share.accessCount} views
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyShareLink(share.token)}
                    >
                      {copied === share.token ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Versions Tab */}
          <TabsContent value="versions" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Version Name (Optional)</label>
                <Input
                  placeholder="e.g., Final revision, v1.2"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  disabled={versioningLoading}
                  className="mt-2"
                />
              </div>

              <Button onClick={handleCreateVersion} disabled={versioningLoading} className="w-full">
                {versioningLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <GitBranch className="h-4 w-4 mr-2" />
                    Create Snapshot
                  </>
                )}
              </Button>
            </div>

            {versions.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-medium">Snapshots</h4>
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div>
                      <p className="text-sm font-medium">{version.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(version.created).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Exports Tab */}
          <TabsContent value="exports" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Export To</label>
              <div className="grid grid-cols-2 gap-2">
                {(["jira", "linear", "github", "asana"] as const).map((platform) => (
                  <Button
                    key={platform}
                    variant={selectedExportPlatform === platform ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedExportPlatform(platform)}
                    disabled={exportLoading}
                  >
                    {platform.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => handleExport(selectedExportPlatform)}
              disabled={exportLoading}
              className="w-full"
            >
              {exportLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>

            {exports.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-medium">Export History</h4>
                {exports.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div>
                      <Badge className="mb-1" variant={exp.status === "success" ? "default" : "secondary"}>
                        {exp.platform.toUpperCase()}
                      </Badge>
                      <p className="text-xs font-mono">{exp.externalId}</p>
                      <p className="text-xs text-muted-foreground">
                        {exp.status}
                      </p>
                    </div>
                    {exp.status === "success" && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href="#" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AI3CollaborationPanel;
