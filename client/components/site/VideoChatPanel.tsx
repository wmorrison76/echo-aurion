import { useState, useEffect, useRef } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  Share2,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";

interface VideoChatPanelProps {
  isActive: boolean;
  participantIds: string[];
  participantNames: Record<string, string>;
  onEnd: () => void;
  isMuted?: boolean;
  isVideoOn?: boolean;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
}

export default function VideoChatPanel({
  isActive,
  participantIds,
  participantNames,
  onEnd,
  isMuted = false,
  isVideoOn = true,
  onToggleMute,
  onToggleVideo,
}: VideoChatPanelProps) {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isActive) return;

    let stream: MediaStream | null = null;

    // Initialize local video stream
    const initializeVideo = async () => {
      try {
        // Request both audio and video
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: isVideoOn
            ? {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                facingMode: "user",
              }
            : false,
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Apply mute setting
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !isMuted;
        });

        if (localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.onloadedmetadata = () => {
            localVideoRef.current?.play().catch((err) => {
              console.warn("Video autoplay failed (browser policy):", err);
            });
          };
        }
      } catch (error: unknown) {
        const err = error as DOMException | Error;
        if (err.name === "NotAllowedError") {
          console.error("Camera/microphone permission denied");
        } else if (err.name === "NotFoundError") {
          console.error("No camera/microphone found");
        } else {
          console.error("Failed to access camera/microphone:", err);
        }
      }
    };

    // Delay slightly to ensure proper initialization
    const timeoutId = setTimeout(initializeVideo, 100);

    return () => {
      clearTimeout(timeoutId);
      // Stop local stream on cleanup
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };
  }, [isActive, isMuted, isVideoOn]);

  // Handle audio track muting separately
  useEffect(() => {
    if (!localVideoRef.current || !localVideoRef.current.srcObject) return;

    const stream = localVideoRef.current.srcObject as MediaStream;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }, [isMuted]);

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: false,
        });

        setIsScreenSharing(true);

        // Handle when user stops sharing
        screenStream.getTracks()[0].addEventListener("ended", () => {
          setIsScreenSharing(false);
        });
      } else {
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error("Failed to share screen:", error);
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-slate-900 rounded-lg overflow-hidden w-full h-full max-w-4xl max-h-96 flex flex-col">
        {/* Video Header */}
        <div className="bg-slate-800/80 px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
          <div>
            <h3 className="font-semibold text-white">Video Call</h3>
            <p className="text-xs text-slate-400">
              {participantIds.length} participant{participantIds.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onEnd}
            className="h-6 w-6 p-0 hover:bg-red-600/20"
          >
            <X size={18} className="text-red-400" />
          </Button>
        </div>

        {/* Video Grid */}
        <div className="flex-1 bg-black grid grid-cols-2 gap-1 p-1 overflow-auto">
          {/* Local Video */}
          <div className="relative bg-slate-800 rounded overflow-hidden">
            {isVideoOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-700">
                <VideoOff size={32} className="text-slate-500" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
              You
            </div>
          </div>

          {/* Remote Videos */}
          {participantIds.map((id) => (
            <div key={id} className="relative bg-slate-800 rounded overflow-hidden">
              <div className="w-full h-full flex items-center justify-center bg-slate-700">
                <div className="text-center">
                  <Video size={32} className="text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">
                    {participantNames[id] || `User ${id.slice(0, 4)}`}
                  </p>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                {participantNames[id] || "Guest"}
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-slate-800/80 px-4 py-3 flex items-center justify-center gap-3 border-t border-slate-700/50">
          <Button
            onClick={onToggleVideo}
            className={cn(
              "h-10 w-10 p-0 rounded-full transition-colors",
              isVideoOn
                ? "bg-blue-600/40 hover:bg-blue-600/60"
                : "bg-red-600/40 hover:bg-red-600/60"
            )}
            title={isVideoOn ? "Turn off video" : "Turn on video"}
          >
            {isVideoOn ? (
              <Video size={20} className="text-white" />
            ) : (
              <VideoOff size={20} className="text-white" />
            )}
          </Button>

          <Button
            onClick={onToggleMute}
            className={cn(
              "h-10 w-10 p-0 rounded-full transition-colors",
              isMuted
                ? "bg-red-600/40 hover:bg-red-600/60"
                : "bg-blue-600/40 hover:bg-blue-600/60"
            )}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff size={20} className="text-white" />
            ) : (
              <Mic size={20} className="text-white" />
            )}
          </Button>

          <Button
            onClick={handleScreenShare}
            className={cn(
              "h-10 w-10 p-0 rounded-full transition-colors",
              isScreenSharing
                ? "bg-green-600/40 hover:bg-green-600/60"
                : "bg-slate-700/40 hover:bg-slate-700/60"
            )}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
          >
            <Share2 size={20} className="text-white" />
          </Button>

          <div className="w-px h-6 bg-slate-600/50" />

          <Button
            onClick={onEnd}
            className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-medium"
          >
            <Phone size={18} className="mr-2" />
            End Call
          </Button>
        </div>

        {/* Info Text */}
        <div className="text-center py-2 text-xs text-slate-500 bg-slate-900/50">
          {isScreenSharing ? "Sharing your screen" : "Camera and microphone active"}
        </div>
      </div>
    </div>
  );
}
