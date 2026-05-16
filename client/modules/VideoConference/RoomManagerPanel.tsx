import React, { useState, useEffect } from "react";
import {
  VideoConferenceRoom,
  VideoConferenceGuestLink,
  VideoConferenceRecording,
} from "./types/VideoConferenceTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  X,
  Plus,
  Copy,
  Trash2,
  Link as LinkIcon,
  Check,
  Play,
  PenLine,
} from "lucide-react";
import { guestLinkService } from "@/lib/services/GuestLinkService";
import { RecordingReplayView } from "./RecordingReplayView";
import { cn } from "@/lib/glass";

interface RoomManagerPanelProps {
  userId?: string;
  onRoomSelect?: (room: VideoConferenceRoom) => void;
  onClose?: () => void;
  tableId?: string;
  servicePeriodId?: string;
  boardId?: string;
  tableLabel?: string;
}

const RoomManagerPanel: React.FC<RoomManagerPanelProps> = ({
  userId,
  onRoomSelect,
  onClose,
  tableId: contextTableId,
  servicePeriodId: contextServicePeriodId,
  boardId: contextBoardId,
  tableLabel: contextTableLabel,
}) => {
  const [rooms, setRooms] = useState<VideoConferenceRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<VideoConferenceRoom | null>(null);
  const [guestLinks, setGuestLinks] = useState<VideoConferenceGuestLink[]>([]);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  // Form state
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [allowRecording, setAllowRecording] = useState(true);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [meetingStartTime, setMeetingStartTime] = useState("");
  const [scheduledDuration, setScheduledDuration] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [venueFilter, setVenueFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [recordings, setRecordings] = useState<VideoConferenceRecording[]>([]);
  const [replayRecording, setReplayRecording] = useState<VideoConferenceRecording | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteSending, setInviteSending] = useState<"email" | "sms" | null>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  const venues = Array.from(
    new Set(rooms.map((r) => (r as any).venueId).filter(Boolean))
  ) as string[];
  const roles = Array.from(
    new Set(rooms.map((r) => (r as any).role).filter(Boolean))
  ) as string[];
  const filteredRooms =
    venueFilter || roleFilter
      ? rooms.filter((r) => {
          const v = (r as any).venueId;
          const role = (r as any).role;
          return (
            (!venueFilter || v === venueFilter) &&
            (!roleFilter || role === roleFilter)
          );
        })
      : rooms;

  useEffect(() => {
    if (selectedRoom) {
      loadGuestLinks(selectedRoom.id);
      loadRecordings(selectedRoom.id);
    } else {
      setRecordings([]);
    }
  }, [selectedRoom]);

  const loadRecordings = async (roomId: string) => {
    try {
      const r = await fetch(`/api/video-conference/recordings/${roomId}`);
      if (!r.ok) return;
      const data = await r.json();
      const list = (data.recordings || []).map((rec: any) => ({
        id: rec.id,
        roomId: rec.room_id ?? rec.roomId,
        recordingId: rec.recording_id ?? rec.recordingId,
        recordingUrl: rec.recording_url ?? rec.recordingUrl,
        status: rec.status ?? "ready",
        createdAt: rec.created_at ?? rec.createdAt ?? 0,
        metadata: rec.metadata || {},
      }));
      setRecordings(list);
    } catch (_) {
      setRecordings([]);
    }
  };

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      const orgId =
        localStorage.getItem("org-id") ||
        localStorage.getItem("orgId") ||
        "default";
      const response = await fetch("/api/video-conference/rooms", {
        headers: { "X-Org-ID": orgId },
      });
      if (!response.ok) {
        throw new Error("Failed to load rooms");
      }
      const data = await response.json();
      const raw = Array.isArray(data) ? data : (data?.rooms ?? []);
      const list = raw.map((r: any) => ({
        ...r,
        id: r.id,
        roomName: r.room_name ?? r.roomName,
        roomDescription: r.room_description ?? r.roomDescription,
        venueId: r.venue_id ?? r.metadata?.venue_id ?? r.venueId,
        role: r.role ?? r.metadata?.role,
      }));
      setRooms(list);
    } catch (err) {
      toast.error("Failed to load rooms");
    } finally {
      setIsLoading(false);
    }
  };

  const loadGuestLinks = async (roomId: string) => {
    try {
      const links = await guestLinkService.getActiveLinks(roomId);
      setGuestLinks(links);
    } catch (err) {
      console.error("Failed to load guest links:", err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      toast.error("Please enter a room name");
      return;
    }
    try {
      setIsCreating(true);
      const orgId =
        localStorage.getItem("org-id") ||
        localStorage.getItem("orgId") ||
        "default";
      const response = await fetch("/api/video-conference/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Org-ID": orgId },
        body: JSON.stringify({
          roomName: roomName.trim(),
          roomDescription: roomDescription.trim(),
          roomType: "private",
          privacyLevel: "private",
          maxParticipants: 100,
          allowRecording,
          allowScreenShare,
          allowChat,
          ...(meetingStartTime.trim() && {
            meetingStartTime: new Date(meetingStartTime).getTime(),
          }),
          ...(scheduledDuration.trim() && {
            scheduledDuration: Math.max(0, parseInt(scheduledDuration, 10) || 0),
          }),
          ...(contextTableId != null && { tableId: contextTableId }),
          ...(contextServicePeriodId != null && {
            servicePeriodId: contextServicePeriodId,
          }),
          ...(contextBoardId != null && { boardId: contextBoardId }),
          ...(contextTableLabel != null && {
            metadata: { table_label: contextTableLabel },
          }),
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create room");
      }
      const data = await response.json();
      const raw = data.room ?? data;
      const startTime = (raw as any)?.meeting_start_time ?? raw?.meetingStartTime;
      const duration = (raw as any)?.scheduled_duration ?? raw?.scheduledDuration;
      const endTime = (raw as any)?.meeting_end_time ?? raw?.meetingEndTime;
      const newRoom = {
        ...raw,
        id: raw?.id ?? `dev-room-${Date.now()}`,
        roomName: (raw as any)?.room_name ?? raw?.roomName ?? (roomName.trim() || "New Room"),
        ...(startTime != null && { meetingStartTime: startTime }),
        ...(endTime != null && { meetingEndTime: endTime }),
        ...(duration != null && { scheduledDuration: duration }),
      } as VideoConferenceRoom;
      setRooms([...rooms, newRoom]);
      setShowCreateForm(false);
      setRoomName("");
      setRoomDescription("");
      setAllowRecording(true);
      setAllowScreenShare(true);
      setAllowChat(true);
      setMeetingStartTime("");
      setScheduledDuration("");
      toast.success("Room created successfully");
    } catch (err) {
      toast.error("Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room?")) {
      return;
    }
    try {
      const orgId =
        localStorage.getItem("org-id") ||
        localStorage.getItem("orgId") ||
        "default";
      const response = await fetch(`/api/video-conference/rooms/${roomId}`, {
        method: "DELETE",
        headers: { "X-Org-ID": orgId },
      });
      if (!response.ok) {
        throw new Error("Failed to delete room");
      }
      setRooms(rooms.filter((r) => r.id !== roomId));
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
      }
      toast.success("Room deleted successfully");
    } catch (err) {
      toast.error("Failed to delete room");
    }
  };

  const handleCopyLink = async (shareUrl: string, linkId: string) => {
    try {
      await guestLinkService.copyToClipboard(shareUrl);
      setCopiedLinkId(linkId);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to revoke this link?")) {
      return;
    }
    try {
      await guestLinkService.revokeLink(linkId, "Revoked by owner");
      setGuestLinks(guestLinks.filter((l) => l.id !== linkId));
      toast.success("Link revoked successfully");
    } catch (err) {
      toast.error("Failed to revoke link");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-[200px] bg-background border border-border/30 rounded-lg overflow-hidden h-full">
      {/* Header — updated UI: title + subtitle */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/30 bg-muted/30">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>📹</span>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              Video Conference
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create rooms, invite guests, and join with video, chat, and whiteboard.
          </p>
        </div>
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {(venues.length > 0 || roles.length > 0) && (
          <div className="flex gap-2 flex-wrap items-center">
            {venues.length > 0 && (
              <select
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                className="text-sm rounded border border-border/30 bg-background px-2 py-1 text-foreground"
              >
                <option value="">All venues</option>
                {venues.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}
            {roles.length > 0 && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-sm rounded border border-border/30 bg-background px-2 py-1 text-foreground"
              >
                <option value="">All roles</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Section: Actions */}
        <section className="space-y-2" aria-label="Actions">
          <h3 className="text-sm font-medium text-foreground/80">Quick actions</h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex-1 min-w-[160px]"
              variant={showCreateForm ? "secondary" : "default"}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Conference
            </Button>
            <Button
              variant="outline"
              className="flex-1 min-w-[160px]"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("open-panel", {
                    detail: { id: "whiteboard", panelProps: { source: "video-conference" } },
                  })
                );
                toast.success("Opening Whiteboard");
              }}
              title="Open Whiteboard"
            >
              <PenLine className="w-4 h-4 mr-2" />
              Open Whiteboard
            </Button>
          </div>
        </section>

        {/* Create Room Form */}
        {showCreateForm && (
          <Card className="border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Create New Room</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRoom} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    Room Name *
                  </label>
                  <Input
                    placeholder="Enter room name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    disabled={isCreating}
                    className="bg-background border-border/30 text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    Description
                  </label>
                  <Input
                    placeholder="Optional description"
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    disabled={isCreating}
                    className="bg-background border-border/30 text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Features
                  </label>
                  <div className="space-y-1 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowRecording}
                        onChange={(e) => setAllowRecording(e.target.checked)}
                        disabled={isCreating}
                        className="rounded"
                      />
                      <span className="text-foreground/80">Allow Recording</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowScreenShare}
                        onChange={(e) => setAllowScreenShare(e.target.checked)}
                        disabled={isCreating}
                        className="rounded"
                      />
                      <span className="text-foreground/80">Allow Screen Share</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowChat}
                        onChange={(e) => setAllowChat(e.target.checked)}
                        disabled={isCreating}
                        className="rounded"
                      />
                      <span className="text-foreground/80">Allow Chat</span>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">
                      Schedule start (optional)
                    </label>
                    <Input
                      type="datetime-local"
                      value={meetingStartTime}
                      onChange={(e) => setMeetingStartTime(e.target.value)}
                      disabled={isCreating}
                      className="bg-background border-border/30 text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">
                      Duration (minutes, optional)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 60"
                      value={scheduledDuration}
                      onChange={(e) => setScheduledDuration(e.target.value)}
                      disabled={isCreating}
                      className="bg-background border-border/30 text-foreground"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={isCreating || !roomName.trim()}
                    className="flex-1"
                  >
                    Create Room
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateForm(false)}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-foreground/60">Loading rooms...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && rooms.length === 0 && !showCreateForm && (
          <div className="flex items-center justify-center py-8 px-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-foreground/60">No conference rooms yet</p>
              <p className="text-xs text-foreground/50">Create one to get started</p>
            </div>
          </div>
        )}

        {/* Rooms List */}
        {!isLoading && filteredRooms.length > 0 && (
          <section className="space-y-3" aria-label="Conference rooms">
            <h3 className="text-sm font-medium text-foreground/80">Conference Rooms</h3>
            <div className="space-y-2">
              {filteredRooms.map((room, index) => (
                <Card
                  key={room.id ?? `room-${index}`}
                className={cn(
                  "border-border/30 cursor-pointer transition-all",
                  selectedRoom?.id === room.id && "ring-2 ring-blue-500"
                )}
                onClick={() => setSelectedRoom(room)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{room.roomName}</h4>
                      {room.roomDescription && (
                        <p className="text-xs text-foreground/60 mt-1">
                          {room.roomDescription}
                        </p>
                      )}
                      {(room.meetingStartTime ?? (room as any).meeting_start_time) && (
                        <p className="text-xs text-foreground/50 mt-1">
                          📅 {new Date((room.meetingStartTime ?? (room as any).meeting_start_time) as number).toLocaleString()}
                          {(room.scheduledDuration ?? (room as any).scheduled_duration) && (
                            <> ({(room.scheduledDuration ?? (room as any).scheduled_duration) as number} min)</>
                          )}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoom(room.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                  <div className="flex gap-1 flex-wrap text-xs">
                    {room.allowRecording && (
                      <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-700">
                        Recording
                      </span>
                    )}
                    {room.allowScreenShare && (
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-blue-700">
                        Screen Share
                      </span>
                    )}
                    {room.allowChat && (
                      <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-700">
                        Chat
                      </span>
                    )}
                  </div>
                  {selectedRoom?.id === room.id && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onRoomSelect) {
                          onRoomSelect(room);
                        }
                      }}
                      className="w-full mt-2"
                      size="sm"
                    >
                      <span>Join</span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            </div>
          </section>
        )}

        {!isLoading && rooms.length > 0 && filteredRooms.length === 0 && (
          <p className="text-sm text-foreground/60 py-4 text-center">
            No rooms match the selected filters.
          </p>
        )}
      </div>

      {/* Guest Links Panel */}
      {selectedRoom && (
        <div className="border-t border-border/30 p-4 space-y-3 bg-background/50">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground text-sm">Guest Links</h4>
            <Button
              size="sm"
              onClick={async () => {
                try {
                  const result = await guestLinkService.generateShareLink(
                    selectedRoom.id,
                    { maxUses: 10, expiresIn: 7 * 24 * 60 * 60 * 1000 }
                  );
                  setGuestLinks([...guestLinks, result.link]);
                  toast.success("Guest link created (7 days)");
                } catch (err) {
                  toast.error("Failed to create guest link");
                }
              }}
            >
              <LinkIcon className="w-3 h-3 mr-1" />
              New Link
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  const result = await guestLinkService.generateShareLink(
                    selectedRoom.id,
                    { maxUses: 10, expiresIn: 2 * 60 * 60 * 1000 }
                  );
                  setGuestLinks([...guestLinks, result.link]);
                  toast.success("Short-lived link created (2 hours)");
                } catch (err) {
                  toast.error("Failed to create guest link");
                }
              }}
              title="Valid for this service only"
            >
              2h
            </Button>
          </div>

          {guestLinks.length === 0 ? (
            <p className="text-xs text-foreground/60">No guest links yet</p>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {guestLinks.map((link) => {
                const token = link.guestToken ?? (link as any).token ?? "";
                return (
                <div
                  key={link.id}
                  className="p-2 rounded bg-background border border-border/30 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-foreground/70 truncate flex-1">
                      {token ? `${token.slice(0, 8)}...` : "—"}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!token}
                        onClick={() =>
                          token && handleCopyLink(
                            `/conference/join/${token}`,
                            link.id
                          )
                        }
                      >
                        {copiedLinkId === link.id ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevokeLink(link.id)}
                      >
                        <X className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-foreground/60">
                    <span>
                      Uses: {link.currentUses}/{link.maxUses || "∞"}
                    </span>
                    {link.expiresAt && (
                      <span>
                        Expires: {new Date(link.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}

          {/* Invite external by email / SMS (cloud) */}
          <div className="border-t border-border/30 pt-4 space-y-2">
            <h4 className="font-medium text-foreground text-sm">Invite via cloud</h4>
              <p className="text-xs text-foreground/60">Send join link by email or SMS to someone outside the company.</p>
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-8 text-xs w-40 text-foreground bg-background"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={inviteSending !== null}
                  onClick={async () => {
                    const email = inviteEmail.trim();
                    if (!email) {
                      toast.error("Enter an email address");
                      return;
                    }
                    setInviteSending("email");
                    try {
                      let shareUrl =
                        guestLinks.length > 0
                          ? `${typeof window !== "undefined" ? window.location.origin : ""}/conference/join/${guestLinks[0].guestToken ?? (guestLinks[0] as any).token ?? ""}`
                          : null;
                      if (!shareUrl && selectedRoom) {
                        const result = await guestLinkService.generateShareLink(selectedRoom.id, {
                          maxUses: 10,
                          expiresIn: 7 * 24 * 60 * 60 * 1000,
                        });
                        shareUrl = result.shareUrl;
                        setGuestLinks((prev) => [...prev, result.link]);
                      }
                      if (!shareUrl) {
                        toast.error("Could not create share link");
                        return;
                      }
                      const result = await guestLinkService.sendInviteByEmail(
                        selectedRoom.id,
                        selectedRoom.roomName || "Conference",
                        shareUrl,
                        email,
                      );
                      if (result.success) {
                        toast.success(`Invite sent to ${email}`);
                        setInviteEmail("");
                      } else {
                        toast.error(result.error ?? "Failed to send invite");
                      }
                    } finally {
                      setInviteSending(null);
                    }
                  }}
                >
                  {inviteSending === "email" ? "Sending…" : "Send invite (email)"}
                </Button>
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  className="h-8 text-xs w-36 text-foreground bg-background"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={inviteSending !== null}
                  onClick={async () => {
                    const phone = invitePhone.trim();
                    if (!phone) {
                      toast.error("Enter a phone number");
                      return;
                    }
                    setInviteSending("sms");
                    try {
                      let shareUrl =
                        guestLinks.length > 0
                          ? `${typeof window !== "undefined" ? window.location.origin : ""}/conference/join/${guestLinks[0].guestToken ?? (guestLinks[0] as any).token ?? ""}`
                          : null;
                      if (!shareUrl && selectedRoom) {
                        const result = await guestLinkService.generateShareLink(selectedRoom.id, {
                          maxUses: 10,
                          expiresIn: 7 * 24 * 60 * 60 * 1000,
                        });
                        shareUrl = result.shareUrl;
                        setGuestLinks((prev) => [...prev, result.link]);
                      }
                      if (!shareUrl) {
                        toast.error("Could not create share link");
                        return;
                      }
                      const result = await guestLinkService.sendInviteBySms(
                        selectedRoom.id,
                        selectedRoom.roomName || "Conference",
                        shareUrl,
                        phone,
                      );
                      if (result.success) {
                        toast.success(`Invite sent to ${phone}`);
                        setInvitePhone("");
                      } else {
                        toast.error(result.error ?? "Failed to send invite");
                      }
                    } finally {
                      setInviteSending(null);
                    }
                  }}
                >
                  {inviteSending === "sms" ? "Sending…" : "Send invite (SMS)"}
                </Button>
              </div>
            </div>

          {/* Recordings */}
          {selectedRoom && (
            <div className="border-t border-border/30 pt-4 space-y-2">
              <h4 className="font-medium text-foreground text-sm">Recordings</h4>
              {recordings.length === 0 ? (
                <p className="text-xs text-foreground/60">No recordings yet</p>
              ) : (
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {recordings.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between gap-2 p-2 rounded bg-background border border-border/30 text-xs"
                    >
                      <span className="text-foreground/80 truncate flex-1">
                        {(rec.metadata as any)?.label ?? rec.recordingId}
                        {(rec.metadata as any)?.type === "training" && " (Training)"}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplayRecording(rec)}
                        title="Play with caption language option"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {replayRecording && (
        <RecordingReplayView
          recording={replayRecording}
          onClose={() => setReplayRecording(null)}
        />
      )}
    </div>
  );
};

export default RoomManagerPanel;
