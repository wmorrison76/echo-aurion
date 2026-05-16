import { useState, useMemo } from "react";
import { useRDLabStore } from "@/stores/rdLabStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Trash2, Plus, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  location?: string;
  joinedAt: string;
}

const AVAILABLE_COLLABORATORS = [
  {
    id: "user-1",
    name: "A. Vega",
    email: "a.vega@luccca.com",
    role: "editor" as const,
    location: "Kitchen A",
  },
  {
    id: "user-2",
    name: "M. Ruiz",
    email: "m.ruiz@luccca.com",
    role: "editor" as const,
    location: "Kitchen B",
  },
  {
    id: "user-3",
    name: "C. Nguyen",
    email: "c.nguyen@luccca.com",
    role: "viewer" as const,
    location: "Kitchen A",
  },
  {
    id: "user-4",
    name: "C. Dufour",
    email: "c.dufour@luccca.com",
    role: "editor" as const,
    location: "Pastry",
  },
  {
    id: "user-5",
    name: "L. Singh",
    email: "l.singh@luccca.com",
    role: "editor" as const,
    location: "Pastry",
  },
];

interface CollaborationPanelProps {
  experimentId?: string;
}

export function CollaborationPanel({
  experimentId: providedExperimentId,
}: CollaborationPanelProps) {
  const {
    experiments,
    focusExperimentId,
    addCollaborator,
    removeCollaborator,
  } = useRDLabStore();
  const experimentId = providedExperimentId || focusExperimentId;
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteLocation, setInviteLocation] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const experiment = useMemo(
    () => experiments.find((e) => e.id === experimentId),
    [experiments, experimentId],
  );

  const currentCollaborators = useMemo(() => {
    if (!experiment?.collaborators) return [];
    return experiment.collaborators
      .map((collab) => AVAILABLE_COLLABORATORS.find((ac) => ac.id === collab))
      .filter(Boolean) as Collaborator[];
  }, [experiment]);

  const canManageCollaborators = true;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    if (!experimentId) {
      toast.error("No experiment selected");
      return;
    }

    const matchedUser = AVAILABLE_COLLABORATORS.find(
      (user) => user.email.toLowerCase() === inviteEmail.toLowerCase(),
    );

    if (!matchedUser) {
      toast.error("User not found in system");
      return;
    }

    if (experiment?.collaborators?.includes(matchedUser.id)) {
      toast.error("This user is already a collaborator");
      return;
    }

    setIsInviting(true);
    try {
      addCollaborator(experimentId, matchedUser.id);
      setInviteEmail("");
      setInviteRole("editor");
      setInviteLocation("");
      toast.success(`${matchedUser.name} added as collaborator`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add collaborator",
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = (collaboratorId: string) => {
    removeCollaborator(experimentId, collaboratorId);
    toast.success("Collaborator removed");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Collaborators
        </CardTitle>
        <CardDescription>
          {currentCollaborators.length > 0
            ? `${currentCollaborators.length} collaborator${currentCollaborators.length !== 1 ? "s" : ""}`
            : "No collaborators yet"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Collaborators */}
        {currentCollaborators.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Current Team</p>
            <div className="space-y-2">
              {currentCollaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 dark:border-[#c8a97e]/15 dark:bg-amber-500/5"
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold">{collab.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {collab.email}
                      {collab.location && (
                        <>
                          <MapPin className="h-3 w-3" />
                          {collab.location}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {collab.role}
                    </Badge>

                    {canManageCollaborators && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(collab.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Section */}
        {canManageCollaborators && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Invite Collaborator
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Collaborator</DialogTitle>
                <DialogDescription>
                  Invite another EchoRecipePro user to collaborate on this
                  experiment. They can be from the same location or another
                  resort.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="collaborator@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as "editor" | "viewer")
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="editor">
                      Editor - Can edit experiments
                    </option>
                    <option value="viewer">Viewer - Can view only</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-location">Location (Optional)</Label>
                  <Input
                    id="invite-location"
                    placeholder="Their location/resort name"
                    value={inviteLocation}
                    onChange={(e) => setInviteLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-2 rounded-lg border border-blue-200/50 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/10 p-3">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Real-time sync:</strong> Collaborators will see live
                    updates to experiments and can contribute simultaneously
                    across any location.
                  </p>
                </div>

                <Button
                  onClick={handleInvite}
                  disabled={isInviting}
                  className="w-full"
                >
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {!canManageCollaborators && (
          <div className="rounded-lg border border-amber-200/50 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10 p-3 text-sm text-amber-900 dark:text-amber-100">
            Only the project owner can invite collaborators.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
