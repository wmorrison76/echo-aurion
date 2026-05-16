import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@supabase/supabase-js";
import {
  ResponsiveContainer,
  ResponsiveGrid,
  useBreakpoint,
} from "@/components/layout";
import {
  Users,
  Package,
  Download,
  Trash2,
  CheckCircle2,
  BarChart3,
  Shield,
  Building2,
  UserPlus,
  AlertCircle,
} from "lucide-react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Organization {
  id: string;
  name: string;
  slug?: string;
  subscription_tier: string;
  owner_id: string;
  created_at: string;
  current_usage: Record<string, number>;
  usage_limits: Record<string, number>;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  org_id: string;
  role: string;
  created_at: string;
  profiles?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface AuditLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  created_at: string;
  ip_address?: string;
}

interface SystemSnapshot {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
  size_bytes: number;
  restore_count: number;
  created_by: string;
  is_deleted: boolean;
}

const TIER_OPTIONS = [
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise" },
];

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

export default function AdminDashboard() {
  const [activeOrg, setActiveOrg] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<string>("starter");
  const [newOrgName, setNewOrgName] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("organizations");
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  // Fetch organizations
  const { data: organizations = [], refetch: refetchOrgs } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });
      return data as Organization[];
    },
  });

  // Fetch organization members
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["admin-members", activeOrg],
    queryFn: async () => {
      if (!activeOrg) return [];
      const { data } = await supabase
        .from("organization_members")
        .select("*, profiles(id, email, full_name, avatar_url)")
        .eq("org_id", activeOrg)
        .order("created_at", { ascending: false });
      return data as OrganizationMember[];
    },
    enabled: !!activeOrg,
  });

  // Fetch audit logs
  const { data: auditLogs = [], refetch: refetchAuditLogs } = useQuery({
    queryKey: ["admin-audit-logs", activeOrg],
    queryFn: async () => {
      if (!activeOrg) return [];
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("workspace_id", activeOrg)
        .order("created_at", { ascending: false })
        .limit(100);
      return data as AuditLog[];
    },
    enabled: !!activeOrg,
  });

  // Fetch snapshots
  const { data: snapshots = [], refetch: refetchSnapshots } = useQuery({
    queryKey: ["admin-snapshots", activeOrg],
    queryFn: async () => {
      if (!activeOrg) return [];
      const { data } = await supabase
        .from("system_snapshots")
        .select("*")
        .eq("org_id", activeOrg)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      return data as SystemSnapshot[];
    },
    enabled: !!activeOrg,
  });

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("organizations")
        .insert({
          name,
          slug: name.toLowerCase().replace(/\s+/g, "-"),
          subscription_tier: selectedTier,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization created successfully",
      });
      setNewOrgName("");
      refetchOrgs();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": activeOrg,
        },
        body: JSON.stringify({ email, role: "editor" }),
      });

      if (!response.ok) throw new Error("Failed to send invitation");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async (tier: string) => {
      const response = await fetch(
        `/api/admin/organizations/${activeOrg}/tier`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": activeOrg,
          },
          body: JSON.stringify({ tier }),
        },
      );

      if (!response.ok) throw new Error("Failed to update tier");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization tier updated",
      });
      refetchOrgs();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateOrg = () => {
    if (!newOrgName.trim()) {
      toast({
        title: "Error",
        description: "Organization name is required",
        variant: "destructive",
      });
      return;
    }
    createOrgMutation.mutate(newOrgName);
  };

  const handleInviteUser = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    inviteUserMutation.mutate(inviteEmail);
  };

  const currentOrg = organizations.find((org) => org.id === activeOrg);

  const tabItems = [
    { value: "organizations", label: "Organizations", icon: Building2 },
    { value: "users", label: "Users", icon: Users, disabled: !activeOrg },
    { value: "audit", label: "Audit Logs", icon: BarChart3, disabled: !activeOrg },
    { value: "snapshots", label: "Snapshots", icon: Package, disabled: !activeOrg },
  ];

  return (
    <ResponsiveContainer className="py-6 sm:py-8">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 sm:h-8 w-6 sm:w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Console</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage organizations, users, and system settings
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="mb-6 sm:mb-8 w-full"
      >
        <TabsList className={`grid w-full gap-1 ${
          isMobile ? "grid-cols-2" : "grid-cols-4"
        }`}>
          {tabItems.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              disabled={item.disabled}
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              {item.icon && <item.icon className="h-3 w-3 sm:h-4 sm:w-4" />}
              <span className="hidden sm:inline">{item.label}</span>
              <span className="inline sm:hidden">{item.label.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Create Organization</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Create a new organization and set its subscription tier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Input
                  placeholder="Organization name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="flex-1 text-sm"
                  aria-label="Organization name"
                />
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger className="w-full sm:w-40 text-sm" aria-label="Subscription tier">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_OPTIONS.map((tier) => (
                      <SelectItem key={tier.value} value={tier.value}>
                        {tier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleCreateOrg}
                  disabled={createOrgMutation.isPending}
                  className="w-full sm:w-auto text-sm"
                >
                  {createOrgMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <ResponsiveGrid 
            cols={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }} 
            gap="md"
          >
            {organizations.map((org) => (
              <Card
                key={org.id}
                className={`cursor-pointer transition border-2 ${
                  activeOrg === org.id ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20" : "hover:border-primary/50"
                }`}
                onClick={() => {
                  setActiveOrg(org.id);
                  setActiveTab("users");
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveOrg(org.id);
                    setActiveTab("users");
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base sm:text-lg">{org.name}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        {org.slug} • {org.subscription_tier} tier
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs">
                      Manage
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Created</p>
                      <p className="font-medium">
                        {new Date(org.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Owner ID</p>
                      <p className="font-mono text-xs break-all">
                        {org.owner_id.slice(0, 8)}...
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <p className="flex items-center gap-1 font-medium text-green-600">
                        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="text-xs">Active</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4 sm:space-y-6">
          {currentOrg && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Invite User</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Send an invitation to join {currentOrg.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      type="email"
                      className="flex-1 text-sm"
                      aria-label="Email address"
                    />
                    <Button
                      onClick={handleInviteUser}
                      disabled={inviteUserMutation.isPending}
                      className="w-full sm:w-auto text-sm"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {inviteUserMutation.isPending ? "Inviting..." : "Invite"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">
                    Organization Members ({members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members yet</p>
                    ) : (
                      members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between border-b pb-2 text-xs sm:text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {member.profiles?.full_name ||
                                member.profiles?.email}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.profiles?.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-1 text-xs font-medium text-blue-900 dark:text-blue-100 whitespace-nowrap">
                              {member.role}
                            </span>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {activeOrg === activeOrg && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Subscription Tier</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Manage {currentOrg.name}'s subscription level
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Select
                        value={currentOrg.subscription_tier}
                        onValueChange={(tier) =>
                          updateTierMutation.mutate(tier)
                        }
                      >
                        <SelectTrigger className="w-40 text-sm" aria-label="Subscription tier">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIER_OPTIONS.map((tier) => (
                            <SelectItem key={tier.value} value={tier.value}>
                              {tier.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {updateTierMutation.isPending && (
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          Updating...
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4 sm:space-y-6">
          {currentOrg && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Audit Logs</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Activity history for {currentOrg.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No audit logs yet</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="border-b pb-2 text-xs sm:text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">{log.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.resource_type && `${log.resource_type}`}
                              {log.resource_id &&
                                ` • ${log.resource_id.slice(0, 8)}`}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground flex-shrink-0 text-right whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Snapshots Tab */}
        <TabsContent value="snapshots" className="space-y-4 sm:space-y-6">
          {currentOrg && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">System Snapshots</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Backup and restore points for {currentOrg.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {snapshots.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 sm:p-8 text-center">
                      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                        No snapshots available
                      </p>
                    </div>
                  ) : (
                    snapshots.map((snapshot) => (
                      <div
                        key={snapshot.id}
                        className="flex items-center justify-between border-b pb-2 text-xs sm:text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{snapshot.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(snapshot.created_at).toLocaleString()} •{" "}
                            {(snapshot.size_bytes / 1024 / 1024).toFixed(2)} MB
                            • Restored {snapshot.restore_count} times
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="flex-shrink-0 text-xs ml-2">
                          <Download className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Restore</span>
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </ResponsiveContainer>
  );
}
