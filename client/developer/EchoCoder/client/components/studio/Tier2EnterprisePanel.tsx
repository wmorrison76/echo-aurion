import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Users,
  Settings,
  Flag,
  Webhook,
  GitBranch,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  members: number;
  status: "active" | "suspended" | "archived";
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  members: number;
}

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  rollout_percentage: number;
}

interface Webhook {
  id: string;
  event_type: string;
  target_url: string;
  status: "active" | "inactive" | "disabled";
  last_triggered: string;
}

export const Tier2EnterprisePanel: React.FC = () => {
  const [workspaces] = useState<Workspace[]>([
    {
      id: "ws-1",
      name: "Production",
      slug: "production",
      plan: "enterprise",
      members: 45,
      status: "active",
      created_at: new Date().toISOString(),
    },
    {
      id: "ws-2",
      name: "Development",
      slug: "development",
      plan: "team",
      members: 12,
      status: "active",
      created_at: new Date().toISOString(),
    },
  ]);

  const [roles] = useState<Role[]>([
    { id: "r-1", name: "Admin", permissions: ["all"], members: 3 },
    { id: "r-2", name: "Editor", permissions: ["content.edit", "content.publish"], members: 15 },
    { id: "r-3", name: "Reviewer", permissions: ["content.review"], members: 8 },
  ]);

  const [flags] = useState<FeatureFlag[]>([
    { id: "f-1", key: "advanced_analytics", enabled: true, rollout_percentage: 100 },
    { id: "f-2", key: "ai_features", enabled: true, rollout_percentage: 75 },
    { id: "f-3", key: "beta_ui", enabled: false, rollout_percentage: 0 },
  ]);

  const [webhooks] = useState<Webhook[]>([
    {
      id: "wh-1",
      event_type: "content.published",
      target_url: "https://api.example.com/webhooks/publish",
      status: "active",
      last_triggered: "2 minutes ago",
    },
    {
      id: "wh-2",
      event_type: "user.invited",
      target_url: "https://api.example.com/webhooks/invite",
      status: "active",
      last_triggered: "1 hour ago",
    },
  ]);

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Enterprise Workspace Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage workspaces, roles, feature flags, and webhooks across your organization
        </p>
      </div>

      <Tabs defaultValue="workspaces" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workspaces" className="flex gap-2">
            <Users className="w-4 h-4" />
            Workspaces
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex gap-2">
            <Settings className="w-4 h-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="flags" className="flex gap-2">
            <Flag className="w-4 h-4" />
            Flags
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex gap-2">
            <Webhook className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workspaces" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Workspaces ({workspaces.length})</h3>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Workspace
            </Button>
          </div>
          <div className="grid gap-4">
            {workspaces.map((ws) => (
              <Card key={ws.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{ws.name}</CardTitle>
                      <CardDescription>{ws.slug}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {ws.plan}
                      </span>
                      {ws.status === "active" && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Members</p>
                      <p className="font-semibold">{ws.members}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-semibold capitalize">{ws.status}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Users className="w-3 h-3" />
                      Members
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Custom Roles ({roles.length})</h3>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Role
            </Button>
          </div>
          <div className="grid gap-3">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="font-semibold">{role.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {role.permissions.length} permissions • {role.members} members
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flags" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Feature Flags ({flags.length})</h3>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Flag
            </Button>
          </div>
          <div className="grid gap-3">
            {flags.map((flag) => (
              <Card key={flag.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{flag.key}</p>
                        {flag.enabled ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-secondary rounded h-2">
                          <div
                            className="bg-primary h-full rounded transition-all"
                            style={{ width: `${flag.rollout_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-12 text-right">
                          {flag.rollout_percentage}%
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="ml-2">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Webhooks ({webhooks.length})</h3>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Webhook
            </Button>
          </div>
          <div className="grid gap-3">
            {webhooks.map((webhook) => (
              <Card key={webhook.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1">
                        <p className="font-semibold text-sm">{webhook.event_type}</p>
                        <p className="text-xs text-muted-foreground font-mono break-all">
                          {webhook.target_url}
                        </p>
                      </div>
                      {webhook.status === "active" && (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last triggered {webhook.last_triggered}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex gap-2 items-center">
            <GitBranch className="w-5 h-5" />
            API Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Access comprehensive API documentation at{" "}
          <code className="bg-secondary px-2 py-1 rounded text-xs font-mono">/api/tier2</code>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tier2EnterprisePanel;
