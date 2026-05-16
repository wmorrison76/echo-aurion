import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Clock, Zap, Video, Share2 } from "lucide-react";

interface Team {
  id: string;
  name: string;
  role: string;
  status: "online" | "away" | "offline";
  avatar?: string;
}

interface CollaborationHubProps {
  track: "fine-dining" | "manufacturing";
  labMode: "culinary" | "pastry";
  currentUser?: { id: string; name: string };
}

export function CollaborationHub({
  track,
  labMode,
  currentUser,
}: CollaborationHubProps) {
  const [teamMembers, setTeamMembers] = useState<Team[]>([
    { id: "1", name: "You", role: "Chef", status: "online" },
  ]);
  const [inviteSent, setInviteSent] = useState(false);

  const handleInviteCollaborators = () => {
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 3000);
  };

  return (
    <Card className="border border-border dark:border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div>
              <CardTitle>Lab Team</CardTitle>
              <CardDescription>Collaborate with other chefs</CardDescription>
            </div>
          </div>
          <Badge>{teamMembers.length} in lab</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Members */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Current Team
          </h3>
          <div className="space-y-2">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-muted/50 dark:bg-slate-800/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#c8a97e] flex items-center justify-center text-white text-xs font-semibold">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {member.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      member.status === "online"
                        ? "bg-green-500"
                        : member.status === "away"
                          ? "bg-yellow-500"
                          : "bg-slate-400"
                    }`}
                  />
                  <span className="text-xs text-muted-foreground capitalize">
                    {member.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Waiting for Others */}
        {teamMembers.length === 1 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900 dark:text-blue-200">
                  Waiting for Others
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {track === "fine-dining"
                    ? "Invite fellow chefs to collaborate on this innovation"
                    : "Invite team members to join the development session"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Future Features */}
        <div className="space-y-2 pt-4 border-t border-border dark:border-slate-700">
          <h3 className="text-sm font-semibold text-foreground">Coming Soon</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 text-muted-foreground">
              <Video className="h-4 w-4" />
              <span className="text-sm">Video Chat</span>
              <Badge variant="secondary" className="ml-auto">
                Soon
              </Badge>
            </div>
            <div className="flex items-center gap-2 p-2 text-muted-foreground">
              <Share2 className="h-4 w-4" />
              <span className="text-sm">Screen Sharing</span>
              <Badge variant="secondary" className="ml-auto">
                Soon
              </Badge>
            </div>
            <div className="flex items-center gap-2 p-2 text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Shared Experience</span>
              <Badge variant="secondary" className="ml-auto">
                Soon
              </Badge>
            </div>
          </div>
        </div>

        {/* Invite Button */}
        <Button
          onClick={handleInviteCollaborators}
          className="w-full gap-2"
          variant={inviteSent ? "default" : "outline"}
        >
          <UserPlus className="h-4 w-4" />
          {inviteSent ? "Invite Sent!" : "Invite Collaborators"}
        </Button>
      </CardContent>
    </Card>
  );
}
