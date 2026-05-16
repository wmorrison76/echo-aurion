/**
 * Video Call Panel Component
 *
 * Native video conferencing with WebRTC
 * All text is i18n-ready with translation keys
 */

import React, { useState, useEffect, useRef } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Users,
  ScreenShare,
  ScreenShareOff,
  Monitor,
  MonitorOff,
  Settings,
  MoreVertical,
  Calendar,
  Clock,
} from "lucide-react";
import { format, addHours } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/glass";

interface VideoCall {
  id: string;
  title: string;
  titleKey?: string;
  participants: Array<{
    id: string;
    name: string;
    video: boolean;
    audio: boolean;
    isSelf: boolean;
  }>;
  startTime: string;
  status: "scheduled" | "active" | "ended" | "cancelled";
  recording?: boolean;
}

export default function VideoCallPanel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [activeCall, setActiveCall] = useState<VideoCall | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [scheduledCalls, setScheduledCalls] = useState<VideoCall[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    loadScheduledCalls();
  }, []);

  const loadScheduledCalls = async () => {
    try {
      // In production, fetch from API
      const mockCalls: VideoCall[] = [
        {
          id: "call-1",
          title: "Team Standup",
          titleKey: "video.call.scheduled.team.standup",
          participants: [
            {
              id: "user-1",
              name: "John Doe",
              video: false,
              audio: true,
              isSelf: false,
            },
            {
              id: "user-2",
              name: "Jane Smith",
              video: true,
              audio: true,
              isSelf: false,
            },
          ],
          startTime: addHours(new Date(), 1).toISOString(),
          status: "scheduled",
        },
      ];
      setScheduledCalls(mockCalls);
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to load scheduled calls",
        variant: "destructive",
      });
    }
  };

  const handleJoinCall = async (callId: string) => {
    try {
      const response = await fetch(
        `/api/collaboration/video-calls/${callId}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const data = await response.json();
      if (data.success) {
        setActiveCall(data.data);
        await startLocalVideo();
        toast({
          title: t("video.call.joined") || "Joined Call",
          description:
            t("video.call.joined.description") ||
            "You have joined the video call",
        });
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to join call",
        variant: "destructive",
      });
    }
  };

  const handleCreateCall = async () => {
    try {
      const title = prompt(t("video.call.title.prompt") || "Enter call title:");
      if (!title) return;

      const response = await fetch("/api/collaboration/video-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          titleKey: "video.call.user.created", // i18n key
          description: t("video.call.description.default") || "Video call",
          startTime: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setActiveCall(data.data);
        await startLocalVideo();
        toast({
          title: t("video.call.created") || "Call Created",
          description:
            t("video.call.created.description") ||
            "Video call has been created",
        });
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to create call",
        variant: "destructive",
      });
    }
  };

  const handleLeaveCall = async () => {
    if (!activeCall) return;

    try {
      await fetch(`/api/collaboration/video-calls/${activeCall.id}/leave`, {
        method: "POST",
      });

      stopLocalVideo();
      setActiveCall(null);
      toast({
        title: t("video.call.left") || "Left Call",
        description:
          t("video.call.left.description") || "You have left the video call",
      });
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to leave call",
        variant: "destructive",
      });
    }
  };

  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoOn,
        audio: isAudioOn,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsVideoOn(true);
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast({
        title: t("video.call.error.device") || "Device Error",
        description:
          t("video.call.error.device.description") ||
          "Failed to access camera/microphone",
        variant: "destructive",
      });
    }
  };

  const stopLocalVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsVideoOn(false);
    }
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !isVideoOn;
      });
    }
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isAudioOn;
      });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsScreenSharing(true);
        }
      } else {
        stopLocalVideo();
        setIsScreenSharing(false);
        await startLocalVideo();
      }
    } catch (error) {
      console.error("Error sharing screen:", error);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {activeCall ? (
        // Active Call View
        <div className="flex-1 flex flex-col">
          {/* Video Grid */}
          <div className="flex-1 grid grid-cols-2 gap-2 p-4 bg-black/50">
            {/* Local Video */}
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {t("video.call.you") || "You"}
              </div>
              {!isVideoOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Users className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {activeCall.participants.map((participant) => (
              <div
                key={participant.id}
                className="relative rounded-lg overflow-hidden bg-muted"
              >
                {participant.video ? (
                  <video
                    ref={(el) => {
                      if (el) remoteVideoRefs.current.set(participant.id, el);
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Users className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {participant.name}
                  {!participant.audio && (
                    <MicOff className="w-4 h-4 ml-1 inline" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="border-t border-border p-4 bg-background">
            <div className="flex items-center justify-center gap-2">
              <Button
                variant={isVideoOn ? "default" : "destructive"}
                size="sm"
                onClick={toggleVideo}
              >
                {isVideoOn ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <VideoOff className="w-4 h-4" />
                )}
                <span className="ml-2">
                  {isVideoOn
                    ? t("video.call.video.off") || "Turn Off"
                    : t("video.call.video.on") || "Turn On"}
                </span>
              </Button>
              <Button
                variant={isAudioOn ? "default" : "destructive"}
                size="sm"
                onClick={toggleAudio}
              >
                {isAudioOn ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
                <span className="ml-2">
                  {isAudioOn
                    ? t("video.call.mute") || "Mute"
                    : t("video.call.unmute") || "Unmute"}
                </span>
              </Button>
              <Button
                variant={isScreenSharing ? "default" : "outline"}
                size="sm"
                onClick={toggleScreenShare}
              >
                {isScreenSharing ? (
                  <ScreenShareOff className="w-4 h-4" />
                ) : (
                  <ScreenShare className="w-4 h-4" />
                )}
                <span className="ml-2">
                  {isScreenSharing
                    ? t("video.call.screen.share.stop") || "Stop Sharing"
                    : t("video.call.screen.share") || "Share Screen"}
                </span>
              </Button>
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4" />
                <span className="ml-2">{activeCall.participants.length}</span>
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={handleLeaveCall}>
                <PhoneOff className="w-4 h-4" />
                <span className="ml-2">{t("video.call.leave") || "Leave"}</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // No Active Call View
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Video className="w-8 h-8 text-primary" />
                {t("video.call.title") || "Video Calls"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("video.call.description") || "Start or join a video call"}
              </p>
            </div>
            <Button onClick={handleCreateCall}>
              <Video className="w-4 h-4 mr-2" />
              {t("video.call.create") || "Create Call"}
            </Button>
          </div>

          {/* Scheduled Calls */}
          {scheduledCalls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {t("video.call.scheduled") || "Scheduled Calls"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduledCalls.map((call) => (
                    <div
                      key={call.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {call.title}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(call.startTime), "PPpp")}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Users className="w-4 h-4" />
                          {call.participants.length}{" "}
                          {t("video.call.participants") || "participants"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{call.status}</Badge>
                        {call.status === "scheduled" && (
                          <Button
                            size="sm"
                            onClick={() => handleJoinCall(call.id)}
                          >
                            {t("video.call.join") || "Join"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
