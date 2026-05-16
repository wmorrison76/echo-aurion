import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Edit2,
  TrendingUp,
  Image as ImageIcon,
  Link2,
  Zap,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BatchOperation {
  id: string;
  operation_type: string;
  status: string;
  total_items: number;
  processed_items: number;
  failed_items: number;
  created_at: string;
}

interface SEOMetadata {
  id: string;
  title: string;
  meta_description: string;
  keywords: string;
  readability_score: number;
  generated_by: string;
}

interface ContentRelation {
  id: string;
  relation_type: string;
  target_content: { title: string; slug: string };
  created_at: string;
}

interface ContentAnalytics {
  views: number;
  likes: number;
  comments_count: number;
  engagement_score: number;
  trending_score: number;
}

interface Asset {
  id: string;
  file_name: string;
  asset_type: string;
  file_size: number;
  usage_count: number;
  created_at: string;
}

export function Tier1EnterprisePanel() {
  const [activeTab, setActiveTab] = useState("batch");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Batch Operations
  const [batchOps, setBatchOps] = useState<BatchOperation[]>([]);
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);

  // SEO Generator
  const [seoContentId, setSeoContentId] = useState("");
  const [seoData, setSeoData] = useState<SEOMetadata | null>(null);

  // Content Relations
  const [relationContentId, setRelationContentId] = useState("");
  const [relations, setRelations] = useState<ContentRelation[]>([]);

  // Analytics
  const [analyticsContentId, setAnalyticsContentId] = useState("");
  const [analyticsData, setAnalyticsData] = useState<ContentAnalytics | null>(
    null,
  );
  const [trendingContent, setTrendingContent] = useState<any[]>([]);

  // Assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetFilter, setAssetFilter] = useState("all");

  // ===== BATCH OPERATIONS =====
  const handleBatchOperation = async (operation: string) => {
    if (batchSelectedIds.length === 0) {
      setError("Please select items for batch operation");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/tier1/batch/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation_type: operation,
          content_ids: batchSelectedIds,
          user_id: "current-user",
        }),
      });

      if (!response.ok) throw new Error("Batch operation failed");
      const result = await response.json();

      setError(null);
      setBatchSelectedIds([]);
      // Refresh batch operations
      loadBatchOperations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBatchOperations = async () => {
    try {
      const response = await fetch(
        "/api/tier1/batch/operations?user_id=current-user",
      );
      if (!response.ok) throw new Error("Failed to load batch operations");
      const data = await response.json();
      setBatchOps(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  // ===== SEO GENERATOR =====
  const handleGenerateSEO = async () => {
    if (!seoContentId) {
      setError("Please select content");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/tier1/seo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: seoContentId,
          title: "Sample Title",
          content: "Sample content for SEO analysis",
        }),
      });

      if (!response.ok) throw new Error("SEO generation failed");
      const result = await response.json();
      setSeoData(result.seoData);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== CONTENT RELATIONS =====
  const loadRelations = async () => {
    if (!relationContentId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/tier1/relations/all/${relationContentId}`,
      );
      if (!response.ok) throw new Error("Failed to load relations");
      const data = await response.json();
      setRelations([...data.outgoing, ...data.incoming]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== ANALYTICS =====
  const loadAnalytics = async () => {
    if (!analyticsContentId) {
      // Load dashboard overview
      setLoading(true);
      try {
        const response = await fetch("/api/tier1/analytics/dashboard/overview");
        if (!response.ok) throw new Error("Failed to load analytics");
        const data = await response.json();
        setTrendingContent(data.topContent);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Load specific content analytics
      setLoading(true);
      try {
        const response = await fetch(
          `/api/tier1/analytics/content/${analyticsContentId}`,
        );
        if (!response.ok) throw new Error("Failed to load content analytics");
        const data = await response.json();
        setAnalyticsData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // ===== ASSETS =====
  const loadAssets = async () => {
    setLoading(true);
    try {
      let url = "/api/tier1/assets?limit=50";
      if (assetFilter !== "all") {
        url += `&type=${assetFilter}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load assets");
      const data = await response.json();
      setAssets(data.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load data on tab change
  useEffect(() => {
    if (activeTab === "batch") {
      loadBatchOperations();
    } else if (activeTab === "analytics") {
      loadAnalytics();
    } else if (activeTab === "assets") {
      loadAssets();
    }
  }, [activeTab]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg border border-slate-700">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full h-full flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-5 bg-slate-800 border-b border-slate-700 rounded-none">
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Batch</span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">SEO</span>
          </TabsTrigger>
          <TabsTrigger value="relations" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Relations</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Assets</span>
          </TabsTrigger>
        </TabsList>

        {/* BATCH OPERATIONS TAB */}
        <TabsContent value="batch" className="flex-1 overflow-y-auto p-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Batch Operations</CardTitle>
              <CardDescription>
                Perform bulk actions on multiple content items
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleBatchOperation("publish")}
                  disabled={loading || batchSelectedIds.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Publish All ({batchSelectedIds.length})
                </Button>
                <Button
                  onClick={() => handleBatchOperation("unpublish")}
                  disabled={loading || batchSelectedIds.length === 0}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Unpublish All
                </Button>
                <Button
                  onClick={() => handleBatchOperation("archive")}
                  disabled={loading || batchSelectedIds.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Archive All
                </Button>
                <Button
                  onClick={() => handleBatchOperation("delete")}
                  disabled={loading || batchSelectedIds.length === 0}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete All
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white">
                  Recent Operations
                </h4>
                {batchOps.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No batch operations yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {batchOps.map((op) => (
                      <div
                        key={op.id}
                        className="flex items-center justify-between p-2 bg-slate-700 rounded"
                      >
                        <div className="flex items-center gap-2">
                          {op.status === "completed" ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : op.status === "processing" ? (
                            <Clock className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">
                              {op.operation_type}
                            </p>
                            <p className="text-xs text-slate-400">
                              {op.processed_items}/{op.total_items} processed
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            op.status === "completed" ? "default" : "secondary"
                          }
                        >
                          {op.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO GENERATOR TAB */}
        <TabsContent value="seo" className="flex-1 overflow-y-auto p-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                SEO Metadata Generator
              </CardTitle>
              <CardDescription>
                Generate optimized SEO metadata using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Content ID
                </label>
                <Input
                  value={seoContentId}
                  onChange={(e) => setSeoContentId(e.target.value)}
                  placeholder="Enter content ID"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <Button
                onClick={handleGenerateSEO}
                disabled={loading || !seoContentId}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Generating..." : "Generate SEO Metadata"}
              </Button>

              {seoData && (
                <div className="space-y-3 mt-4">
                  <div className="p-3 bg-slate-700 rounded space-y-2">
                    <div>
                      <label className="text-xs font-medium text-slate-300">
                        Title
                      </label>
                      <p className="text-sm text-white">{seoData.title}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">
                        Description
                      </label>
                      <p className="text-sm text-white">
                        {seoData.meta_description}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">
                        Keywords
                      </label>
                      <p className="text-sm text-white">{seoData.keywords}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">
                        Readability Score
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-600 rounded overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${seoData.readability_score}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-white">
                          {seoData.readability_score}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTENT RELATIONS TAB */}
        <TabsContent value="relations" className="flex-1 overflow-y-auto p-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Content Relations</CardTitle>
              <CardDescription>
                View and manage relationships between content items
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Content ID
                </label>
                <Input
                  value={relationContentId}
                  onChange={(e) => setRelationContentId(e.target.value)}
                  placeholder="Enter content ID"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <Button
                onClick={loadRelations}
                disabled={loading || !relationContentId}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Loading..." : "Load Relations"}
              </Button>

              {relations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white">
                    Related Content ({relations.length})
                  </h4>
                  <div className="space-y-2">
                    {relations.map((rel) => (
                      <div
                        key={rel.id}
                        className="flex items-center justify-between p-2 bg-slate-700 rounded"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">
                            {rel.target_content?.title || "Unknown"}
                          </p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {rel.relation_type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="flex-1 overflow-y-auto p-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Analytics Dashboard</CardTitle>
              <CardDescription>
                View real-time content performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Content ID (optional)
                </label>
                <Input
                  value={analyticsContentId}
                  onChange={(e) => setAnalyticsContentId(e.target.value)}
                  placeholder="Leave empty for overview"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <Button
                onClick={loadAnalytics}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Loading..." : "Load Analytics"}
              </Button>

              {analyticsData && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-3 bg-slate-700 rounded">
                    <p className="text-xs text-slate-400">Views</p>
                    <p className="text-2xl font-bold text-white">
                      {analyticsData.views}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-700 rounded">
                    <p className="text-xs text-slate-400">Engagement</p>
                    <p className="text-2xl font-bold text-white">
                      {analyticsData.engagement_score}%
                    </p>
                  </div>
                  <div className="p-3 bg-slate-700 rounded">
                    <p className="text-xs text-slate-400">Likes</p>
                    <p className="text-2xl font-bold text-white">
                      {analyticsData.likes}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-700 rounded">
                    <p className="text-xs text-slate-400">Comments</p>
                    <p className="text-2xl font-bold text-white">
                      {analyticsData.comments_count}
                    </p>
                  </div>
                </div>
              )}

              {trendingContent.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-sm font-medium text-white">
                    Top Performing Content
                  </h4>
                  <div className="space-y-1">
                    {trendingContent.slice(0, 5).map((content, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-slate-700 rounded"
                      >
                        <span className="text-xs font-bold text-blue-400">
                          #{idx + 1}
                        </span>
                        <span className="text-sm text-white flex-1">
                          {content.content?.title || "Unknown"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {content.views} views
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASSETS TAB */}
        <TabsContent value="assets" className="flex-1 overflow-y-auto p-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Asset Management</CardTitle>
              <CardDescription>
                Manage and organize your media files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {["all", "image", "video", "document", "audio"].map((type) => (
                  <Button
                    key={type}
                    variant={assetFilter === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAssetFilter(type)}
                    className="text-xs"
                  >
                    {type === "all"
                      ? "All"
                      : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>

              <Button
                onClick={loadAssets}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Loading..." : "Load Assets"}
              </Button>

              {assets.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white">
                    Assets ({assets.length})
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between p-2 bg-slate-700 rounded"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {asset.file_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {(asset.file_size / 1024).toFixed(2)} KB • Used{" "}
                            {asset.usage_count} times
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {asset.asset_type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert className="bg-red-900/20 border-red-700 text-red-200 m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
