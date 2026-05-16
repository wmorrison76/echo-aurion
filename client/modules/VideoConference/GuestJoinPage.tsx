import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { guestLinkService } from "@/lib/services/GuestLinkService";
import VideoConferencePanel from "./VideoConferencePanel";
import { cn } from "@/lib/glass";
interface GuestJoinPageProps {
  linkId: string;
}
export interface GuestJoinBranding {
  logoUrl?: string;
  brandName?: string;
  primaryColor?: string;
}
interface LinkValidation {
  valid: boolean;
  reason?: string;
  room?: {
    id: string;
    roomName: string;
    dailyRoomName: string;
    roomDescription?: string;
    allowRecording: boolean;
    allowScreenShare: boolean;
    allowChat: boolean;
    metadata?: { branding?: GuestJoinBranding };
  };
  requiresPassword?: boolean;
  expiresAt?: number;
  branding?: GuestJoinBranding;
  waitingRoom?: boolean;
}
const GuestJoinPage: React.FC<GuestJoinPageProps> = ({ linkId }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [validation, setValidation] = useState<LinkValidation | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [dailyToken, setDailyToken] = useState<string | null>(null);
  const [waitingRequestId, setWaitingRequestId] = useState<string | null>(null);
  useEffect(() => {
    validateLink();
  }, [linkId]);
  useEffect(() => {
    if (!waitingRequestId) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(
          `/api/video-conference/join-requests/status/${waitingRequestId}`,
        );
        const data = await r.json();
        if (data.status === "approved" && data.token) {
          setDailyToken(data.token);
          setHasJoined(true);
          setWaitingRequestId(null);
          toast.success("You're in!");
        }
      } catch (_) {}
    }, 2000);
    return () => clearInterval(t);
  }, [waitingRequestId]);
  const validateLink = async () => {
    try {
      setIsValidating(true);
      const result = await guestLinkService.validateGuestLink(linkId);
      setValidation(result);
      if (!result.valid) {
        toast.error(result.reason || "Invalid or expired link");
      }
    } catch (err) {
      toast.error("Failed to validate link");
      setValidation({
        valid: false,
        reason: "Failed to validate link. Please try again.",
      });
    } finally {
      setIsValidating(false);
    }
  };
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!guestEmail.trim() || !guestEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (validation?.requiresPassword && !password) {
      toast.error(
        "This conference is password protected. Please enter the password.",
      );
      return;
    }
    try {
      setIsJoining(true);
      const response = await fetch("/api/video-conference/join", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId,
          guestName,
          guestEmail,
          password: validation?.requiresPassword ? password : undefined,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to join conference");
      }
      const data = await response.json();
      if (data.status === "waiting" && data.requestId) {
        setWaitingRequestId(data.requestId);
        toast.info("Waiting for host to let you in.");
        return;
      }
      setDailyToken(data.token);
      setHasJoined(true);
      toast.success("Joined successfully!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join conference";
      toast.error(message);
    } finally {
      setIsJoining(false);
    }
  }; // Show conference once joined if (hasJoined && dailyToken && validation?.room) { return ( <div className="w-full h-screen bg-background flex items-center justify-center p-4"> <VideoConferencePanel roomId={validation.room.id} room={ { id: validation.room.id, roomName: validation.room.roomName, dailyRoomName: validation.room.dailyRoomName, roomDescription: validation.room.roomDescription, allowRecording: validation.room.allowRecording, allowScreenShare: validation.room.allowScreenShare, allowChat: validation.room.allowChat, } as any } dailyToken={dailyToken} isEmbedded={false} maxWidth="100%" /> </div> ); } // Loading state if (isValidating) { return ( <div className="w-full min-h-screen bg-background flex items-center justify-center p-4"> <div className="text-center space-y-4"> <Loader className="w-12 h-12 animate-spin mx-auto text-primary" /> <p className="text-foreground/80">Validating conference link...</p> </div> </div> ); } // Invalid link state if (!validation?.valid) { return ( <div className="w-full min-h-screen bg-background flex items-center justify-center p-4"> <Card className="w-full max-w-md"> <CardHeader> <CardTitle>Invalid Conference Link</CardTitle> </CardHeader> <CardContent className="space-y-4"> <div className="p-4 bg-red-500/10 border border-red-500/30 rounded text-red-600 text-sm"> {validation?.reason ||"The conference link is invalid or has expired."} </div> <p className="text-foreground/70 text-sm"> Please ask the organizer to send you a new link. </p> </CardContent> </Card> </div> ); } if (waitingRequestId) { return ( <div className="w-full min-h-screen bg-background flex items-center justify-center p-4"> <Card className="w-full max-w-md"> <CardContent className="pt-6 text-center space-y-4"> <Loader className="w-12 h-12 animate-spin mx-auto text-primary" /> <p className="text-foreground/80">Waiting for host to let you in...</p> <p className="text-xs text-foreground/50">You will join automatically when approved.</p> </CardContent> </Card> </div> ); } // Branding from validation (room.metadata.branding or top-level branding)
  const branding = validation?.room?.metadata?.branding ?? validation?.branding;
  const primaryColor = branding?.primaryColor || "rgb(59, 130, 246)";

  // Join form return ( <div className="w-full min-h-screen bg-background flex items-center justify-center p-4" style={branding?.primaryColor ? { ["--brand" as string]: primaryColor } : undefined}> <Card className="w-full max-w-md"> <CardHeader className="space-y-2"> <div className="flex items-center gap-2"> {branding?.logoUrl ? ( <img src={branding.logoUrl} alt={branding.brandName || "Logo"} className="w-12 h-12 object-contain rounded" /> ) : ( <span className="text-2xl">📹</span> )} <div> <CardTitle>{branding?.brandName ? `${branding.brandName} – Join` : "Join Conference"}</CardTitle> <p className="text-sm text-foreground/60 mt-1"> {validation?.room?.roomName || "Video Conference"} </p> </div> </div> {validation?.room?.roomDescription && ( <p className="text-sm text-foreground/70"> {validation.room.roomDescription} </p> )} </CardHeader> <CardContent> <form onSubmit={handleJoin} className="space-y-4"> {/* Room Details */} <div className="p-3 bg-background border border-border/30 rounded space-y-2 text-sm"> <div className="flex items-center justify-between"> <span className="text-foreground/60">Recording</span> <span className={ validation?.room?.allowRecording ?"text-green-600" :"text-red-600" } > {validation?.room?.allowRecording ?"Enabled" :"Disabled"} </span> </div> <div className="flex items-center justify-between"> <span className="text-foreground/60">Screen Share</span> <span className={ validation?.room?.allowScreenShare ?"text-green-600" :"text-red-600" } > {validation?.room?.allowScreenShare ?"Enabled" :"Disabled"} </span> </div> <div className="flex items-center justify-between"> <span className="text-foreground/60">Chat</span> <span className={ validation?.room?.allowChat ?"text-green-600" :"text-red-600" } > {validation?.room?.allowChat ?"Enabled" :"Disabled"} </span> </div> </div> {/* Guest Name */} <div className="space-y-1"> <label className="text-sm font-medium text-foreground"> Your Name </label> <Input type="text" placeholder="Enter your name" value={guestName} onChange={(e) => setGuestName(e.target.value)} disabled={isJoining} className="bg-background border-border/30" /> </div> {/* Guest Email */} <div className="space-y-1"> <label className="text-sm font-medium text-foreground"> Email Address </label> <Input type="email" placeholder="your@email.com" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} disabled={isJoining} className="bg-background border-border/30" /> </div> {/* Password (if required) */} {validation?.requiresPassword && ( <div className="space-y-1"> <label className="text-sm font-medium text-foreground"> Conference Password </label> <Input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isJoining} className="bg-background border-border/30" /> </div> )} {/* Expiration Notice */} {validation?.expiresAt && ( <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-700"> This link expires on{""} {new Date(validation.expiresAt).toLocaleString()} </div> )} {/* Browser Permissions Notice */} <div className="p-3 bg-primary/10 border border-blue-500/30 rounded text-xs text-blue-700"> Your browser will ask for permission to access your camera and microphone. Please allow access when prompted. </div> {/* Join Button */} <Button type="submit" disabled={isJoining || !guestName.trim() || !guestEmail.trim()} className="w-full" > {isJoining ? ( <> <Loader className="w-4 h-4 mr-2 animate-spin" /> Joining... </> ) : ("Join Conference" )} </Button> {/* Privacy Notice */} <p className="text-xs text-foreground/50 text-center"> By joining, you agree to be recorded and have your information stored for the duration of the conference. </p> </form> </CardContent> </Card> </div> );
};
export default GuestJoinPage;
