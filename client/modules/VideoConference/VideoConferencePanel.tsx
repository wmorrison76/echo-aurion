import React, { useState, useEffect, useRef } from "react";
import {
  VideoConferenceRoom,
  VideoConferenceParticipant,
} from "./types/VideoConferenceTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  X,
  Copy,
  Share2,
  Settings,
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share,
  StopCircle,
  Maximize2,
  Minimize2,
  Send,
  PenLine,
  FileText,
  MoreVertical,
  Info,
  LayoutGrid,
  User,
} from "lucide-react";
import { guestLinkService } from "@/lib/services/GuestLinkService";
import { useVideoConferenceCollaboration } from "@/hooks/useVideoConferenceCollaboration";
import { osBus } from "@/lib/os-bus";
import { cn } from "@/lib/glass";
interface VideoConferencePanelProps {
  roomId?: string;
  room?: VideoConferenceRoom;
  dailyToken?: string;
  onClose?: () => void;
  isEmbedded?: boolean;
  maxWidth?: string;
  userId?: string;
}

interface DailyFrame {
  addEventListener?: (event: string, callback: Function) => void;
  removeEventListener?: (event: string, callback: Function) => void;
  updateParticipantCount?: (count: number) => void;
}
type DailyCallFrame = {
  setLocalAudio: (enabled: boolean) => void;
  setLocalVideo: (enabled: boolean) => void;
  iframe: () => HTMLIFrameElement | null;
  on: (event: string, cb: (e?: any) => void) => void;
  destroy: () => void;
  join: (opts?: { url?: string }) => Promise<void>;
};

const VideoConferencePanel: React.FC<VideoConferencePanelProps> = ({
  roomId = "",
  room,
  dailyToken,
  onClose,
  isEmbedded = false,
  maxWidth,
  userId: currentUserId,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dailyFrameRef = useRef<DailyFrame | null>(null);
  const dailyCallFrameRef = useRef<DailyCallFrame | null>(null);
  const dailyContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<
    VideoConferenceParticipant[]
  >([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [guestLink, setGuestLink] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteSending, setInviteSending] = useState<"email" | "sms" | null>(null);
  const [pendingRequests, setPendingRequests] = useState<
    { id: string; guest_name: string; guest_email?: string }[]
  >([]);
  const [captionLanguage, setCaptionLanguage] = useState<string>(() =>
    typeof localStorage !== "undefined"
      ? localStorage.getItem("video-caption-language") || "en"
      : "en",
  );
  const [liveCaptionText, setLiveCaptionText] = useState<string>("");
  const [displayedCaptionText, setDisplayedCaptionText] = useState<string>("");
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const lastTranscriptAppendRef = useRef<string>("");
  const captionTranslateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"participants" | "transcript" | "share" | "chat" | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const preJoinOptionsRef = useRef<{ startVideoOff: boolean; startAudioOff: boolean }>({ startVideoOff: false, startAudioOff: false });
  const sidebarOpen = sidebarTab !== null;
  const [showMeetingInfo, setShowMeetingInfo] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: string; text: string; sender: string; time: number }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [viewMode, setViewMode] = useState<"gallery" | "speaker">("gallery");
  const [preJoinComplete, setPreJoinComplete] = useState(false);
  const [preJoinOptions, setPreJoinOptions] = useState<{ startVideoOff: boolean; startAudioOff: boolean }>({ startVideoOff: false, startAudioOff: false });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackQuality, setFeedbackQuality] = useState<number | "">("");
  const [feedbackIssues, setFeedbackIssues] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const isOrganizer = !!(
    room &&
    currentUserId &&
    room.ownerId === currentUserId
  );
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [useDailySdk, setUseDailySdk] = useState(false);

  // Screen Wake Lock: keep computer from sleeping/logging out during active conference
  useEffect(() => {
    if (!roomId || !dailyToken || isLoading) return;
    const requestWakeLock = async () => {
      try {
        if (typeof navigator !== "undefined" && navigator.wakeLock) {
          const sentinel = await navigator.wakeLock.request("screen");
          wakeLockRef.current = sentinel;
          setWakeLockActive(true);
          sentinel.addEventListener("release", () => {
            wakeLockRef.current = null;
            setWakeLockActive(false);
          });
        }
      } catch (_) {}
    };
    requestWakeLock();
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      setWakeLockActive(false);
    };
  }, [roomId, dailyToken, isLoading]);

  const { handleParticipantJoined, handleParticipantLeft } =
    useVideoConferenceCollaboration({
      roomId: roomId || "default",
      sessionId: roomId || "default",
      enabled: !!roomId,
    });

  const onParticipantJoined = (event: any) => {
    const participant = event.data?.participant;
    if (participant) {
      setParticipants((prev) => {
        const exists = prev.some((p) => p.id === participant.id);
        if (!exists) return [...prev, participant];
        return prev;
      });
      handleParticipantJoined(participant);
    }
  };
  const onParticipantLeft = (event: any) => {
    const participant = event.data?.participant;
    if (participant) {
      setParticipants((prev) => prev.filter((p) => p.id !== participant.id));
      handleParticipantLeft(participant);
    }
  };

  const initializeDailyFrame = async () => {
    try {
      setIsLoading(true);
      if (!room || !dailyToken) {
        setError(
          "Missing room or token. Create a room from the Video Conference hub."
        );
        setIsLoading(false);
        return;
      }
      const dailyCallUrl = `https://${room.dailyRoomName}.daily.co/?token=${dailyToken}`;
      const container = dailyContainerRef.current;
      if (!container) throw new Error("Video container not found");

      setUseDailySdk(false);
      try {
        const Daily = (await import("@daily-co/daily-js")).default;
        const callFrame = Daily.createFrame(container, {
          url: dailyCallUrl,
          iframeStyle: { width: "100%", height: "100%", border: "none" },
        }) as unknown as DailyCallFrame;
        dailyCallFrameRef.current = callFrame;
        callFrame.on("participant-joined", onParticipantJoined);
        callFrame.on("participant-left", onParticipantLeft);
        callFrame.on("participant-updated", (ev: any) => {
          const p = ev?.participant;
          if (p?.local) {
            if (typeof p.audio === "boolean") setIsMuted(!p.audio);
            if (typeof p.video === "boolean") setIsVideoOff(!p.video);
          }
        });
        callFrame.on("transcription-message", (ev: any) => {
          const text = ev?.message?.text ?? ev?.text ?? "";
          if (text) setLiveCaptionText(String(text));
        });
        const opts = preJoinOptionsRef.current;
        await callFrame.join({ startVideoOff: opts.startVideoOff, startAudioOff: opts.startAudioOff });
        setUseDailySdk(true);
        try {
          (callFrame as any).setLocalVideo?.(!opts.startVideoOff);
          (callFrame as any).setLocalAudio?.(!opts.startAudioOff);
        } catch (_) {}
      } catch (sdkErr) {
        console.debug("[VideoConference] Daily SDK failed, using iframe fallback:", sdkErr);
        dailyCallFrameRef.current = null;
        const iframeElement = iframeRef.current;
        if (iframeElement) {
          iframeElement.src = dailyCallUrl;
          dailyFrameRef.current = iframeElement as unknown as DailyFrame;
          if (dailyFrameRef.current.addEventListener) {
            dailyFrameRef.current.addEventListener(
              "participant-joined",
              onParticipantJoined
            );
            dailyFrameRef.current.addEventListener(
              "participant-left",
              onParticipantLeft
            );
          }
        }
      }
      setIsLoading(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to initialize video conference";
      setError(message);
      toast.error(message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!roomId) {
      setError(
        "No room selected. Create or join a room from the Video Conference hub."
      );
      setIsLoading(false);
      return;
    }
    if (!dailyToken || !preJoinComplete) {
      if (dailyToken) setIsLoading(false);
      return;
    }
    initializeDailyFrame();
    return () => {
      const callFrame = dailyCallFrameRef.current;
      if (callFrame) {
        try {
          callFrame.destroy();
        } catch (_) {}
        dailyCallFrameRef.current = null;
      }
      if (dailyFrameRef.current && iframeRef.current) {
        dailyFrameRef.current.removeEventListener?.(
          "participant-joined",
          onParticipantJoined
        );
        dailyFrameRef.current.removeEventListener?.(
          "participant-left",
          onParticipantLeft
        );
      }
    };
  }, [roomId, dailyToken, preJoinComplete]);

  useEffect(() => {
    if (!roomId) return;
    const load = async () => {
      try {
        const r = await fetch(
          `/api/video-conference/rooms/${roomId}/join-requests`
        );
        if (r.ok) {
          const list = await r.json();
          setPendingRequests(Array.isArray(list) ? list : []);
        }
      } catch (_) {}
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [roomId]);

  // Accumulate live captions into transcript (avoid duplicate appends)
  useEffect(() => {
    if (!liveCaptionText.trim()) return;
    if (lastTranscriptAppendRef.current === liveCaptionText) return;
    lastTranscriptAppendRef.current = liveCaptionText;
    setTranscriptLines((prev) => [...prev, liveCaptionText.trim()]);
  }, [liveCaptionText]);

  // Keyboard shortcuts: M mute, V video, Escape close modal/sidebar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === "Escape") {
        setShowMoreMenu(false);
        setShowMeetingInfo(false);
        setSidebarTab((t) => (t ? null : t));
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        const callFrame = dailyCallFrameRef.current;
        if (callFrame && typeof (callFrame as any).setLocalAudio === "function") {
          setIsMuted((m) => {
            const next = !m;
            (callFrame as any).setLocalAudio(next);
            return next;
          });
        }
        return;
      }
      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        const callFrame = dailyCallFrameRef.current;
        if (callFrame && typeof (callFrame as any).setLocalVideo === "function") {
          setIsVideoOff((v) => {
            const next = !v;
            (callFrame as any).setLocalVideo(next);
            return next;
          });
        }
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Display captions in user's preferred language: translate when not English
  useEffect(() => {
    if (captionLanguage === "en") {
      setDisplayedCaptionText(liveCaptionText);
      return;
    }
    if (captionTranslateTimeoutRef.current) clearTimeout(captionTranslateTimeoutRef.current);
    if (!liveCaptionText.trim()) {
      setDisplayedCaptionText("");
      return;
    }
    const text = liveCaptionText;
    captionTranslateTimeoutRef.current = setTimeout(async () => {
      try {
        const r = await fetch("/api/video-conference/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, targetLanguage: captionLanguage }),
        });
        if (r.ok) {
          const data = await r.json();
          setDisplayedCaptionText((data.translatedText ?? text) as string);
        } else {
          setDisplayedCaptionText(text);
        }
      } catch {
        setDisplayedCaptionText(text);
      }
      captionTranslateTimeoutRef.current = null;
    }, 300);
    return () => {
      if (captionTranslateTimeoutRef.current) {
        clearTimeout(captionTranslateTimeoutRef.current);
        captionTranslateTimeoutRef.current = null;
      }
    };
  }, [liveCaptionText, captionLanguage]);

  const handleApproveRequest = async (requestId: string) => {
    try {
      const r = await fetch(
        `/api/video-conference/join-requests/${requestId}/approve`,
        { method: "POST" }
      );
      if (r.ok) {
        setPendingRequests((prev) => prev.filter((p) => p.id !== requestId));
        toast.success("Guest approved");
      } else toast.error("Failed to approve");
    } catch (_) {
      toast.error("Failed to approve");
    }
  };

  const handleGenerateGuestLink = async () => {
    if (!roomId) {
      toast.error("No room selected");
      return;
    }
    try {
      const result = await guestLinkService.generateShareLink(roomId, {
        maxUses: 10,
        expiresIn: 7 * 24 * 60 * 60 * 1000,
      });
      setGuestLink(result.shareUrl);
      toast.success("Guest link generated successfully");
    } catch (err) {
      toast.error("Failed to generate guest link");
    }
  };

  const handleCopyLink = async () => {
    if (guestLink) {
      try {
        await guestLinkService.copyToClipboard(guestLink);
        setCopiedToClipboard(true);
        toast.success("Link copied to clipboard");
        setTimeout(() => setCopiedToClipboard(false), 2000);
      } catch (err) {
        toast.error("Failed to copy link");
      }
    }
  };

  const handleSendInviteByEmail = async () => {
    const email = inviteEmail.trim();
    if (!email || !guestLink || !roomId) {
      toast.error("Enter an email address");
      return;
    }
    setInviteSending("email");
    try {
      const result = await guestLinkService.sendInviteByEmail(
        roomId,
        room?.roomName || "Conference",
        guestLink,
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
  };

  const handleSendInviteBySms = async () => {
    const phone = invitePhone.trim();
    if (!phone || !guestLink || !roomId) {
      toast.error("Enter a phone number");
      return;
    }
    setInviteSending("sms");
    try {
      const result = await guestLinkService.sendInviteBySms(
        roomId,
        room?.roomName || "Conference",
        guestLink,
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
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    const callFrame = dailyCallFrameRef.current;
    try {
      if (callFrame && typeof (callFrame as any).setLocalAudio === "function") {
        (callFrame as any).setLocalAudio(next);
      }
    } catch (e) {
      console.warn("[VideoConference] setLocalAudio failed:", e);
      toast.error("Could not toggle microphone. Use the controls in the video window.");
      return;
    }
    setIsMuted(next);
    toast.success(next ? "Microphone muted" : "Microphone enabled");
  };

  const handleToggleVideo = () => {
    const next = !isVideoOff;
    const callFrame = dailyCallFrameRef.current;
    try {
      if (callFrame && typeof (callFrame as any).setLocalVideo === "function") {
        (callFrame as any).setLocalVideo(!next);
      } else if (callFrame && typeof (callFrame as any).startCamera === "function") {
        if (next) (callFrame as any).stopCamera?.();
        else (callFrame as any).startCamera?.();
      }
    } catch (e) {
      console.warn("[VideoConference] setLocalVideo failed:", e);
      toast.error("Could not toggle camera. Try allowing camera in the video window.");
      return;
    }
    setIsVideoOff(next);
    toast.success(next ? "Camera disabled" : "Camera enabled");
  };

  const handleToggleRecording = () => {
    setIsRecording((prev) => {
      toast.success(prev ? "Recording stopped" : "Recording started");
      return !prev;
    });
  };

  const handleFullScreen = () => {
    const iframeEl =
      dailyCallFrameRef.current?.iframe?.() ?? iframeRef.current;
    if (!isFullScreen && iframeEl?.requestFullscreen) {
      iframeEl.requestFullscreen();
      setIsFullScreen(true);
    } else if (isFullScreen && document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const handleOpenWhiteboard = () => {
    window.dispatchEvent(
      new CustomEvent("open-panel", {
        detail: {
          id: "whiteboard",
          panelProps: {
            source: "video-conference",
            roomId: roomId || "",
            roomName: room?.roomName || "",
          },
        },
      })
    );
    toast.success("Opening Whiteboard");
  };

  const handleRequestSummary = () => {
    osBus.emit("video_conference:request_summary", {
      roomId: roomId || "",
      roomName: room?.roomName,
      requestSummary: true,
      syncActions: true,
      source: "VideoConferencePanel",
    });
    toast.success(
      "Summary requested. Echo can sync action items to Phase 13 / BEO."
    );
  };

  const handleSaveForTraining = async () => {
    if (!roomId) {
      toast.error("No room");
      return;
    }
    try {
      const r = await fetch(
        "/api/video-conference/recordings/save-for-training",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            label: room?.roomName || "Training",
            venueId: room?.venueId,
          }),
        }
      );
      if (r.ok) {
        toast.success(
          "Saved for training (last 2 min can be linked when recording is available)."
        );
      } else toast.error("Failed to save for training");
    } catch (_) {
      toast.error("Failed to save for training");
    }
  };

  const handleCloseClick = () => {
    if (isOrganizer && onClose) {
      setShowFeedbackModal(true);
    } else if (onClose) {
      onClose();
    }
  };
  const handleFeedbackSubmit = async () => {
    if (!roomId || !onClose) return;
    setFeedbackSubmitting(true);
    try {
      await fetch("/api/video-conference/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          qualityRating: feedbackQuality !== "" ? feedbackQuality : undefined,
          issuesText: feedbackIssues.trim() || undefined,
          comment: feedbackComment.trim() || undefined,
        }),
      });
      toast.success("Feedback sent. Thank you.");
    } catch (_) {
      toast.error("Failed to send feedback");
    } finally {
      setFeedbackSubmitting(false);
      setShowFeedbackModal(false);
      onClose();
    }
  };
  const handleFeedbackSkip = () => {
    setShowFeedbackModal(false);
    onClose?.();
  };

  if (roomId && dailyToken && !preJoinComplete) {
    return (
      <div className="flex flex-col w-full h-full min-h-0 bg-background border border-border/30 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-background/50">
          <h3 className="font-semibold text-foreground">Join meeting</h3>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <p className="text-sm text-foreground/80 text-center">
            Check your camera and microphone. Choose how to join.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
            <Button
              className="flex-1"
              onClick={() => {
                preJoinOptionsRef.current = { startVideoOff: false, startAudioOff: false };
                setPreJoinComplete(true);
              }}
            >
              Join with video
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                preJoinOptionsRef.current = { startVideoOff: true, startAudioOff: false };
                setPreJoinComplete(true);
              }}
            >
              Join with audio only
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                preJoinOptionsRef.current = { startVideoOff: true, startAudioOff: true };
                setPreJoinComplete(true);
              }}
            >
              Join without media
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col w-full h-full min-h-0 bg-background border border-border/30 rounded-lg overflow-hidden",
        isEmbedded && "shadow-lg",
      )}
      style={maxWidth && !isEmbedded ? { maxWidth } : undefined}
    >
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-background/50">
        {" "}
        <div className="flex items-center gap-2">
          {" "}
          <span className="text-lg">📹</span>{" "}
          <h3 className="font-semibold text-foreground">
            {" "}
            {room?.roomName || "Video Conference"}{" "}
          </h3>{" "}
          {isRecording && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-600 text-xs font-medium">
              {" "}
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />{" "}
              Recording{" "}
            </div>
          )}{" "}
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          {!isEmbedded && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleFullScreen}
              title={isFullScreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {" "}
              {isFullScreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}{" "}
            </Button>
          )}{" "}
          {onClose && (
            <Button size="sm" variant="ghost" onClick={handleCloseClick}>
              {" "}
              <X className="w-4 h-4" />{" "}
            </Button>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* Hospitality context strip – table/board/service when present */}{" "}
      {(room?.tableId ||
        room?.servicePeriodId ||
        room?.boardId ||
        (room?.metadata &&
          (room.metadata.table_label ||
            room.metadata.guest_count != null))) && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border-b border-border/30 text-sm text-foreground/80 flex-wrap">
          {" "}
          {room.metadata?.table_label && (
            <span className="font-medium">{room.metadata.table_label}</span>
          )}{" "}
          {room.metadata?.guest_count != null && (
            <span>{room.metadata.guest_count} guests</span>
          )}{" "}
          {room?.tableId && !room.metadata?.table_label && (
            <span>Table: {room.tableId}</span>
          )}{" "}
          {room?.servicePeriodId && (
            <span>
              Service:{" "}
              {room.metadata?.service_period_label ?? room.servicePeriodId}
            </span>
          )}{" "}
          {room?.boardId && (
            <span>Board: {room.metadata?.board_label ?? room.boardId}</span>
          )}{" "}
        </div>
      )}{" "}
      {/* Error State */}{" "}
      {error && (
        <div className="p-4 bg-red-500/10 border-b border-red-500/30 text-red-600 text-sm">
          {" "}
          {error}{" "}
        </div>
      )}{" "}
      <div className="flex flex-1 min-h-0 min-w-0">
        <div className="flex-1 min-w-0 flex flex-col">
      {/* Main Video Area */}
      <div
        className="flex-1 min-h-0 bg-black relative overflow-hidden"
        style={{ minHeight: "400px" }}
      >
        {" "}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
            {" "}
            <div className="text-center space-y-4">
              {" "}
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />{" "}
              <p className="text-white/80">Connecting to conference...</p>{" "}
            </div>{" "}
          </div>
        )}{" "}
        <div
          ref={dailyContainerRef}
          className="w-full h-full"
          style={{
            display: useDailySdk ? "block" : "none",
            minHeight: "400px",
          }}
        />
        <iframe
          ref={iframeRef}
          allow="camera; microphone; display-capture"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: useDailySdk ? "none" : "block",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />{" "}
        {captionsEnabled && (
          <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 p-2 bg-black/80 text-white text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/70 text-xs">Display in your language:</span>
              <select
                value={captionLanguage}
                onChange={(e) => {
                  const v = e.target.value;
                  setCaptionLanguage(v);
                  if (typeof localStorage !== "undefined")
                    localStorage.setItem("video-caption-language", v);
                }}
                className="rounded bg-white/10 text-white text-xs px-2 py-1 border border-white/20"
                aria-label="Caption language"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
              <button
                type="button"
                onClick={() => setCaptionsEnabled(false)}
                className="text-white/70 hover:text-white text-xs"
                aria-label="Hide captions"
              >
                Hide captions
              </button>
            </div>
            <p className="min-h-[1.5em] text-center">
              {displayedCaptionText || (captionLanguage !== "en" ? "Translated captions will appear here." : "Captions will appear here when available.")}
            </p>
          </div>
        )}{" "}
        {!captionsEnabled && (
          <button
            type="button"
            onClick={() => setCaptionsEnabled(true)}
            className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 text-white text-xs hover:bg-black/80"
          >
            {" "}
            Show captions{" "}
          </button>
        )}{" "}
      </div>{" "}
      {/* Controls Bar – grouped: media | participants/transcript | share/record | settings | more */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-background/50 border-t border-border/30 flex-wrap">
        {/* Media */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isMuted ? "destructive" : "secondary"}
            onClick={handleToggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant={isVideoOff ? "destructive" : "secondary"}
            onClick={handleToggleVideo}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
            aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </Button>
        </div>
        <div className="h-6 w-px bg-border/30" />
        {/* Participants & Transcript */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSidebarTab((t) => (t === "participants" ? null : "participants"))}
            title="Participants"
            aria-label="Toggle participants"
          >
            <Users className="w-4 h-4" />
            {participants.length > 0 && (
              <span className="ml-1 text-xs font-semibold">{participants.length}</span>
            )}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSidebarTab((t) => (t === "transcript" ? null : "transcript"))}
            title="Transcript"
            aria-label="Toggle transcript"
          >
            <FileText className="w-4 h-4" />
            {transcriptLines.length > 0 && (
              <span className="ml-1 text-xs font-semibold">{transcriptLines.length}</span>
            )}
          </Button>
        </div>
        <div className="h-6 w-px bg-border/30" />
        {/* Share & Record */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleOpenWhiteboard} title="Open Whiteboard">
            <PenLine className="w-4 h-4" />
            <span className="ml-1 hidden sm:inline">Whiteboard</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              if (!guestLink) await handleGenerateGuestLink();
              setSidebarTab((t) => (t === "share" ? null : "share"));
            }}
            title="Share conference"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={isRecording ? "destructive" : "secondary"}
            onClick={handleToggleRecording}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <StopCircle className="w-4 h-4" /> : <Share className="w-4 h-4" />}
          </Button>
        </div>
        <div className="h-6 w-px bg-border/30" />
        <Button
          size="sm"
          variant={viewMode === "speaker" ? "secondary" : "ghost"}
          onClick={() => setViewMode((v) => (v === "gallery" ? "speaker" : "gallery"))}
          title={viewMode === "gallery" ? "Switch to speaker view" : "Switch to gallery view"}
          aria-label={viewMode === "gallery" ? "Speaker view" : "Gallery view"}
        >
          {viewMode === "gallery" ? <LayoutGrid className="w-4 h-4" /> : <User className="w-4 h-4" />}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowMeetingInfo(true)}
          title="Meeting info"
          aria-label="Meeting info"
        >
          <Info className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setSidebarTab((t) => (t === "chat" ? null : "chat"))}
          title="Chat"
          aria-label="Toggle chat"
        >
          <Send className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowSettings(!showSettings)}
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
        <div className="relative" ref={moreMenuRef}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            title="More actions"
            aria-label="More actions"
            aria-expanded={showMoreMenu}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          {showMoreMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden
                onClick={() => setShowMoreMenu(false)}
              />
              <div
                className="absolute bottom-full left-0 mb-1 z-50 min-w-[180px] rounded-md border border-border/30 bg-background py-1 shadow-lg"
                role="menu"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start rounded-none"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleRequestSummary();
                  }}
                  title="End call and request summary; sync to Phase 13 / BEO"
                >
                  Summarize
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start rounded-none"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleSaveForTraining();
                  }}
                  title="Save for training (default English captions on replay)"
                >
                  Save for training
                </Button>
              </div>
            </>
          )}
        </div>
        {wakeLockActive && (
          <span className="text-xs text-foreground/50 ml-2" title="Screen wake lock active">
            Keeping session awake
          </span>
        )}
      </div>
        </div>
        {sidebarOpen && (
          <aside
            className="w-[300px] flex-shrink-0 border-l border-border/30 bg-background/80 flex flex-col min-h-0 relative"
            aria-label="Meeting sidebar"
          >
            <div className="flex border-b border-border/30 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSidebarTab("participants")}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-medium",
                  sidebarTab === "participants"
                    ? "bg-background text-foreground border-b-2 border-primary"
                    : "text-foreground/60 hover:text-foreground"
                )}
              >
                Participants
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("transcript")}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-medium",
                  sidebarTab === "transcript"
                    ? "bg-background text-foreground border-b-2 border-primary"
                    : "text-foreground/60 hover:text-foreground"
                )}
              >
                Transcript
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("share")}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-medium",
                  sidebarTab === "share"
                    ? "bg-background text-foreground border-b-2 border-primary"
                    : "text-foreground/60 hover:text-foreground"
                )}
              >
                Share
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("chat")}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-medium",
                  sidebarTab === "chat"
                    ? "bg-background text-foreground border-b-2 border-primary"
                    : "text-foreground/60 hover:text-foreground"
                )}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab(null)}
                className="p-2 text-foreground/60 hover:text-foreground flex-shrink-0"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3">
              {sidebarTab === "participants" && (
                <div className="space-y-2">
                  {pendingRequests.length > 0 && (
                    <div className="space-y-2 mb-3">
                      <p className="text-xs font-semibold text-foreground/60 uppercase">Waiting room</p>
                      <div className="space-y-1">
                        {pendingRequests.map((req) => (
                          <div key={req.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm bg-amber-500/10">
                            <span className="text-foreground/80 truncate">
                              {req.guest_name}
                              {req.guest_email ? ` (${req.guest_email})` : ""}
                            </span>
                            <Button size="sm" onClick={() => handleApproveRequest(req.id)}>Approve</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs font-semibold text-foreground/60 uppercase">Participants</p>
                  <div className="space-y-1">
                    {participants.length === 0 ? (
                      <p className="text-foreground/50 text-sm">No participants yet</p>
                    ) : (
                      participants.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 px-2 py-1 rounded text-sm bg-background/50">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>{p.guestName || "Guest"}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {sidebarTab === "transcript" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-foreground/60 uppercase">Transcript</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const blob = new Blob(
                          [transcriptLines.map((line, i) => `${i + 1}. ${line}`).join("\n\n")],
                          { type: "text/plain" }
                        );
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `transcript-${room?.roomName ?? "meeting"}-${new Date().toISOString().slice(0, 10)}.txt`;
                        a.click();
                        URL.revokeObjectURL(a.href);
                        toast.success("Transcript downloaded");
                      }}
                      disabled={transcriptLines.length === 0}
                    >
                      Download
                    </Button>
                  </div>
                  <div className="space-y-1 text-sm text-foreground/90">
                    {transcriptLines.length === 0 ? (
                      <p className="text-foreground/50 italic">Transcript will appear here as captions are received.</p>
                    ) : (
                      transcriptLines.map((line, i) => (
                        <p key={i} className="border-l-2 border-primary/30 pl-2 py-0.5">{line}</p>
                      ))
                    )}
                  </div>
                </div>
              )}
              {sidebarTab === "share" && (
                <div className="space-y-3">
                  {guestLink ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Share Link</span>
                        <button onClick={() => setGuestLink(null)} className="text-foreground/60 hover:text-foreground" aria-label="Close share">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-background rounded border border-border/30 text-xs font-mono text-foreground/70 overflow-hidden">
                          <span className="truncate">{guestLink}</span>
                        </div>
                        <Button size="sm" onClick={handleCopyLink}>{copiedToClipboard ? "Copied" : "Copy"}</Button>
                      </div>
                      <div className="flex gap-2 flex-wrap text-xs">
                        <a href={guestLinkService.generateShareLinks(guestLink, room?.roomName || "Conference").email} className="px-2 py-1 rounded bg-background border border-border/30 text-foreground/70 hover:text-foreground">📧 Email</a>
                        <a href={guestLinkService.generateShareLinks(guestLink, room?.roomName || "Conference").whatsapp} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-background border border-border/30 text-foreground/70 hover:text-foreground">💬 WhatsApp</a>
                        <a href={guestLinkService.generateShareLinks(guestLink, room?.roomName || "Conference").telegram} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-background border border-border/30 text-foreground/70 hover:text-foreground">✈️ Telegram</a>
                      </div>
                      <div className="pt-2 border-t border-border/30 space-y-2">
                        <p className="text-xs font-medium text-foreground/80">Invite via cloud (email or SMS)</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <input type="email" placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="h-8 px-2 rounded border border-border/30 bg-background text-foreground text-xs w-40" />
                          <Button size="sm" variant="secondary" disabled={inviteSending !== null} onClick={handleSendInviteByEmail}>{inviteSending === "email" ? "Sending…" : "Send (email)"}</Button>
                          <input type="tel" placeholder="Phone" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} className="h-8 px-2 rounded border border-border/30 bg-background text-foreground text-xs w-36" />
                          <Button size="sm" variant="secondary" disabled={inviteSending !== null} onClick={handleSendInviteBySms}>{inviteSending === "sms" ? "Sending…" : "Send (SMS)"}</Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-foreground/80">Generate a link to share this conference.</p>
                      <Button size="sm" onClick={handleGenerateGuestLink}>Generate share link</Button>
                    </div>
                  )}
                </div>
              )}
              {sidebarTab === "chat" && (
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mb-2">
                    {chatMessages.length === 0 ? (
                      <p className="text-foreground/50 text-sm italic">No messages yet. Say hello!</p>
                    ) : (
                      chatMessages.map((msg) => (
                        <div key={msg.id} className="text-sm">
                          <span className="font-medium text-foreground/80">{msg.sender}</span>
                          <span className="text-foreground/50 text-xs ml-2">
                            {new Date(msg.time).toLocaleTimeString()}
                          </span>
                          <p className="text-foreground/90 mt-0.5">{msg.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <form
                    className="flex gap-2 flex-shrink-0"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const text = chatInput.trim();
                      if (!text) return;
                      setChatMessages((prev) => [
                        ...prev,
                        {
                          id: `chat-${Date.now()}`,
                          text,
                          sender: "You",
                          time: Date.now(),
                        },
                      ]);
                      setChatInput("");
                    }}
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded border border-border/30 bg-background px-2 py-1.5 text-sm text-foreground"
                      aria-label="Chat message"
                    />
                    <Button type="submit" size="sm">Send</Button>
                  </form>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
      {/* Settings Panel */}{" "}
      {showSettings && (
        <div className="px-4 py-3 bg-background/50 border-t border-border/30 space-y-3 text-sm">
          {" "}
          <div>
            {" "}
            <label className="text-xs font-semibold text-foreground/60 uppercase block mb-2">
              {" "}
              Room Settings{" "}
            </label>{" "}
            <div className="space-y-2 text-foreground/70">
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <span>Recording allowed</span>{" "}
                <span
                  className={
                    room?.allowRecording ? "text-green-600" : "text-red-600"
                  }
                >
                  {" "}
                  {room?.allowRecording ? "Yes" : "No"}{" "}
                </span>{" "}
              </div>{" "}
              <div className="flex items-center justify-between">
                {" "}
                <span>Screen share allowed</span>{" "}
                <span
                  className={
                    room?.allowScreenShare ? "text-green-600" : "text-red-600"
                  }
                >
                  {" "}
                  {room?.allowScreenShare ? "Yes" : "No"}{" "}
                </span>{" "}
              </div>{" "}
              <div className="flex items-center justify-between">
                {" "}
                <span>Chat allowed</span>{" "}
                <span
                  className={
                    room?.allowChat ? "text-green-600" : "text-red-600"
                  }
                >
                  {" "}
                  {room?.allowChat ? "Yes" : "No"}{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}
      {/* Meeting info modal */}
      {showMeetingInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="meeting-info-title">
          <div className="bg-background border border-border/30 rounded-lg shadow-xl max-w-md w-full p-4 space-y-4">
            <h3 id="meeting-info-title" className="font-semibold text-foreground">Meeting info</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-foreground/60">Room</span>
                <p className="font-medium text-foreground">{room?.roomName || "Video Conference"}</p>
              </div>
              {guestLink ? (
                <div className="flex gap-2 items-center">
                  <div className="flex-1 truncate rounded border border-border/30 bg-background/50 px-2 py-1.5 text-xs font-mono text-foreground/80">
                    {guestLink}
                  </div>
                  <Button size="sm" onClick={handleCopyLink}>{copiedToClipboard ? "Copied" : "Copy link"}</Button>
                </div>
              ) : (
                <Button size="sm" onClick={handleGenerateGuestLink}>Generate share link</Button>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowMeetingInfo(false);
                    if (!guestLink) handleGenerateGuestLink().then(() => setSidebarTab("share"));
                    else setSidebarTab("share");
                  }}
                >
                  Invite by email / SMS
                </Button>
                <a
                  href={guestLink ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(room?.roomName || "Meeting")}&details=${encodeURIComponent(`Join: ${guestLink}`)}` : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={guestLink ? "inline-flex" : "hidden"}
                >
                  <Button size="sm" variant="outline" type="button">Add to calendar</Button>
                </a>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowMeetingInfo(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
      {/* Post-meeting feedback modal (organizer only) */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border/30 rounded-lg shadow-xl max-w-md w-full p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Quick feedback</h3>
            <p className="text-sm text-foreground/70">
              How was the meeting quality? Any issues we should know about?
            </p>
            <div>
              <label className="text-xs font-medium text-foreground/80 block mb-1">
                Quality (1–5)
              </label>
              <select
                value={feedbackQuality}
                onChange={(e) =>
                  setFeedbackQuality(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="w-full rounded border border-border/30 bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Skip</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/80 block mb-1">
                Issues (optional)
              </label>
              <textarea
                value={feedbackIssues}
                onChange={(e) => setFeedbackIssues(e.target.value)}
                placeholder="e.g. audio lag, dropouts"
                className="w-full rounded border border-border/30 bg-background px-3 py-2 text-sm text-foreground min-h-[60px]"
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/80 block mb-1">
                Comment (optional)
              </label>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Anything else?"
                className="w-full rounded border border-border/30 bg-background px-3 py-2 text-sm text-foreground min-h-[50px]"
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleFeedbackSkip}
                disabled={feedbackSubmitting}
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={handleFeedbackSubmit}
                disabled={feedbackSubmitting}
              >
                {feedbackSubmitting ? "Sending…" : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default VideoConferencePanel;
