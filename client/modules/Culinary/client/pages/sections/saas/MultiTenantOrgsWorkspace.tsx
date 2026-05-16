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
import {
  Users,
  Shield,
  Plus,
  Mail,
  Trash2,
  Edit2,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/auth-service";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  created_at: string;
  members_count?: number;
  sso_enabled?: boolean;
  sso_provider?: string;
}

interface OrganizationMember {
  id: string;
  email: string;
  username: string;
  role: "owner" | "admin" | "editor" | "viewer";
  status: "active" | "invited" | "pending";
  joined_at: string;
}

export default function MultiTenantOrgsWorkspace() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer" | "admin">(
    "editor",
  );

  useEffect(() => {
    if (!supabase) {
      toast.error("Supabase not configured");
      return;
    }
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to fetch organizations",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgMembers = async (orgId: string) => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", orgId)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch members",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    fetchOrgMembers(org.id);
  };

  const handleCreateOrganization = async () => {
    if (!supabase || !newOrgName.trim()) {
      toast.error("Please enter an organization name");
      return;
    }

    setLoading(true);
    try {
      const slug = newOrgName.toLowerCase().replace(/\s+/g, "-");
      const { data, error } = await supabase
        .from("organizations")
        .insert({ name: newOrgName, slug })
        .select()
        .single();

      if (error) throw error;
      setOrganizations([data, ...organizations]);
      setNewOrgName("");
      setShowCreateDialog(false);
      toast.success("Organization created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create organization",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!supabase || !selectedOrg || !inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .insert({
          organization_id: selectedOrg.id,
          email: inviteEmail,
          role: inviteRole,
          status: "invited",
        })
        .select()
        .single();

      if (error) throw error;
      setMembers([data, ...members]);
      setInviteEmail("");
      setShowInviteDialog(false);
      toast.success(`Invitation sent to ${inviteEmail}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to invite member",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!supabase || !selectedOrg) return;

    if (!confirm("Remove this member from the organization?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      setMembers(members.filter((m) => m.id !== memberId));
      toast.success("Member removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!selectedOrg) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Organizations</h2>
            <p className="text-sm text-muted-foreground">
              Manage multi-tenant organizations with role-based access control
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Organization
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card
              key={org.id}
              className="cursor-pointer transition hover:shadow-lg"
              onClick={() => handleSelectOrg(org)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {org.name}
                  </CardTitle>
                  {org.sso_enabled && (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900">
                      SSO
                    </Badge>
                  )}
                </div>
                <CardDescription>{org.slug}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <p className="text-muted-foreground">Members</p>
                  <p className="font-semibold">{org.members_count || 0}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Created {new Date(org.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Create a new organization to manage team members and access
                control
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  placeholder="Acme Food Corp"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreateOrganization}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Creating..." : "Create"}
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
          onClick={() => setSelectedOrg(null)}
        >
          ←
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{selectedOrg.name}</h2>
          <p className="text-sm text-muted-foreground">{selectedOrg.slug}</p>
        </div>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="sso">SSO Settings</TabsTrigger>
          <TabsTrigger value="rbac">RBAC</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Team Members</h3>
            <Button
              onClick={() => setShowInviteDialog(true)}
              size="sm"
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Invite Member
            </Button>
          </div>

          <div className="space-y-2">
            {members.map((member) => (
              <Card key={member.id}>
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="font-semibold">{member.email}</p>
                    <p className="text-sm text-muted-foreground">
                      @{member.username}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {member.role}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {member.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteMember(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join this organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <Button
                  onClick={handleInviteMember}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="sso" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Single Sign-On (SSO)
              </CardTitle>
              <CardDescription>
                Configure OAuth2/OIDC providers for seamless authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedOrg.sso_enabled ? (
                <div className="space-y-2">
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900">
                    Enabled
                  </Badge>
                  <p className="text-sm">
                    Provider:{" "}
                    <span className="font-semibold">
                      {selectedOrg.sso_provider}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    SSO is not currently enabled for this organization.
                  </p>
                  <div className="grid gap-2">
                    <Button className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Configure Google SSO
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Configure Microsoft SSO
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Configure Okta SSO
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rbac" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role-Based Access Control</CardTitle>
              <CardDescription>
                Define permissions for each role in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["owner", "admin", "editor", "viewer"].map((role) => (
                  <div key={role} className="border rounded-lg p-4">
                    <h4 className="font-semibold capitalize mb-2">{role}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {role === "owner" && (
                        <>
                          <li>✓ Full access to all recipes and settings</li>
                          <li>✓ Manage team members and roles</li>
                          <li>✓ Configure SSO and security settings</li>
                        </>
                      )}
                      {role === "admin" && (
                        <>
                          <li>✓ Full access to all recipes</li>
                          <li>✓ Manage team members</li>
                          <li>✗ Cannot modify organization settings</li>
                        </>
                      )}
                      {role === "editor" && (
                        <>
                          <li>✓ Create and edit recipes</li>
                          <li>✓ View team collaborations</li>
                          <li>✗ Cannot manage members or settings</li>
                        </>
                      )}
                      {role === "viewer" && (
                        <>
                          <li>✓ View recipes and collections</li>
                          <li>✗ Cannot create or edit</li>
                          <li>✗ Cannot manage settings</li>
                        </>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
