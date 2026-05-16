import { useEffect, useState } from "react";
import {
  collaborationService,
  type Collaborator,
} from "@/services/CollaborationService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  MessageCircle,
  Activity,
  Wifi,
  WifiOff,
  Send,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CollaborationPanelProps {
  fileId: string;
  userId: string;
}

export default function CollaborationPanel({
  fileId,
  userId,
}: CollaborationPanelProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [commentText, setCommentText] = useState("");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionStatus("Connected");
      toast({
        title: "Connected",
        description: "You are now collaborating in real-time",
      });
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setConnectionStatus("Disconnected - Reconnecting...");
    };

    const handleError = (error: any) => {
      setConnectionStatus("Error: Connection failed");
      console.error("Collaboration error:", error);
    };

    const handleCollaboratorsUpdated = (collaborators: Collaborator[]) => {
      setCollaborators(collaborators);
    };

    const handleComment = (comment: any) => {
      setComments((prev) => [...prev, comment]);
    };

    const handleActivity = (activity: any) => {
      setActivityLog((prev) => [activity, ...prev.slice(0, 49)]);
    };

    collaborationService.on("connected", handleConnected);
    collaborationService.on("disconnected", handleDisconnected);
    collaborationService.on("error", handleError);
    collaborationService.on(
      "collaborators-updated",
      handleCollaboratorsUpdated,
    );
    collaborationService.on("comment", handleComment);
    collaborationService.on("activity", handleActivity);

    return () => {
      collaborationService.off("connected", handleConnected);
      collaborationService.off("disconnected", handleDisconnected);
      collaborationService.off("error", handleError);
      collaborationService.off(
        "collaborators-updated",
        handleCollaboratorsUpdated,
      );
      collaborationService.off("comment", handleComment);
      collaborationService.off("activity", handleActivity);
    };
  }, []);

  const handleAddComment = () => {
    if (!commentText.trim() || !selectedElement) {
      toast({
        title: "Error",
        description: "Select an element and enter a comment",
        variant: "destructive",
      });
      return;
    }

    collaborationService.addComment(selectedElement, 0, 0, commentText);
    setCommentText("");
    toast({ title: "Comment added", description: "Your comment was posted" });
  };

  const handleUpdatePresence = (status: "online" | "idle" | "offline") => {
    collaborationService.updatePresence(status);
  };

  const onlineCount = collaborators.filter((c) => c.isOnline).length;

  return (
    <Card className="border border-primary/20 bg-background/75 backdrop-blur h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Collaboration
          </CardTitle>
          <div className="flex items-center gap-1">
            {isConnected ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
            <span className="text-xs text-muted-foreground">
              {connectionStatus}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="team" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="team" className="text-xs">
              Team ({onlineCount})
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-xs">
              Comments
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Team Tab */}
          <TabsContent
            value="team"
            className="flex-1 overflow-hidden flex flex-col space-y-3 pt-3"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Your Status
              </p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs flex-1"
                  onClick={() => handleUpdatePresence("online")}
                >
                  Online
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs flex-1"
                  onClick={() => handleUpdatePresence("idle")}
                >
                  Idle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs flex-1"
                  onClick={() => handleUpdatePresence("offline")}
                >
                  Offline
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Active Collaborators
              </p>
              <ScrollArea className="flex-1 -mr-4 pr-4">
                <div className="space-y-2">
                  {collaborators.map((collaborator) => (
                    <div
                      key={collaborator.userId}
                      className="flex items-center gap-2 p-2 rounded border border-primary/10 hover:border-primary/20"
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                        style={{ backgroundColor: collaborator.color }}
                      >
                        {collaborator.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {collaborator.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {collaborator.email}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <Badge
                        variant={
                          collaborator.isOnline ? "default" : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {collaborator.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent
            value="comments"
            className="flex-1 overflow-hidden flex flex-col space-y-3 pt-3"
          >
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                New Comment
              </label>
              <Input
                type="text"
                placeholder="Select element..."
                value={selectedElement || ""}
                readOnly
                className="h-8 text-xs"
              />
              <Textarea
                placeholder="Type your comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="h-16 text-xs resize-none"
              />
              <Button
                onClick={handleAddComment}
                className="w-full"
                size="sm"
                disabled={!commentText.trim()}
              >
                <Send className="w-3 h-3 mr-2" />
                Post Comment
              </Button>
            </div>

            <Separator />

            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Comments ({comments.length})
              </p>
              <ScrollArea className="flex-1 -mr-4 pr-4">
                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No comments yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-2 border border-primary/10 rounded"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold">
                            {comment.author}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(comment.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {comment.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent
            value="activity"
            className="flex-1 overflow-hidden flex flex-col pt-3"
          >
            <ScrollArea className="flex-1 -mr-4 pr-4">
              {activityLog.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No activity yet
                </p>
              ) : (
                <div className="space-y-2">
                  {activityLog.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-2 text-xs p-2 border border-primary/10 rounded"
                    >
                      <Activity className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-muted-foreground">
                          {activity.action}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {activity.description}
                        </p>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
