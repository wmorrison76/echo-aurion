/**
 * Presence Panel Component
 *
 * Team presence tracking (online/away/busy/offline)
 * All text is i18n-ready with translation keys
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Circle, Clock, MapPin, Activity, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/glass";

interface PresenceStatus {
  userId: string;
  userName: string;
  status: "online" | "away" | "busy" | "offline";
  statusKey?: string; // i18n key: "presence.status.online"
  message?: string;
  messageKey?: string; // i18n key
  location?: string;
  locationKey?: string; // i18n key
  lastSeen: string;
  activity?: string;
  activityKey?: string; // i18n key
}

export default function PresencePanel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [presenceStatuses, setPresenceStatuses] = useState<PresenceStatus[]>(
    [],
  );
  const [currentStatus, setCurrentStatus] = useState<PresenceStatus | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    loadPresenceStatuses();
    loadCurrentStatus();
  }, []);

  const loadPresenceStatuses = async () => {
    try {
      const response = await fetch("/api/collaboration/presence");
      const data = await response.json();

      if (data.success) {
        setPresenceStatuses(data.data || []);
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to load presence statuses",
        variant: "destructive",
      });
    }
  };

  const loadCurrentStatus = async () => {
    try {
      // In production, fetch current user's status
      const mockStatus: PresenceStatus = {
        userId: "current-user",
        userName: "You",
        status: "online",
        statusKey: "presence.status.online",
        lastSeen: new Date().toISOString(),
      };
      setCurrentStatus(mockStatus);
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to load current status",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (
    status: "online" | "away" | "busy" | "offline",
    message?: string,
  ) => {
    try {
      const response = await fetch("/api/collaboration/presence/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          statusKey: `presence.status.${status}`, // i18n key
          message,
          messageKey: undefined, // User messages don't have i18n keys
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentStatus(data.data);
        await loadPresenceStatuses();
        toast({
          title: t("presence.updated") || "Status Updated",
          description:
            t("presence.updated.description") ||
            "Your presence status has been updated",
        });
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-500";
      case "away":
        return "text-yellow-500";
      case "busy":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    return t(`presence.status.${status}`) || status;
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-8 h-8 text-primary" />
              {t("presence.title") || "Team Presence"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("presence.description") || "See who's online and available"}
            </p>
          </div>
        </div>

        {/* Current Status */}
        {currentStatus && (
          <Card>
            <CardHeader>
              <CardTitle>
                {t("presence.your.status") || "Your Status"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Select
                  value={currentStatus.status}
                  onValueChange={(value) => handleStatusUpdate(value as any)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">
                      <div className="flex items-center gap-2">
                        <Circle
                          className={cn(
                            "w-3 h-3 fill-green-500 text-green-500",
                          )}
                        />
                        {t("presence.status.online") || "Online"}
                      </div>
                    </SelectItem>
                    <SelectItem value="away">
                      <div className="flex items-center gap-2">
                        <Circle
                          className={cn(
                            "w-3 h-3 fill-yellow-500 text-yellow-500",
                          )}
                        />
                        {t("presence.status.away") || "Away"}
                      </div>
                    </SelectItem>
                    <SelectItem value="busy">
                      <div className="flex items-center gap-2">
                        <Circle
                          className={cn("w-3 h-3 fill-red-500 text-red-500")}
                        />
                        {t("presence.status.busy") || "Busy"}
                      </div>
                    </SelectItem>
                    <SelectItem value="offline">
                      <div className="flex items-center gap-2">
                        <Circle
                          className={cn(
                            "w-3 h-3 fill-muted-foreground text-muted-foreground",
                          )}
                        />
                        {t("presence.status.offline") || "Offline"}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder={
                    t("presence.message.placeholder") ||
                    "Status message (optional)"
                  }
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  className="flex-1"
                  onBlur={() => {
                    if (statusMessage) {
                      handleStatusUpdate(currentStatus.status, statusMessage);
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t("presence.team.members") || "Team Members"}
            </CardTitle>
            <CardDescription>
              {presenceStatuses.length}{" "}
              {t("presence.member.count") || "member(s)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {presenceStatuses.map((presence) => (
                <div
                  key={presence.userId}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback>
                          {presence.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Circle
                        className={cn(
                          "absolute bottom-0 right-0 w-3 h-3 border-2 border-background rounded-full",
                          getStatusColor(presence.status),
                          presence.status === "offline" &&
                            "fill-muted-foreground",
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">
                          {presence.userName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getStatusLabel(presence.status)}
                        </Badge>
                      </div>
                      {presence.message && (
                        <p className="text-sm text-muted-foreground truncate">
                          {presence.message}
                        </p>
                      )}
                      {presence.activity && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Activity className="w-3 h-3" />
                          {presence.activity}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {presence.status === "offline"
                          ? t("presence.last.seen") +
                            " " +
                            formatDistanceToNow(new Date(presence.lastSeen), {
                              addSuffix: true,
                            })
                          : t("presence.active.now") || "Active now"}
                      </p>
                    </div>
                  </div>
                  {presence.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {presence.location}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
