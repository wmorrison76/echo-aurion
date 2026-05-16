/**
 * Video Conference module – panel entry point.
 * Contract: panelId (string), onClose (function) optional; isEmbedded optional.
 * When no room is selected, shows RoomManagerPanel (create/join). When a room is
 * selected, fetches token and shows VideoConferencePanel. Back button returns to room list.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { YieldProvider } from "./context/YieldContext";
import { AppDataProvider } from "./context/AppDataContext";
import { PageToolbarProvider } from "./context/PageToolbarContext";
import { CollaborationProvider } from "./context/CollaborationContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { osBus } from "@/lib/os-bus";
import type { VideoConferenceRoom } from "./types/VideoConferenceTypes";
import RoomManagerPanel from "./RoomManagerPanel";
import VideoConferencePanel from "./VideoConferencePanel";

const queryClient = new QueryClient();

/** Catches render errors so the panel shows a message instead of staying blank */
class VideoConferenceErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; eventId: string | null }
> {
  state = { error: null as Error | null, eventId: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      "[VideoConference] Render error:",
      error,
      info.componentStack,
    );
    const eventId = Sentry.captureException(error, {
      contexts: {
        react_error_boundary: {
          module: "VideoConference",
          componentStack: info.componentStack || "N/A",
        },
      },
      tags: {
        error_boundary: "VideoConferenceErrorBoundary",
        module: "VideoConference",
        error_type: "render_error",
      },
      fingerprint: ["videoconference-render-error", error.message],
    });
    this.setState({ eventId });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6 rounded border border-amber-500/70 bg-amber-500/15 text-amber-900 dark:text-amber-200">
          <p className="font-semibold mb-2">Video Conference error</p>
          <p className="text-sm mb-1 max-w-md break-words">
            {this.state.error.message}
          </p>
          {this.state.eventId && (
            <p className="text-xs opacity-40 font-mono mb-4">
              Error ID: {this.state.eventId}
            </p>
          )}
          <button
            type="button"
            className="px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-amber-950 hover:bg-amber-600"
            onClick={() => this.setState({ error: null, eventId: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Normalize API room (snake_case) to VideoConferenceRoom (camelCase) if needed */
function normalizeRoom(r: Record<string, unknown>): VideoConferenceRoom {
  if ("dailyRoomName" in r && typeof (r as any).dailyRoomName === "string") {
    return r as VideoConferenceRoom;
  }
  return {
    id: String(r.id ?? ""),
    dailyRoomName: String((r as any).daily_room_name ?? r.dailyRoomName ?? ""),
    roomName: String((r as any).room_name ?? r.roomName ?? "Room"),
    roomDescription:
      (r as any).room_description != null
        ? String((r as any).room_description)
        : (r as any).roomDescription,
    roomType:
      (((r as any).room_type ??
        (r as any).roomType) as VideoConferenceRoom["roomType"]) ?? "private",
    privacyLevel:
      (((r as any).privacy_level ??
        (r as any).privacyLevel) as VideoConferenceRoom["privacyLevel"]) ??
      "private",
    maxParticipants: Number(
      (r as any).max_participants ?? (r as any).maxParticipants ?? 100,
    ),
    allowRecording: Boolean(
      (r as any).allow_recording ?? (r as any).allowRecording ?? true,
    ),
    allowScreenShare: Boolean(
      (r as any).allow_screen_share ?? (r as any).allowScreenShare ?? true,
    ),
    allowChat: Boolean((r as any).allow_chat ?? (r as any).allowChat ?? true),
    ownerId: String((r as any).owner_id ?? (r as any).ownerId ?? ""),
    createdBy: String((r as any).created_by ?? (r as any).createdBy ?? ""),
    orgId:
      (r as any).org_id != null ? String((r as any).org_id) : (r as any).orgId,
    boardId:
      (r as any).board_id != null
        ? String((r as any).board_id)
        : (r as any).boardId,
    tableId:
      (r as any).table_id != null
        ? String((r as any).table_id)
        : ((r as any).tableId ??
          (typeof (r as any).metadata === "object" &&
          (r as any).metadata?.table_id != null
            ? String((r as any).metadata.table_id)
            : undefined)),
    servicePeriodId:
      (r as any).service_period_id != null
        ? String((r as any).service_period_id)
        : ((r as any).servicePeriodId ??
          (typeof (r as any).metadata === "object" &&
          (r as any).metadata?.service_period_id != null
            ? String((r as any).metadata.service_period_id)
            : undefined)),
    venueId:
      (r as any).venue_id != null
        ? String((r as any).venue_id)
        : ((r as any).venueId ??
          (typeof (r as any).metadata === "object" &&
          (r as any).metadata?.venue_id != null
            ? String((r as any).metadata.venue_id)
            : undefined)),
    role:
      (r as any).role ??
      (typeof (r as any).metadata === "object"
        ? (r as any).metadata?.role
        : undefined),
    metadata:
      typeof (r as any).metadata === "object" ? (r as any).metadata : undefined,
    isActive: Boolean((r as any).is_active ?? (r as any).isActive ?? true),
    createdAt: Number((r as any).created_at ?? (r as any).createdAt ?? 0),
    updatedAt: Number((r as any).updated_at ?? (r as any).updatedAt ?? 0),
  };
}

export interface VideoConferenceModuleProps {
  /** Panel instance id (e.g. "video"); defaults to "video" when opened as system/module panel */
  panelId?: string;
  /** Called when the user closes the panel */
  onClose?: () => void;
  /** When true, layout fits a floating panel (no max-width) */
  isEmbedded?: boolean;
  /** Deep-link context from Phase 13 / Maestro / BEO */
  tableId?: string;
  servicePeriodId?: string;
  boardId?: string;
  tableLabel?: string;
}

export default function VideoConferenceModule({
  panelId = "video",
  onClose,
  isEmbedded = false,
  tableId: contextTableId,
  servicePeriodId: contextServicePeriodId,
  boardId: contextBoardId,
  tableLabel: contextTableLabel,
}: VideoConferenceModuleProps) {
  const [selectedRoom, setSelectedRoom] = useState<VideoConferenceRoom | null>(
    null,
  );
  const [dailyToken, setDailyToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const currentUserId =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("user-id") ||
        localStorage.getItem("userId") ||
        undefined
      : undefined;
  const hasEmittedJoinRef = useRef(false);

  useEffect(() => {
    if (selectedRoom && dailyToken && !hasEmittedJoinRef.current) {
      hasEmittedJoinRef.current = true;
      try {
        osBus.emit("audit:entry", {
          entry: {
            type: "video_room_join",
            roomId: selectedRoom.id,
            roomName: selectedRoom.roomName,
            timestamp: Date.now(),
          },
          source: "VideoConference",
        });
      } catch (_) {}
    }
    if (!selectedRoom) hasEmittedJoinRef.current = false;
  }, [selectedRoom, dailyToken]);

  const handleRoomSelect = useCallback(
    async (room: VideoConferenceRoom | Record<string, unknown>) => {
      const r = normalizeRoom(room as Record<string, unknown>);
      setTokenError(null);
      setIsJoining(true);
      try {
        const orgId =
          localStorage.getItem("org-id") ||
          localStorage.getItem("orgId") ||
          "default";
        const userId =
          localStorage.getItem("user-id") ||
          localStorage.getItem("userId") ||
          undefined;
        const userName =
          localStorage.getItem("user-name") ||
          localStorage.getItem("userName") ||
          "Guest";
        const response = await fetch("/api/video-conference/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Org-ID": orgId,
          },
          body: JSON.stringify({
            roomId: r.id,
            userId,
            userName,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
          const msg = data?.error || "Failed to join room";
          setTokenError(msg);
          toast.error(msg);
          return;
        }
        setDailyToken(data.token ?? null);
        setSelectedRoom(
          normalizeRoom((data.room ?? room) as Record<string, unknown>),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to join room";
        setTokenError(msg);
        toast.error(msg);
      } finally {
        setIsJoining(false);
      }
    },
    [],
  );

  const handleBackToRooms = useCallback(() => {
    if (selectedRoom) {
      try {
        osBus.emit("audit:entry", {
          entry: {
            type: "video_room_leave",
            roomId: selectedRoom.id,
            roomName: selectedRoom.roomName,
            timestamp: Date.now(),
          },
          source: "VideoConference",
        });
      } catch (_) {}
    }
    setSelectedRoom(null);
    setDailyToken(null);
    setTokenError(null);
  }, [selectedRoom]);

  const rootStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    minHeight: isEmbedded ? 0 : 400,
    flex: "1 1 auto",
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
  };

  const content = !selectedRoom ? (
    <div
      className="relative flex flex-col w-full h-full min-h-0 overflow-hidden"
      style={rootStyle}
    >
      <div className="flex-shrink-0 px-3 py-2 border-b border-border/30 bg-background/80 text-foreground text-sm font-medium">
        Video Conference
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-auto">
        <VideoConferenceErrorBoundary>
          <RoomManagerPanel
            onRoomSelect={handleRoomSelect}
            onClose={onClose}
            tableId={contextTableId}
            servicePeriodId={contextServicePeriodId}
            boardId={contextBoardId}
            tableLabel={contextTableLabel}
          />
        </VideoConferenceErrorBoundary>
      </div>
      {isJoining && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-foreground/80">Joining room…</p>
          </div>
        </div>
      )}
      {tokenError && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/30 text-destructive text-sm">
          {tokenError}
        </div>
      )}
    </div>
  ) : (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden" style={rootStyle}>
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/30 bg-background/50 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToRooms}
          className="gap-1"
          aria-label="Back to rooms"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to rooms
        </Button>
      </div>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <VideoConferencePanel
          roomId={selectedRoom.id}
          room={selectedRoom}
          dailyToken={dailyToken ?? undefined}
          onClose={onClose}
          isEmbedded={isEmbedded}
          userId={currentUserId}
        />
      </div>
    </div>
  );

  return (
    <div
      className="w-full h-full flex flex-col min-h-0"
      style={{ flex: "1 1 auto", minHeight: 0 }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <LanguageProvider>
            <AuthProvider>
              <YieldProvider>
                <AppDataProvider>
                  <PageToolbarProvider>
                    <CollaborationProvider>{content}</CollaborationProvider>
                  </PageToolbarProvider>
                </AppDataProvider>
              </YieldProvider>
            </AuthProvider>
          </LanguageProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
}
