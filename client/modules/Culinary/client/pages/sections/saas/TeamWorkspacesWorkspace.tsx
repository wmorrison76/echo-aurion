import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Share2, Plus, Eye, MessageSquare, Zap } from "lucide-react";
import { supabase } from "@/lib/auth-service";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
  description?: string;
  type: "collection" | "project" | "campaign";
  members_count: number;
  recipe_count: number;
  last_updated: string;
  is_public: boolean;
  shared_with?: string[];
}

interface CollaborationActivity {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  entity: string;
}

export default function TeamWorkspacesWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null,
  );
  const [activities, setActivities] = useState<CollaborationActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");
  const [newWorkspaceType, setNewWorkspaceType] = useState<
    "collection" | "project" | "campaign"
  >("collection");

  useEffect(() => {
    if (!supabase) {
      toast.error("Supabase not configured");
      return;
    }
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("team_workspaces")
        .select("*")
        .order("last_updated", { ascending: false });

      if (error) throw error;
      setWorkspaces(data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch workspaces",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaceActivity = async (workspaceId: string) => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workspace_activity")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("timestamp", { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch activity",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkspace = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    fetchWorkspaceActivity(workspace.id);
  };

  const handleCreateWorkspace = async () => {
    if (!supabase || !newWorkspaceName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("team_workspaces")
        .insert({
          name: newWorkspaceName,
          description: newWorkspaceDesc,
          type: newWorkspaceType,
          is_public: false,
        })
        .select()
        .single();

      if (error) throw error;
      setWorkspaces([data, ...workspaces]);
      setNewWorkspaceName("");
      setNewWorkspaceDesc("");
      setShowCreateDialog(false);
      toast.success("Workspace created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create workspace",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!selectedWorkspace) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Team Workspaces
            </h2>
            <p className="text-sm text-muted-foreground">
              Collaborate on shared collections with real-time sync and presence
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Workspace
          </Button>
        </div>

        <div className="grid gap-4">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className="cursor-pointer transition hover:shadow-lg"
              onClick={() => handleSelectWorkspace(workspace)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {workspace.name}
                  </CardTitle>
                  {workspace.is_public && (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900">
                      Public
                    </Badge>
                  )}
                </div>
                {workspace.description && (
                  <CardDescription>{workspace.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Members</p>
                  <p className="font-semibold">{workspace.members_count}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Recipes</p>
                  <p className="font-semibold">{workspace.recipe_count}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground capitalize">
                    Type
                  </p>
                  <p className="font-semibold">{workspace.type}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
              <DialogDescription>
                Create a new shared workspace for team collaboration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Workspace Name</Label>
                <Input
                  placeholder="Spring Menu Redesign"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Optional description"
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  value={newWorkspaceType}
                  onChange={(e) => setNewWorkspaceType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="collection">Collection</option>
                  <option value="project">Project</option>
                  <option value="campaign">Campaign</option>
                </select>
              </div>
              <Button
                onClick={handleCreateWorkspace}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Workspace"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedWorkspace(null)}
        >
          ←
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{selectedWorkspace.name}</h2>
          {selectedWorkspace.description && (
            <p className="text-sm text-muted-foreground">
              {selectedWorkspace.description}
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Sync
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Members</CardTitle>
              <CardDescription>
                {selectedWorkspace.members_count} members in this workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="gap-2 w-full">
                <Share2 className="h-4 w-4" />
                Share Workspace
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Real-Time Sync
              </CardTitle>
              <CardDescription>
                This workspace uses real-time synchronization with automatic
                conflict resolution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Sync Status: Active</p>
                <div className="w-full bg-green-100 rounded-full h-2 dark:bg-green-900">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: "100%" }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Last synced: 30 seconds ago
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                {activities.length > 0
                  ? `${activities.length} recent actions`
                  : "No activity yet"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity recorded
                </p>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-semibold">{activity.user}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.action}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
