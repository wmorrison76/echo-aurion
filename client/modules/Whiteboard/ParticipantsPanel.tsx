import React, { useState, useEffect, useRef } from "react";
import { ParticipantInfo, WhiteboardMessage } from "./types";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Send,
  User,
  Users,
  MessageSquare,
  Settings,
  Copy,
  LogOut,
  Zap,
  Heart,
  ThumbsUp,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/glass";
import { v4 as uuidv4 } from "uuid";
interface ParticipantsPanelProps {
  participants: ParticipantInfo[];
  currentUserId: string;
  currentUserName: string;
  sessionId: string;
  onMessage?: (message: WhiteboardMessage) => void;
  onMicToggle?: (enabled: boolean) => void;
  onVideoToggle?: (enabled: boolean) => void;
  onEndCall?: () => void;
  jitsiContainerId?: string;
  isPresenter?: boolean;
}
const PROFESSIONAL_EMOJIS = [
  { emoji: "👍", label: "Thumbs Up" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "🎉", label: "Celebration" },
  { emoji: "✅", label: "Check" },
  { emoji: "💡", label: "Idea" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "⭐", label: "Star" },
  { emoji: "🎯", label: "Target" },
  { emoji: "📈", label: "Growth" },
  { emoji: "💯", label: "Perfect" },
  { emoji: "🚀", label: "Rocket" },
  { emoji: "✨", label: "Sparkle" },
];
export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  participants,
  currentUserId,
  currentUserName,
  sessionId,
  onMessage,
  onMicToggle,
  onVideoToggle,
  onEndCall,
  jitsiContainerId = "jitsi-container",
  isPresenter = false,
}) => {
  const [messages, setMessages] = useState<WhiteboardMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(
    null,
  );
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // Auto-scroll messages useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]); const handleSendMessage = () => { if (!messageInput.trim()) return; const message: WhiteboardMessage = { id: uuidv4(), sessionId, userId: currentUserId, userName: currentUserName, text: messageInput, isPrivate: selectedRecipient !== null, recipientId: selectedRecipient || undefined, timestamp: Date.now(), }; setMessages((prev) => [...prev, message]); setMessageInput(""); onMessage?.(message); }; const handleMicToggle = () => { const newState = !micEnabled; setMicEnabled(newState); onMicToggle?.(newState); }; const handleVideoToggle = () => { const newState = !videoEnabled; setVideoEnabled(newState); onVideoToggle?.(newState); }; const addEmojiReaction = (emoji: string) => { const message: WhiteboardMessage = { id: uuidv4(), sessionId, userId: currentUserId, userName: currentUserName, text: emoji, emoji, isPrivate: false, timestamp: Date.now(), }; setMessages((prev) => [...prev, message]); onMessage?.(message); setShowEmojiPicker(false); }; const visibleMessages = messages.filter((msg) => { if (msg.isPrivate) { return ( (msg.userId === currentUserId && msg.recipientId === selectedRecipient) || (msg.userId === selectedRecipient && msg.recipientId === currentUserId) ); } return !selectedRecipient; }); const activeSpeakers = participants.filter((p) => p.isActive); return ( <div className="flex flex-col h-full bg-background/95 border-l border-border/30"> {/* Header */} <div className="border-b border-border/30 p-3 space-y-2"> <div className="flex items-center justify-between"> <h3 className="font-semibold text-sm text-foreground flex items-center gap-2"> <Users size={16} /> {participants.length} Participants </h3> <Button variant="ghost" size="sm" onClick={onEndCall} className="text-destructive hover:bg-destructive/10 hover:text-destructive" > <PhoneOff size={16} /> </Button> </div> {/* Call Controls */} <div className="flex gap-1 justify-between"> <Button onClick={handleMicToggle} variant={micEnabled ?"default" :"destructive"} size="sm" className="flex-1 text-xs" > {micEnabled ? ( <> <Mic size={14} /> Mic </> ) : ( <> <MicOff size={14} /> Muted </> )} </Button> <Button onClick={handleVideoToggle} variant={videoEnabled ?"default" :"destructive"} size="sm" className="flex-1 text-xs" > {videoEnabled ? ( <> <Video size={14} /> Camera </> ) : ( <> <VideoOff size={14} /> Off </> )} </Button> </div> </div> {/* Participants List */} <div className="flex-1 overflow-y-auto space-y-1 p-2 min-h-0"> <p className="text-xs text-foreground/60 font-medium px-2">On the call</p> {participants.map((participant) => ( <div key={participant.userId} onClick={() => setSelectedRecipient( selectedRecipient === participant.userId ? null : participant.userId ) } className={cn("p-2 rounded cursor-pointer transition-all text-xs flex items-center gap-2", selectedRecipient === participant.userId ?"bg-primary/20 text-primary" :"bg-secondary/30 text-foreground/70 hover:bg-secondary/50", !participant.isActive &&"opacity-60" )} > <div className={cn("w-3 h-3 rounded-full flex-shrink-0", participant.isActive ?"bg-green-500" :"bg-muted" )} style={{ backgroundColor: participant.color }} /> <span className="flex-1 truncate"> {participant.userName} {participant.userId === currentUserId &&" (You)"} </span> {isPresenter && participant.userRole !=="organizer" && ( <span className="text-[10px] bg-primary/20 text-primary px-1 rounded"> {participant.userRole} </span> )} </div> ))} </div> {/* Messages Section */} <div className="border-t border-border/30 flex flex-col h-64 min-h-0"> {/* Messages Display */} <div className="flex-1 overflow-y-auto p-2 space-y-1"> {visibleMessages.length === 0 ? ( <div className="flex items-center justify-center h-full text-xs text-foreground/40"> No messages yet </div> ) : ( visibleMessages.map((msg) => ( <div key={msg.id} className={cn("px-2 py-1 rounded text-xs flex gap-1 items-start", msg.emoji ?"bg-secondary/30" : msg.userId === currentUserId ?"bg-primary/20 text-primary" :"bg-secondary/30 text-foreground/70" )} > <span className="font-medium flex-shrink-0 text-[10px]"> {msg.userName}: </span> <span className="flex-1 break-words">{msg.text}</span> </div> )) )} <div ref={messagesEndRef} /> </div> {/* Message Recipient Indicator */} {selectedRecipient && ( <div className="px-2 py-1 text-xs text-foreground/60 border-t border-border/30 bg-secondary/20"> Private to:{""} {participants.find((p) => p.userId === selectedRecipient)?.userName} </div> )} {/* Message Input */} <div className="border-t border-border/30 p-2 space-y-1"> <div className="flex gap-1 mb-1"> <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}> <DropdownMenuTrigger asChild> <Button variant="ghost" size="sm" className="text-xs"> <Smile size={14} /> </Button> </DropdownMenuTrigger> <DropdownMenuContent align="start" className="grid grid-cols-4 gap-1 p-2 w-48"> {PROFESSIONAL_EMOJIS.map((item) => ( <button key={item.emoji} onClick={() => addEmojiReaction(item.emoji)} className="p-1 hover:bg-secondary rounded text-lg" title={item.label} > {item.emoji} </button> ))} </DropdownMenuContent> </DropdownMenu> </div> <div className="flex gap-1"> <Input type="text" placeholder={selectedRecipient ?"Private message..." :"Message..."} value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyPress={(e) => e.key ==="Enter" && handleSendMessage()} className="text-xs h-8" /> <Button onClick={handleSendMessage} size="sm" className="text-xs px-2" disabled={!messageInput.trim()} > <Send size={14} /> </Button> </div> </div> </div> </div> );
};
export default ParticipantsPanel;
