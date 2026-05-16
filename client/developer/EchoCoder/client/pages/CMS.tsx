import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Edit2, Trash2, Eye, ThumbsUp, MessageSquare, Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cmsService, ContentType, ContentItem } from "@/services/cmsService";
import { useToast } from "@/components/ui/use-toast";

export default function CMS() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [formData, setFormData] = useState({ title: "", content: "", type: "" });
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterContent();
  }, [content, selectedStatus, selectedType, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const types = await cmsService.getContentTypes();
      setContentTypes(types);

      const { data } = await cmsService.getContent({ limit: 100 });
      setContent(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filterContent = () => {
    let filtered = content;

    if (selectedStatus !== "all") {
      filtered = filtered.filter((item) => item.status === selectedStatus);
    }

    if (selectedType && selectedType !== "all") {
      filtered = filtered.filter((item) => item.type_id === selectedType);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (item) => item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredContent(filtered);
  };

  const handleCreateNew = () => {
    setEditingItem(null);
    setFormData({ title: "", content: "", type: "" });
    setShowEditor(true);
  };

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
    setFormData({ title: item.title, content: JSON.stringify(item.content), type: item.type_id });
    setShowEditor(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.title || !formData.type) {
        toast({ title: "Error", description: "Title and type are required" });
        return;
      }

      if (editingItem) {
        await cmsService.updateContent(editingItem.id, {
          title: formData.title,
          content: JSON.parse(formData.content || "{}"),
        });
        toast({ title: "Success", description: "Content updated" });
      } else {
        await cmsService.createContent({
          typeId: formData.type,
          title: formData.title,
          content: JSON.parse(formData.content || "{}"),
        });
        toast({ title: "Success", description: "Content created" });
      }

      setShowEditor(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this content? This cannot be undone.")) return;

    try {
      await cmsService.deleteContent(id);
      toast({ title: "Success", description: "Content deleted" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSubmitReview = async (id: string) => {
    try {
      await cmsService.submitForReview(id, "user-123");
      toast({ title: "Success", description: "Submitted for review" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await cmsService.approveContent(id, "reviewer-123", "Looks good!");
      toast({ title: "Success", description: "Content approved" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await cmsService.publishContent(id, "publisher-123");
      toast({ title: "Success", description: "Content published" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSelectContent = async (item: ContentItem) => {
    try {
      setSelectedContent(item);
      const analytics = await cmsService.getAnalytics(item.id);
      setAnalytics(analytics);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case "review":
        return <Clock className="h-4 w-4 text-orange-600" />;
      case "draft":
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      published: "bg-green-100 text-green-800",
      approved: "bg-blue-100 text-blue-800",
      review: "bg-orange-100 text-orange-800",
      draft: "bg-gray-100 text-gray-800",
      archived: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-gray-600 mt-1">Manage your LUCCCA hospitality content</p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" /> New Content
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <Select value={selectedType || "all"} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {contentTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">
            All ({content.length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Draft ({content.filter((c) => c.status === "draft").length})
          </TabsTrigger>
          <TabsTrigger value="review">
            Review ({content.filter((c) => c.status === "review").length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({content.filter((c) => c.status === "approved").length})
          </TabsTrigger>
          <TabsTrigger value="published">
            Published ({content.filter((c) => c.status === "published").length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({content.filter((c) => c.status === "archived").length})
          </TabsTrigger>
        </TabsList>

        {["all", "draft", "review", "approved", "published", "archived"].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Content List */}
              <div className="lg:col-span-2">
                {filteredContent.length === 0 ? (
                  <Card className="text-center py-12">
                    <p className="text-gray-500">No content found</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredContent.map((item) => (
                      <Card
                        key={item.id}
                        className={`cursor-pointer hover:shadow-lg transition ${
                          selectedContent?.id === item.id ? "ring-2 ring-blue-500" : ""
                        }`}
                        onClick={() => handleSelectContent(item)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{item.title}</h3>
                              <p className="text-sm text-gray-500">
                                {contentTypes.find((t) => t.id === item.type_id)?.label} · Updated{" "}
                                {new Date(item.updated_at).toLocaleDateString()}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <Badge className={getStatusColor(item.status)}>
                                  {item.status}
                                </Badge>
                                {item.language !== "en" && <Badge variant="outline">{item.language}</Badge>}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(item);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {item.status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSubmitReview(item.id);
                                  }}
                                >
                                  Submit
                                </Button>
                              )}
                              {item.status === "review" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApprove(item.id);
                                  }}
                                >
                                  Approve
                                </Button>
                              )}
                              {item.status === "approved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePublish(item.id);
                                  }}
                                >
                                  Publish
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Analytics Sidebar */}
              {selectedContent && analytics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Analytics</CardTitle>
                    <CardDescription>{selectedContent.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-blue-600" />
                          <span>Views</span>
                        </div>
                        <span className="font-bold text-xl">{analytics.views}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                          <span>Likes</span>
                        </div>
                        <span className="font-bold text-xl">{analytics.likes}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-orange-600" />
                          <span>Comments</span>
                        </div>
                        <span className="font-bold text-xl">{analytics.comments_count}</span>
                      </div>
                      {selectedContent.published_at && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            <span>Published</span>
                          </div>
                          <span className="text-sm">
                            {new Date(selectedContent.published_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingItem ? "Edit Content" : "Create New Content"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Content Type</label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter content title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Content (JSON)</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder='{"key": "value"}'
                  className="w-full h-32 p-2 border rounded font-mono text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowEditor(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
